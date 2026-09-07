import { AcrobaticFishingPreAI } from './../../Core/AcrobaticFishingRuntime.js';
import { Terraria, Microsoft, Modules } from './../ModImports.js';
import { ProjectileLoader } from './../Loaders/ProjectileLoader.js';
import { PlayerLoader } from './../Loaders/PlayerLoader.js';
import { CombinedLoader } from './../Loaders/CombinedLoader.js';
import { HasActiveVirtualWormDamage, CanUseVirtualWormProjectileProxy, VirtualWormBodyBroadphaseOverlaps, BeginVirtualWormProjectileProxy, EndVirtualWormProjectileProxy } from './../../Core/SingleEntityWormRuntime.js';

const { Vector2, Rectangle } = Modules;
// Terraria 1.4.4 vanilla fishing bobber projectile IDs. Numeric ranges keep the
// hot path allocation-free and avoid reading Projectile.bobber on every vanilla
// projectile: rods 360-366/381-382, Bloody 760, Scarab 775, accessory bobbers 986-993.
const IsVanillaFishingBobberType = type => (type >= 360 && type <= 366) || (type >= 381 && type <= 382) || type === 760 || type === 775 || (type >= 986 && type <= 993);
const VirtualWormSegmentRect = Rectangle.new();

export class ProjectileHooks {
    static initialized = false;
    
    // owner + identity are declared directly on Projectile. Use nested Maps
    // instead of rebuilding a string key every AI sub-update.
    static trackedInstances = new Map();
    static perfLogged = false;

    static TrackOwner(owner, create = false) {
        let map = this.trackedInstances.get(owner);
        if (!map && create) {
            map = new Map();
            this.trackedInstances.set(owner, map);
        }
        return map || null;
    }

    static IsTracked(owner, identity, type) {
        const map = this.TrackOwner(owner, false);
        return !!map && map.get(identity) === type;
    }

    static MarkTracked(owner, identity, type) {
        if (!(owner >= 0) || !(identity >= 0)) return;
        this.TrackOwner(owner, true).set(identity, type);
    }

    static Untrack(owner, identity, type) {
        const map = this.TrackOwner(owner, false);
        if (!map) return false;
        const matched = map.get(identity) === type;
        if (matched) map.delete(identity);
        if (map.size === 0) this.trackedInstances.delete(owner);
        return matched;
    }
    
    // Here you can disable the hooks that won't be used in your mod to avoid unnecessary processing
    static HookList = {
        All: (info) => true,
        SetDefaults: (info) => info.hasProjectiles || info.hasGlobalProjectiles,
        StatusNPC: (info) => info.hasProjectiles || info.hasGlobalProjectiles || info.hasPlayers,
        StatusPlayer: (info) => info.hasProjectiles || info.hasGlobalProjectiles,
        Colliding: (info) => info.hasProjectiles,
        CanCutTiles: (info) => info.hasProjectiles || info.hasGlobalProjectiles,
        // No ModProjectile or GlobalProjectile in this port overrides CutTiles.
        // Do not install an empty native hook for every projectile.
        CutTiles: (info) => false,
        AI_061_FishingBobber_GiveItemToPlayer: (info) => info.hasPlayers,
        AI: (info) => info.hasProjectiles || info.hasGlobalProjectiles,
        OnSpawn: (info) => info.hasProjectiles || info.hasGlobalProjectiles, // requires AI hook
        Kill: (info) => info.hasProjectiles || info.hasGlobalProjectiles,
        GetAlpha: (info) => info.hasProjectiles || info.hasGlobalProjectiles,
        Damage: (info) => info.hasProjectiles || info.hasGlobalProjectiles
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.SetDefaults(info)) {
            const HasGlobalSetDefaults = ProjectileLoader.HasGlobalCallback('SetDefaults');
            Terraria.Projectile['void SetDefaults(int Type)'
            ].hook((original, self, type) => {
                original(self, type);
                const runtime = ProjectileLoader.getRuntime(type);
                if (runtime) {
                    // Static ModProjectile defaults were already evaluated once at
                    // content load. Reuse that compiled snapshot on every spawn and
                    // apply inherited width/height through Projectile.Resize().
                    self.active = true;
                    ProjectileLoader.ApplyCompiledDefaults(self, runtime);
                    if (HasGlobalSetDefaults) ProjectileLoader.SetDefaults(self);
                    return;
                }
                // Loading-order fallback only. Normal gameplay uses the compiled path.
                const isKnownMod = ProjectileLoader.ModTypes.has(type);
                if (!isKnownMod) {
                    if (HasGlobalSetDefaults) ProjectileLoader.SetDefaults(self);
                    return;
                }
                self.active = true;
                const proj = ProjectileLoader.getModProjectile(type);
                if (proj) {
                    proj.SetDefaults(self);
                    try { Object.assign(self, proj.Projectile); } catch (error) {
                        throw new Error(`SetDefaults fallback failed for projectile <${proj.constructor.name}>, error: ${error}`);
                    }
                }
                if (HasGlobalSetDefaults) ProjectileLoader.SetDefaults(self);
            });
        }
        
        if (this.HookList.StatusNPC(info)) {
            Terraria.Projectile['void StatusNPC(int i)'
            ].hook((original, self, npcIndex) => {
                original(self, npcIndex);
                CombinedLoader.OnHitNPCWithProj(self, Terraria.Main.npc[npcIndex]);
            });
        }
        
        if (this.HookList.StatusPlayer(info)) {
            const HasGlobalOnHitPlayer = ProjectileLoader.HasGlobalCallback('OnHitPlayer');
            Terraria.Projectile['void StatusPlayer(Player player)'
            ].hook((original, self, player) => {
                original(self, player);
                const runtime = ProjectileLoader.getRuntime(self.type);
                runtime?.onHitPlayer?.(self, player);
                if (HasGlobalOnHitPlayer) ProjectileLoader.GlobalOnHitPlayer(self, player, self.type);
            });
        }
        
        if (this.HookList.Colliding(info)) {
            Terraria.Projectile['bool Colliding(Rectangle myRect, Rectangle targetRect)'
            ].hook((original, self, rect1, rect2) => {
                const runtime = ProjectileLoader.getRuntime(self.type);
                if (!runtime?.colliding) return original(self, rect1, rect2);
                return runtime.colliding(self, rect1, rect2) ?? original(self, rect1, rect2);
            });
        }
        
        if (this.HookList.CanCutTiles(info)) {
            const HasGlobalCanCutTiles = ProjectileLoader.HasGlobalCallback('CanCutTiles');
            Terraria.Projectile['bool CanCutTiles()'
            ].hook((original, self) => {
                const runtime = ProjectileLoader.getRuntime(self.type);
                if (!runtime?.canCutTiles && !HasGlobalCanCutTiles) return original(self);
                let result = runtime?.canCutTiles ? runtime.canCutTiles(self) : null;
                if (HasGlobalCanCutTiles) result = ProjectileLoader.GlobalCanCutTiles(self, result, self.type);
                return result ?? original(self);
            });
        }
        
        if (this.HookList.CutTiles(info)) {
            const HasGlobalCutTiles = ProjectileLoader.HasGlobalCallback('CutTiles');
            Terraria.Projectile['void CutTiles()'
            ].hook((original, self) => {
                original(self);
                const runtime = ProjectileLoader.getRuntime(self.type);
                if (runtime?.cutTiles || HasGlobalCutTiles) ProjectileLoader.CutTiles(self);
            });
        }
        
        if (this.HookList.AI_061_FishingBobber_GiveItemToPlayer(info)) {
            Terraria.Projectile['void AI_061_FishingBobber_GiveItemToPlayer(Player thePlayer, int itemType)'
            ].hook((original, self, player, itemType) => {
                original(self, player, PlayerLoader.ModifyCaughtFish(player, itemType));
            });
        }
        
        if (this.HookList.AI(info)) {
            const OnSpawnHook = this.HookList.OnSpawn(info);
            const HasGlobalPreAI = ProjectileLoader.HasGlobalCallback('PreAI');
            const HasGlobalAI = ProjectileLoader.HasGlobalCallback('AI');
            let BobberWoodenType = -1;
            try { BobberWoodenType = Math.floor(Number(Terraria.ID.ProjectileID.BobberWooden)); } catch (e) { }
            Terraria.Projectile['void AI()'
            ].hook((original, self) => {
                const type = Math.floor(Number(self.type));
                const runtime = ProjectileLoader.getRuntime(type);
                const isModProjectile = !!runtime;

                // Vanilla projectiles stay completely native except for actual fishing
                // bobbers and the existing wooden-bobber visual compatibility path.
                // The numeric bobber gate is allocation-free, so bullets/minions/VFX still
                // return to native AI before any fishing runtime work is touched.
                const isFishingVanilla = !isModProjectile && IsVanillaFishingBobberType(type);
                const isTrackedVanilla = !isModProjectile && OnSpawnHook && type === BobberWoodenType;
                if (!isModProjectile && !isTrackedVanilla && !isFishingVanilla) {
                    original(self);
                    return;
                }

                const needsOnSpawn = OnSpawnHook && (isModProjectile
                    ? ProjectileLoader.RuntimeNeedsOnSpawn(runtime)
                    : isTrackedVanilla);
                if (needsOnSpawn) {
                    const owner = Math.floor(Number(self.owner));
                    const identity = Math.floor(Number(self.identity));
                    if (!this.IsTracked(owner, identity, type)) {
                        ProjectileLoader.OnSpawn(self, runtime);
                        this.MarkTracked(owner, identity, type);
                    }
                }

                if (!this.perfLogged) {
                    this.perfLogged = true;
                    try { tl.log('[CalamityPort ProjectileNativeCache] compiled dispatch active; FusionEntityData=owner+identity; SetDefaults=compiled+Resize; vanillaDrawFastPath=enabled.'); } catch (e) { }
                }

                if (!isModProjectile) {
                    // Phase 13.13.0: keep vanilla projectiles on the zero-overhead native
                    // fast path, except actual fishing bobbers while the dedicated
                    // fishing minigame wants to intercept their AI. This lets the
                    // Acrobatic Bobber work with vanilla rods without routing bullets,
                    // minions or other vanilla projectiles through JS.
                    if (isFishingVanilla) {
                        if ((AcrobaticFishingPreAI(self) ?? true) === false) return;
                    }
                    original(self);
                    return;
                }

                // Só os tipos que realmente escrevem extraUpdates durante AI precisam
                // desta checagem. Os demais já foram limitados no SetDefaults compilado.
                if (runtime.dynamicExtraUpdates === true) {
                    try { if (Number(self.extraUpdates) > 1) self.extraUpdates = 1; } catch (e) { }
                }

                // Fishing minigame fast path: this branch is never touched by ordinary
                // combat projectiles, preserving the zero-cost global PreAI path.
                if (runtime.bobber === true) {
                    if ((AcrobaticFishingPreAI(self) ?? true) === false) return;
                }

                if (runtime.preAI) {
                    if ((runtime.preAI(self) ?? true) === false) return;
                }
                if (HasGlobalPreAI && !ProjectileLoader.GlobalPreAI(self, type)) return;

                // Native-first execution: projectiles that actually use a vanilla
                // aiStyle/AIType still execute Terraria AI. Fully custom aiStyle 0/-1
                // projectiles skip the otherwise useless native AI call and go straight
                // to their cached JS callback. Visual drawing is independent of this.
                if (runtime.aiType > 0) {
                    self.type = runtime.aiType;
                    original(self);
                    self.type = type;
                } else if (runtime.aiStyle > 0 || !runtime.ai) {
                    original(self);
                }

                runtime.ai?.(self);
                if (HasGlobalAI) ProjectileLoader.GlobalAI(self, type);
            });
        }
        
        if (this.HookList.Kill(info)) {
            const HasGlobalPreKill = ProjectileLoader.HasGlobalCallback('PreKill');
            const HasGlobalOnKill = ProjectileLoader.HasGlobalCallback('OnKill');
            const HasGlobalOnTileCollide = ProjectileLoader.HasGlobalCallback('OnTileCollide');
            let BobberWoodenType = -1;
            try { BobberWoodenType = Math.floor(Number(Terraria.ID.ProjectileID.BobberWooden)); } catch (e) { }
            Terraria.Projectile['void Kill()'
            ].hook((original, self) => {
                const type = Math.floor(Number(self.type));
                const runtime = ProjectileLoader.getRuntime(type);
                const isModProjectile = !!runtime;
                const isTrackedVanilla = !isModProjectile && type === BobberWoodenType;
                if (!isModProjectile) {
                    if (!isTrackedVanilla) {
                        original(self);
                        return;
                    }
                }

                const needsOnSpawn = isModProjectile
                    ? ProjectileLoader.RuntimeNeedsOnSpawn(runtime)
                    : isTrackedVanilla;
                const trackOwner = needsOnSpawn ? Math.floor(Number(self.owner)) : -1;
                const trackIdentity = needsOnSpawn ? Math.floor(Number(self.identity)) : -1;
                const timeLeft = self.timeLeft;

                if (!isModProjectile) {
                    const hadCustomState = needsOnSpawn ? this.Untrack(trackOwner, trackIdentity, type) : false;
                    original(self);
                    if (hadCustomState) ProjectileLoader.OnKill(self, timeLeft);
                    return;
                }

                let flag = true;
                if ((runtime?.onTileCollide || HasGlobalOnTileCollide) && self.tileCollide) {
                    const hitDirection = Vector2.Normalize(self.velocity);
                    if (Terraria.Collision['bool SolidTiles(Vector2 position, int width, int height)'](
                        Vector2.Add(self.position, hitDirection), self.width, self.height
                    )) {
                        if (runtime?.onTileCollide) flag = (runtime.onTileCollide(self, hitDirection) ?? true) !== false;
                        if (flag && HasGlobalOnTileCollide) flag = ProjectileLoader.GlobalOnTileCollide(self, hitDirection, type);
                    }
                }
                let preKill = runtime?.preKill ? (runtime.preKill(self, timeLeft) ?? true) !== false : true;
                if (preKill && HasGlobalPreKill) preKill = ProjectileLoader.GlobalPreKill(self, timeLeft, type);
                if (flag && preKill) {
                    // Clear the tracked identity only when the projectile is
                    // actually going to die. A false OnTileCollide/PreKill keeps
                    // the same native projectile alive, so clearing here earlier
                    // would make the next AI pass call OnSpawn again and erase
                    // projectile-local cooldown/state.
                    if (needsOnSpawn) this.Untrack(trackOwner, trackIdentity, type);
                    original(self);
                    runtime?.onKill?.(self, timeLeft);
                    if (HasGlobalOnKill) ProjectileLoader.GlobalOnKill(self, timeLeft, type);
                    ProjectileLoader.ClearProjectileState(self);
                }
            });
        }
        
        if (this.HookList.GetAlpha(info)) {
            const HasGlobalGetAlpha = ProjectileLoader.HasGlobalCallback('GetAlpha');
            Terraria.Projectile['Color GetAlpha(Color newColor)'
            ].hook((original, self, newColor) => {
                const runtime = ProjectileLoader.getRuntime(self.type);
                if (!runtime?.getAlpha && !HasGlobalGetAlpha) return original(self, newColor);
                let color = runtime?.getAlpha ? runtime.getAlpha(self, newColor) : newColor;
                if (HasGlobalGetAlpha) color = ProjectileLoader.GlobalGetAlpha(self, color, self.type);
                return original(self, color);
            });
        }
        
        if (this.HookList.Damage(info)) {
            const HasGlobalCanDamage = ProjectileLoader.HasGlobalCallback('CanDamage');
            const HasGlobalModifyDamageHitbox = ProjectileLoader.HasGlobalCallback('ModifyDamageHitbox');
            Terraria.Projectile['void Damage()'
            ].hook((original, self) => {
                const runtime = ProjectileLoader.getRuntime(self.type);
                let canDamage = true;
                if (runtime?.canDamage || HasGlobalCanDamage) {
                    canDamage = runtime?.canDamage ? (runtime.canDamage(self) ?? true) !== false : true;
                    if (canDamage && HasGlobalCanDamage) canDamage = ProjectileLoader.GlobalCanDamage(self, self.type);
                    if (!canDamage) return;
                }

                // Only while a single-entity worm is active, make a body hit a
                // candidate BEFORE native Damage() enumerates NPCs. This replaces
                // the old Projectile.Colliding() proxy, which ran too late.
                let virtualProxy = null;
                // 13.09.8: reject hostile/non-friendly projectiles BEFORE asking the
                // native bridge for Damage_GetHitbox(). Perforator attacks create many
                // hostile projectiles, and the old order paid that native call for every
                // shot even though none could damage a virtual worm body.
                if (HasActiveVirtualWormDamage() && CanUseVirtualWormProjectileProxy(self)) {
                    const complexVirtualHitbox = !!(runtime?.colliding || runtime?.modifyDamageHitbox || HasGlobalModifyDamageHitbox);
                    let hitbox = null;
                    let segmentTest = null;
                    if (!complexVirtualHitbox) {
                        // Common high-rate bullets/arrows: get the ordinary entity rect,
                        // reject it against body-only bounds, and use that same rect for
                        // segment checks. Avoids Damage_GetHitbox + N segment tests for
                        // the overwhelming majority of shots that are not near a worm.
                        try { hitbox = self['Rectangle getRect()'](); } catch (_) { }
                        if (hitbox && !VirtualWormBodyBroadphaseOverlaps(hitbox)) hitbox = null;
                    } else {
                        // Custom collision / expanded damage hitboxes must keep the exact
                        // Terraria path for correctness (slashes, explosions, line hits).
                        try { hitbox = self['Rectangle Damage_GetHitbox()'](); }
                        catch (e) { try { hitbox = self['Rectangle getRect()'](); } catch (_) { } }
                        if (runtime?.colliding && hitbox) {
                            segmentTest = (x, y, w, h) => {
                                VirtualWormSegmentRect.X = x; VirtualWormSegmentRect.Y = y;
                                VirtualWormSegmentRect.Width = w; VirtualWormSegmentRect.Height = h;
                                return (runtime.colliding(self, hitbox, VirtualWormSegmentRect) ?? false) === true;
                            };
                        }
                    }
                    if (hitbox) virtualProxy = BeginVirtualWormProjectileProxy(self, hitbox, segmentTest, true);
                }

                // Terraria's native Damage() rejects Main.projPet types that
                // are not in its hard-coded vanilla contact-minion whitelist.
                const type = Math.floor(Number(self.type));
                let restorePetFlag = false;
                try {
                    if ((runtime?.minionContactDamage?.(self) === true) && type >= 0 && Terraria.Main.projPet[type]) {
                        Terraria.Main.projPet[type] = false;
                        restorePetFlag = true;
                    }
                    original(self);
                } finally {
                    if (restorePetFlag) Terraria.Main.projPet[type] = true;
                    EndVirtualWormProjectileProxy(virtualProxy);
                }
            });
            Terraria.Projectile['Rectangle Damage_GetHitbox()'
            ].hook((original, self) => {
                const hitbox = original(self);
                const runtime = ProjectileLoader.getRuntime(self.type);
                if (!runtime?.modifyDamageHitbox && !HasGlobalModifyDamageHitbox) return hitbox;
                if (runtime?.modifyDamageHitbox) runtime.modifyDamageHitbox(self, hitbox);
                if (HasGlobalModifyDamageHitbox) ProjectileLoader.GlobalModifyDamageHitbox(self, hitbox, self.type);
                return hitbox;
            });
        }
        
        this.initialized = true;
    }
    
    static OnWorldUnload() {
        this.trackedInstances.clear();
        this.perfLogged = false;
    }
}