import { Terraria, Microsoft } from './../ModImports.js';
import { ModLoader } from './../Core/ModLoader.js';
import { ModTexture } from './../ModTexture.js';
import { ModLocalization } from './../ModLocalization.js';
import { GlobalProjectile } from './../GlobalProjectile.js';
import { FusionEntityData } from './../../Core/FusionEntityData.js';

function cloneResizedSetLastItem(array, newSize, value) {
    const resized = array.cloneResized(newSize);
    if (value != null) resized[newSize - 1] = value;
    return resized;
}

function resizeArrayProperty(propertyHolder, propertyName, newSize, value) {
    propertyHolder[propertyName] = cloneResizedSetLastItem(propertyHolder[propertyName], newSize, value);
}

function addToArray(propertyHolder, propertyName, value) {
    const array = propertyHolder[propertyName];
    const arrayLength = array.length;
    propertyHolder[propertyName] = cloneResizedSetLastItem(array, arrayLength + 1, value);
}

export class ProjectileLoader {
    static Projectiles = [];
    static MAX_VANILLA_ID = Terraria.ID.ProjectileID.Count;
    static Count = 0;
    static TypeOffset = 0;
    static ModTypes = new Set();
    static IndexByName = {};
    static TypeToIndex = {};
    static ProjectileCount = this.MAX_VANILLA_ID + this.Count;

    static _globalCallbackCache = {};
    static _globalTypeCallbackCache = {};
    static _globalCallbackCount = -1;

    // Phase 12.74.8: compile the JS dispatch surface once per projectile type.
    // The old loader repeated Set membership tests, type->class lookups,
    // prototype resolution and static-default rebuilding in every AI/draw/spawn.
    static RuntimeByType = [];
    static CompiledSpawnCount = 0;
    static SpawnPerfLogged = false;
    static MobilePerfLogged = false;
    static InheritedEntityDefaults = new Set([
        'whoAmI', 'position', 'velocity', 'oldPosition', 'oldVelocity',
        'oldDirection', 'direction', 'width', 'height', 'wet', 'shimmerWet',
        'honeyWet', 'wetCount', 'lavaWet', 'Center', 'Left', 'Right', 'Top',
        'TopLeft', 'TopRight', 'Bottom', 'BottomLeft', 'BottomRight', 'Size',
        'Hitbox', 'VisualPosition', 'AnyWet'
    ]);

    static BaseModProjectileMethod(proj, name) {
        let proto = proj ? Object.getPrototypeOf(proj) : null;
        while (proto) {
            if (proto.constructor?.name === 'ModProjectile')
                return proto[name];
            proto = Object.getPrototypeOf(proto);
        }
        return null;
    }

    static BindOverride(proj, name) {
        const fn = proj?.[name];
        if (typeof fn !== 'function') return null;
        const base = this.BaseModProjectileMethod(proj, name);
        if (typeof base === 'function' && fn === base) return null;
        return fn.bind(proj);
    }

    static CompileRuntime(proj) {
        if (!proj || !(Number(proj.Type) >= 0)) return null;
        const defaults = [];
        const source = proj.Projectile || {};
        for (const key of Object.keys(source)) {
            if (this.InheritedEntityDefaults.has(key)) continue;
            defaults.push([key, source[key]]);
        }
        const width = Math.max(1, Math.floor(Number(source.width) || 1));
        const height = Math.max(1, Math.floor(Number(source.height) || 1));
        const preAISource = typeof proj.PreAI === 'function' ? Function.prototype.toString.call(proj.PreAI) : '';
        const aiSource = typeof proj.AI === 'function' ? Function.prototype.toString.call(proj.AI) : '';
        const runtime = {
            type: Number(proj.Type),
            mod: proj,
            defaults,
            width,
            height,
            aiStyle: Math.floor(Number(source.aiStyle) || 0),
            aiType: Math.floor(Number(proj.AIType) || 0),
            // Direct compiled flag used by the fishing fast path. Avoid reading
            // Projectile.bobber from every live mod projectile each AI tick.
            bobber: source.bobber === true,
            // A maioria dos projéteis só define extraUpdates em SetDefaults. Marco
            // uma vez os poucos que alteram isso em AI/PreAI para não ler o campo
            // nativo em todo passe de todos os projéteis.
            dynamicExtraUpdates: preAISource.includes('extraUpdates') || aiSource.includes('extraUpdates'),
            preserveExtraUpdates: proj.PreserveExtraUpdates === true,
            onSpawn: this.BindOverride(proj, 'OnSpawn'),
            needsOnSpawn: undefined,
            preAI: this.BindOverride(proj, 'PreAI'),
            ai: this.BindOverride(proj, 'AI'),
            preKill: this.BindOverride(proj, 'PreKill'),
            onKill: this.BindOverride(proj, 'OnKill'),
            colliding: this.BindOverride(proj, 'Colliding'),
            onTileCollide: this.BindOverride(proj, 'OnTileCollide'),
            canCutTiles: this.BindOverride(proj, 'CanCutTiles'),
            cutTiles: this.BindOverride(proj, 'CutTiles'),
            onHitNPC: this.BindOverride(proj, 'OnHitNPC'),
            onHitPlayer: this.BindOverride(proj, 'OnHitPlayer'),
            applyShader: this.BindOverride(proj, 'ApplyShader'),
            getAlpha: this.BindOverride(proj, 'GetAlpha'),
            preDraw: this.BindOverride(proj, 'PreDraw'),
            postDraw: this.BindOverride(proj, 'PostDraw'),
            canDamage: this.BindOverride(proj, 'CanDamage'),
            minionContactDamage: this.BindOverride(proj, 'MinionContactDamage'),
            modifyDamageHitbox: this.BindOverride(proj, 'ModifyDamageHitbox')
        };
        runtime.needsCustomDraw = !!(runtime.preDraw || runtime.postDraw);
        runtime.needsCustomAI = !!(runtime.preAI || runtime.ai);
        this.RuntimeByType[runtime.type] = runtime;
        return runtime;
    }

    static getRuntime(type) {
        const index = Math.floor(Number(type));
        return Number.isFinite(index) && index >= 0 ? this.RuntimeByType[index] : undefined;
    }

    static RuntimeNeedsOnSpawn(runtime) {
        if (!runtime) return false;
        if (runtime.needsOnSpawn !== undefined) return runtime.needsOnSpawn === true;
        runtime.needsOnSpawn = !!runtime.onSpawn
            || this.GetGlobalCallbacksForType('OnSpawn', runtime.type).length > 0;
        return runtime.needsOnSpawn === true;
    }

    static GetRuntimeStats() {
        let total = 0, customAI = 0, nativeOnlyAI = 0, customDraw = 0, vanillaDraw = 0, onSpawn = 0, dynamicExtraUpdates = 0;
        for (let i = 0; i < this.RuntimeByType.length; i++) {
            const rt = this.RuntimeByType[i];
            if (!rt) continue;
            total++;
            if (rt.ai || rt.preAI) customAI++; else nativeOnlyAI++;
            if (rt.needsCustomDraw) customDraw++; else vanillaDraw++;
            if (rt.onSpawn) onSpawn++;
            if (rt.dynamicExtraUpdates) dynamicExtraUpdates++;
        }
        return { total, customAI, nativeOnlyAI, customDraw, vanillaDraw, onSpawn, dynamicExtraUpdates };
    }

    static ApplyCompiledDefaults(proj, runtime) {
        if (!proj || !runtime) return false;
        for (const entry of runtime.defaults) {
            try { proj[entry[0]] = entry[1]; } catch (e) { }
        }
        const scale = Math.max(0.01, Number(proj.scale) || 1);
        const width = Math.max(1, Math.floor(runtime.width * scale));
        const height = Math.max(1, Math.floor(runtime.height * scale));
        try {
            const resize = proj['void Resize(int newWidth, int newHeight)'];
            if (typeof resize === 'function') resize(width, height);
        } catch (e) { }
        try { proj.maxPenetrate = proj.penetrate; } catch (e) { }
        // Phase 12.74.10 benchmark: TLPro pays the JS/NativeObject bridge cost once
        // per extra update. Cap custom projectile sub-updates to one extra pass and
        // disable the native projectile light field. This is intentionally a CPU
        // benchmark, not the final fidelity configuration.
        try {
            const extra = Math.max(0, Math.floor(Number(proj.extraUpdates) || 0));
            if (extra > 1 && runtime.preserveExtraUpdates !== true) proj.extraUpdates = 1;
            let isLightPet = false;
            try { isLightPet = Terraria.ID.ProjectileID.Sets.LightPet[Math.floor(Number(proj.type) || 0)] === true; } catch (_) { }
            if (!isLightPet && Number(proj.light) > 0) proj.light = 0;
        } catch (e) { }
        if (!this.MobilePerfLogged) {
            this.MobilePerfLogged = true;
            try { tl.log('[CalamityPort MobileHotpathSweep] active; extraUpdates<=1 except explicit fidelity opt-ins; projectile.light=0 except Light Pets; compactNPCRegistry=enabled; DepthCrusher=minFX; Perforator=lowFX.'); } catch (e) { }
        }
        this.CompiledSpawnCount++;
        if (!this.SpawnPerfLogged) {
            this.SpawnPerfLogged = true;
            try {
                const stats = this.GetRuntimeStats();
                tl.log(`[CalamityPort ProjectileNativeCache] compiled defaults first spawn; runtimes=${stats.total}; nativeDraw=${stats.vanillaDraw}; customDraw=${stats.customDraw}; customAI=${stats.customAI}; inheritedSizeBridge=off.`);
            } catch (e) { }
        }
        return true;
    }

    static InvalidateGlobalCallbacks() {
        this._globalCallbackCache = {};
        this._globalTypeCallbackCache = {};
    }

    static GetGlobalCallbacks(name) {
        const registeredCount = GlobalProjectile.RegisteredProjectiles.length;
        if (this._globalCallbackCount !== registeredCount) {
            this._globalCallbackCache = {};
            this._globalTypeCallbackCache = {};
            this._globalCallbackCount = registeredCount;
        }
        let callbacks = this._globalCallbackCache[name];
        if (callbacks) return callbacks;

        callbacks = [];
        for (const globalProjectile of GlobalProjectile.RegisteredProjectiles) {
            if (!globalProjectile || typeof globalProjectile[name] !== 'function') continue;
            let proto = Object.getPrototypeOf(globalProjectile);
            let baseMethod = null;
            while (proto) {
                if (proto.constructor?.name === 'GlobalProjectile') {
                    baseMethod = proto[name];
                    break;
                }
                proto = Object.getPrototypeOf(proto);
            }
            if (typeof baseMethod !== 'function' || globalProjectile[name] !== baseMethod) callbacks.push(globalProjectile);
        }
        this._globalCallbackCache[name] = callbacks;
        return callbacks;
    }

    static HasGlobalCallback(name) {
        return this.GetGlobalCallbacks(name).length > 0;
    }

    static GetGlobalCallbacksForType(name, type) {
        const numericType = Math.floor(Number(type));
        let byType = this._globalTypeCallbackCache[name];
        if (!byType) byType = this._globalTypeCallbackCache[name] = [];
        let callbacks = byType[numericType];
        if (callbacks !== undefined) return callbacks;
        callbacks = [];
        const source = this.GetGlobalCallbacks(name);
        for (let i = 0; i < source.length; i++) {
            const globalProjectile = source[i];
            if (!globalProjectile) continue;
            const filter = globalProjectile.AppliesToProjectileType;
            if (typeof filter === 'function') {
                let applies = false;
                try { applies = filter.call(globalProjectile, numericType) !== false; }
                catch (e) { applies = false; }
                if (!applies) continue;
            }
            callbacks.push(globalProjectile);
        }
        byType[numericType] = callbacks;
        return callbacks;
    }

    static NeedsOnSpawn(proj) {
        if (!proj) return false;
        if (this.isModType(proj.type)) return true;
        try { return Number(proj.type) === Number(Terraria.ID.ProjectileID.BobberWooden); }
        catch (e) { return false; }
    }

    static NeedsCustomDraw(proj) {
        if (!proj) return false;
        const runtime = this.getRuntime(proj.type);
        if (runtime) return runtime.needsCustomDraw === true;
        try {
            if (Number(proj.type) !== Number(Terraria.ID.ProjectileID.BobberWooden)) return false;
            return FusionEntityData.PeekProjectileBag(proj, 'wulfrumRodBobberVisual')?.active === true;
        } catch (e) {
            return false;
        }
    }
    
    static isModProjectile(proj) { return this.isModType(proj.type); }
    static isModType(type) { return !!this.getRuntime(type) || this.ModTypes.has(type); }
    static getByName(name) { return this.Projectiles[this.IndexByName[name]]; }
    static getTypeByName(name) { return this.getByName(name)?.Type; }
    static getModProjectile(type) {
        const runtime = this.getRuntime(type);
        if (runtime) return runtime.mod;
        if (this.ModTypes.has(type)) return this.Projectiles[this.TypeToIndex[type]];
        return undefined;
    }
    static register(proj) {
        const next = ProjectileLoader.Projectiles.length;
        ProjectileLoader.Projectiles.push(proj);
        this.IndexByName[proj.constructor.name] = next;
    }
    
    static ProjectileProperties = [
        'ownerHitCheckDistance',
        'counterweight',
        'sentry',
        'arrow',
        'bobber',
        'numHits',
        'netImportant',
        'manualDirectionChange',
        'decidesManualFallThrough',
        'shouldFallThrough',
        'bannerIdToRespondTo',
        'stopsDealingDamageAfterPenetrateHits',
        'localNPCHitCooldown',
        'idStaticNPCHitCooldown',
        'usesLocalNPCImmunity',
        'usesIDStaticNPCImmunity',
        'usesOwnerMeleeHitCD',
        'appliesImmunityTimeOnSingleHits',
        'noDropItem',
        'minion',
        'minionSlots',
        'soundDelay',
        'spriteDirection',
        'melee',
        'ranged',
        'magic',
        'ownerHitCheck',
        'drawLayer',
        'usesOwnerLight',
        'hide',
        'ignoreWater',
        'hostile',
        'reflected',
        'netUpdate',
        'netUpdate2',
        'netSpam',
        'numUpdates',
        'extraUpdates',
        'restrikeDelay',
        'light',
        'penetrate',
        'tileCollide',
        'aiStyle',
        'alpha',
        'rotation',
        'scale',
        'timeLeft',
        'friendly',
        'damage',
        'originalDamage',
        'knockBack',
        'miscText',
        'coldDamage',
        'noEnchantments',
        'noEnchantmentVisuals',
        'trap',
        'npcProj',
        'originatedFromActivableTile',
        'tagEffectType',
        'bonusTagDamage',
        'armorPenetration',
        'bonusCritChance',
        'hostileDamageScaling'
    ];
    
    static LoadProjectiles() {
        this.TypeOffset = ModLoader.ModData.ProjectileCount ?? 0;
        for (const proj of this.Projectiles) {
            this.LoadProjectile(proj);
        }
    }
    
    static LoadProjectile(proj) {
        this.Count++;
        proj.Projectile = {};
        proj.Type = proj.Projectile.type = tl.projectile.registerNew(proj.constructor.name);
        this.ModTypes.add(proj.Type);
        const nextProjectile = proj.Type + 1;
        this.TypeToIndex[proj.Type] = this.Projectiles.indexOf(proj);
        
        resizeArrayProperty(Terraria.Main, 'projHostile', nextProjectile);
        resizeArrayProperty(Terraria.Main, 'projHook', nextProjectile);
        resizeArrayProperty(Terraria.Main, 'projPet', nextProjectile);
        resizeArrayProperty(Terraria.Main, 'projFrames', nextProjectile);

        // ProjectileID.Sets are fixed-size CLR arrays too.  Calamity uses these for
        // trails, minion targeting/sacrifice, sentry/minion shots and yoyo physics.
        // If they stay at ProjectileID.Count, SetStaticDefaults silently misses
        // custom TLPro IDs and the projectile then falls back to unrelated vanilla
        // behavior.  Grow the complete set used by this port before SetStaticDefaults.
        const customProjectileSets = [
            ['TrailCacheLength', 0],
            ['TrailingMode', -1],
            ['MinionTargetingFeature', false],
            ['MinionSacrificable', false],
            ['CultistIsResistantTo', false],
            ['IsAWhip', false],
            ['DrawScreenCheckFluff', 0],
            ['TrackMinionSpawnFromItemUse', false],
            ['MinionShot', false],
            ['SentryShot', false],
            ['LightPet', false],
            ['YoyosLifeTimeMultiplier', 0],
            ['YoyosMaximumRange', 0],
            ['YoyosTopSpeed', 0]
        ];
        for (const [setName, defaultValue] of customProjectileSets) {
            try { resizeArrayProperty(Terraria.ID.ProjectileID.Sets, setName, nextProjectile, defaultValue); } catch (e) { }
        }
        
        addToArray(Terraria.Lang, '_projectileNameCache', ModLocalization.empty());
        
        //resizeArrayProperty(Terraria.Projectile, 'perIDStaticNPCImmunity', nextProjectile);
        
        this.SetupTextures(proj);
        
        proj.SetDefaults();
        proj.SetStaticDefaults();
        
        if (proj.Projectile.hostile) {
            Terraria.Main.projHostile[proj.Type] = true;
        }
        if (proj.Projectile.aiStyle === Terraria.ID.ProjAIStyleID.Hook) {
            Terraria.Main.projHook[proj.Type] = true;
        }
        Terraria.Lang._projectileNameCache[proj.Type] = ModLocalization.getTranslationProjectileName(proj.Type);
        
        const projTexture = Terraria.GameContent.TextureAssets.Projectile[proj.Type].Value;
        if (proj.Projectile.width == undefined) proj.Projectile.width = projTexture.Width;
        if (proj.Projectile.height == undefined) proj.Projectile.height = projTexture.Height;
        
        proj.PostStaticDefaults();
        this.CompileRuntime(proj);
    }
    
    static SetupContent() {
        this.LoadProjectiles();
        ModLoader.ModData.ProjectileCount += this.Count;
        for (const proj of this.Projectiles) {
            proj?.SetupContent();
        }
    }
    
    static PostSetupContent() {
        this.ProjectileCount = this.MAX_VANILLA_ID + ModLoader.ModData.ProjectileCount;
        for (const proj of this.Projectiles) {
            proj?.PostSetupContent();
        }
    }
    
    static SetupTextures(proj) {
        if (!proj.Texture?.startsWith('Textures/')) {
            proj.Texture = 'Textures/' + proj.Texture;
        }
        
        const projTexture = new ModTexture(proj.Texture, proj.horizontalFrames, proj.frameCount, proj.ticksPerFrame);
        if (projTexture?.exists) {
            Terraria.GameContent.TextureAssets.Projectile[proj.Type] = projTexture.asset.asset;
        }
        
        // _Glow
        const projGlowTexture = new ModTexture(`${proj.Texture}_Glow`);
        if (projGlowTexture?.exists) {
            const newIndex = Terraria.GameContent.TextureAssets.GlowMask.length;
            const newSize = newIndex + 1;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'GlowMask', newSize, projGlowTexture.asset.asset);
            proj.Projectile.glowMask = newIndex;
        }
    }
    
    static SetDefaults(proj) {
        for (const gProj of this.GetGlobalCallbacksForType('SetDefaults', proj.type)) {
            gProj?.SetDefaults(proj);
        }
    }
    
    static OnSpawn(proj, runtime = null) {
        // owner+identity state is now lazy. Unlike the old whoAmI slot table,
        // a fresh network identity cannot alias an older live projectile, so do
        // not allocate/reset a FusionEntityData entry for projectiles that never
        // use any JS-side bags.
        const rt = runtime || this.getRuntime(proj.type);
        rt?.onSpawn?.(proj);
        for (const gProj of this.GetGlobalCallbacksForType('OnSpawn', proj.type)) {
            gProj?.OnSpawn(proj);
        }
    }

    // Hot-path global helpers. The hook layer calls these only when the callback
    // exists anywhere in the current port, so empty global dispatch disappears
    // completely from normal projectile AI/damage/kill updates. Per-type lists
    // remain cached by GetGlobalCallbacksForType().
    static GlobalPreAI(proj, type) {
        let value = true;
        const globals = this.GetGlobalCallbacksForType('PreAI', type);
        for (let i = 0; i < globals.length; i++)
            if ((globals[i]?.PreAI(proj) ?? true) === false) value = false;
        return value;
    }

    static GlobalAI(proj, type) {
        const globals = this.GetGlobalCallbacksForType('AI', type);
        for (let i = 0; i < globals.length; i++) globals[i]?.AI(proj);
    }

    static GlobalPreKill(proj, timeLeft, type) {
        let value = true;
        const globals = this.GetGlobalCallbacksForType('PreKill', type);
        for (let i = 0; i < globals.length; i++)
            if ((globals[i]?.PreKill(proj, timeLeft) ?? true) === false) value = false;
        return value;
    }

    static GlobalOnKill(proj, timeLeft, type) {
        const globals = this.GetGlobalCallbacksForType('OnKill', type);
        for (let i = 0; i < globals.length; i++) globals[i]?.OnKill(proj, timeLeft);
    }

    static GlobalOnTileCollide(proj, hitDirection, type) {
        let value = true;
        const globals = this.GetGlobalCallbacksForType('OnTileCollide', type);
        for (let i = 0; i < globals.length; i++)
            if ((globals[i]?.OnTileCollide(proj, hitDirection) ?? true) === false) value = false;
        return value;
    }

    static GlobalOnHitPlayer(proj, player, type) {
        const globals = this.GetGlobalCallbacksForType('OnHitPlayer', type);
        for (let i = 0; i < globals.length; i++) globals[i]?.OnHitPlayer(proj, player);
    }

    static GlobalCanCutTiles(proj, current, type) {
        let value = current;
        const globals = this.GetGlobalCallbacksForType('CanCutTiles', type);
        for (let i = 0; i < globals.length; i++)
            if ((globals[i]?.CanCutTiles(proj) ?? true) === false) value = false;
        return value;
    }

    static GlobalGetAlpha(proj, color, type) {
        let value = color;
        const globals = this.GetGlobalCallbacksForType('GetAlpha', type);
        for (let i = 0; i < globals.length; i++) value = globals[i]?.GetAlpha(proj, value) ?? value;
        return value;
    }

    static GlobalCanDamage(proj, type) {
        const globals = this.GetGlobalCallbacksForType('CanDamage', type);
        for (let i = 0; i < globals.length; i++)
            if ((globals[i]?.CanDamage(proj) ?? true) === false) return false;
        return true;
    }

    static GlobalModifyDamageHitbox(proj, hitbox, type) {
        const globals = this.GetGlobalCallbacksForType('ModifyDamageHitbox', type);
        for (let i = 0; i < globals.length; i++) globals[i]?.ModifyDamageHitbox(proj, hitbox);
        return hitbox;
    }

    static ClearProjectileState(proj) {
        FusionEntityData.ClearProjectile(proj);
    }
    
    static PreAI(proj, runtime = null) {
        const rt = runtime || this.getRuntime(proj.type);
        let value = rt?.preAI ? (rt.preAI(proj) ?? true) : true;
        const globals = this.GetGlobalCallbacksForType('PreAI', proj.type);
        for (let i = 0; i < globals.length; i++) {
            if ((globals[i]?.PreAI(proj) ?? true) === false) value = false;
        }
        return value;
    }
    
    static AI(proj, runtime = null) {
        const rt = runtime || this.getRuntime(proj.type);
        rt?.ai?.(proj);
        const globals = this.GetGlobalCallbacksForType('AI', proj.type);
        for (let i = 0; i < globals.length; i++) globals[i]?.AI(proj);
    }
    
    static PreKill(proj, timeLeft, runtime = null) {
        const rt = runtime || this.getRuntime(proj.type);
        let value = rt?.preKill ? (rt.preKill(proj, timeLeft) ?? true) : true;
        const globals = this.GetGlobalCallbacksForType('PreKill', proj.type);
        for (let i = 0; i < globals.length; i++) {
            if ((globals[i]?.PreKill(proj, timeLeft) ?? true) === false) value = false;
        }
        return value;
    }
    
    static OnKill(proj, timeLeft, runtime = null) {
        const rt = runtime || this.getRuntime(proj.type);
        rt?.onKill?.(proj, timeLeft);
        const globals = this.GetGlobalCallbacksForType('OnKill', proj.type);
        for (let i = 0; i < globals.length; i++) globals[i]?.OnKill(proj, timeLeft);
        FusionEntityData.ClearProjectile(proj);
    }
    
    static Colliding(proj, myRect, targetRect) {
        const rt = this.getRuntime(proj.type);
        return rt?.colliding ? rt.colliding(proj, myRect, targetRect) : null;
    }
    
    static OnTileCollide(proj, hitDirection) {
        const rt = this.getRuntime(proj.type);
        return rt?.onTileCollide ? (rt.onTileCollide(proj, hitDirection) ?? true) : true;
    }
    
    static CanCutTiles(proj) {
        const rt = this.getRuntime(proj.type);
        let value = rt?.canCutTiles ? rt.canCutTiles(proj) : null;
        const globals = this.GetGlobalCallbacksForType('CanCutTiles', proj.type);
        for (let i = 0; i < globals.length; i++) {
            if ((globals[i]?.CanCutTiles(proj) ?? true) === false) value = false;
        }
        return value;
    }
    
    static CutTiles(proj) {
        const rt = this.getRuntime(proj.type);
        rt?.cutTiles?.(proj);
        const globals = this.GetGlobalCallbacksForType('CutTiles', proj.type);
        for (let i = 0; i < globals.length; i++) globals[i]?.CutTiles(proj);
    }
    
    static OnHitNPC(proj, npc) {
        const rt = this.getRuntime(proj.type);
        rt?.onHitNPC?.(proj, npc);
        const globals = this.GetGlobalCallbacksForType('OnHitNPC', proj.type);
        for (let i = 0; i < globals.length; i++) globals[i]?.OnHitNPC(proj, npc);
    }
    
    static OnHitPlayer(proj, player) {
        const rt = this.getRuntime(proj.type);
        rt?.onHitPlayer?.(proj, player);
        const globals = this.GetGlobalCallbacksForType('OnHitPlayer', proj.type);
        for (let i = 0; i < globals.length; i++) globals[i]?.OnHitPlayer(proj, player);
    }
    
    static ApplyShader(proj) {
        const rt = this.getRuntime(proj.type);
        return rt?.applyShader ? rt.applyShader(proj) : null;
    }
    
    static GetAlpha(proj, color) {
        const rt = this.getRuntime(proj.type);
        let value = rt?.getAlpha ? (rt.getAlpha(proj, color) ?? color) : color;
        const globals = this.GetGlobalCallbacksForType('GetAlpha', proj.type);
        for (let i = 0; i < globals.length; i++) value = globals[i]?.GetAlpha(proj, value) ?? value;
        return value;
    }
    
    static PreDraw(proj, lightColor) {
        const rt = this.getRuntime(proj.type);
        let value = rt?.preDraw ? (rt.preDraw(proj, lightColor) ?? true) : true;
        // The only current GlobalProjectile PreDraw is the vanilla Wulfrum
        // wooden-bobber replacement. Mod projectiles therefore stay on their
        // compiled per-type draw path and do not call that global callback.
        if (!rt) {
            const globals = this.GetGlobalCallbacksForType('PreDraw', proj.type);
            for (let i = 0; i < globals.length; i++) {
                if ((globals[i]?.PreDraw(proj, lightColor) ?? true) === false) value = false;
            }
        }
        return value;
    }
    
    static PostDraw(proj, lightColor) {
        const rt = this.getRuntime(proj.type);
        rt?.postDraw?.(proj, lightColor);
        if (!rt) {
            const globals = this.GetGlobalCallbacksForType('PostDraw', proj.type);
            for (let i = 0; i < globals.length; i++) globals[i]?.PostDraw(proj, lightColor);
        }
    }
    
    static CanDamage(proj) {
        const rt = this.getRuntime(proj.type);
        let value = rt?.canDamage ? (rt.canDamage(proj) ?? true) : true;
        const globals = this.GetGlobalCallbacksForType('CanDamage', proj.type);
        for (let i = 0; i < globals.length; i++) {
            if ((globals[i]?.CanDamage(proj) ?? true) === false) value = false;
        }
        return value;
    }

    static MinionContactDamage(proj) {
        const rt = this.getRuntime(proj.type);
        return rt?.minionContactDamage ? rt.minionContactDamage(proj) === true : false;
    }
    
    static ModifyDamageHitbox(proj, hitbox) {
        const rt = this.getRuntime(proj.type);
        rt?.modifyDamageHitbox?.(proj, hitbox);
        const globals = this.GetGlobalCallbacksForType('ModifyDamageHitbox', proj.type);
        for (let i = 0; i < globals.length; i++) globals[i]?.ModifyDamageHitbox(proj, hitbox);
        return hitbox;
    }
}
