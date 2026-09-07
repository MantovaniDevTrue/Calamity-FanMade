import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
const FRAME_COUNT = 6;

function N(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

const ActiveBabySlimeOwners = new Set();
const BabySlimeHeartbeats = new Map();

function OwnerKey(owner) {
    return Math.floor(N(owner, -1));
}

export function SetBabySlimeOwnerActive(owner, active) {
    const key = OwnerKey(owner);
    if (key < 0) return;
    if (active) ActiveBabySlimeOwners.add(key);
    else ActiveBabySlimeOwners.delete(key);
}

function GameTick() {
    return Math.floor(N(Terraria.Main.GameUpdateCount, 0));
}

export function MarkBabySlimeAlive(owner, type) {
    const key = OwnerKey(owner);
    if (key < 0) return;
    BabySlimeHeartbeats.set(key, { type: Math.floor(N(type, 0)), tick: GameTick() });
}

export function HasBabySlimeAlive(owner, type, maxAge = 8) {
    const key = OwnerKey(owner);
    const beat = BabySlimeHeartbeats.get(key);
    if (!beat) return false;
    if (Math.floor(N(beat.type, 0)) !== Math.floor(N(type, 0))) return false;
    return GameTick() - Math.floor(N(beat.tick, -999999)) <= Math.max(1, Math.floor(N(maxAge, 8)));
}

export function ClearBabySlimeAlive(owner) {
    BabySlimeHeartbeats.delete(OwnerKey(owner));
}

function BabySlimeOwnerActive(owner) {
    return ActiveBabySlimeOwners.has(OwnerKey(owner));
}

class BabySlimeGodMinionBase extends ModProjectile {
    constructor(texture, textureFile) {
        super();
        this.Texture = texture;
        this.TextureFile = textureFile;
        this.AIType = 266;
        this.DrawTexture = null;
        this.DrawLoadTried = false;
        this.DrawLogged = false;
        this.DrawFallbackLogged = false;
        this.HitLogged = false;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = FRAME_COUNT;
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 26;
        p.height = 26;
        p.netImportant = true;
        p.friendly = true;
        p.hostile = false;
        p.minionSlots = 0;
        p.alpha = 75;
        p.aiStyle = 26;
        p.timeLeft = 90000;
        p.penetrate = -1;
        p.minion = true;
        p.tileCollide = false;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 23;
        p.hide = false;
    }

    LoadDrawTexture() {
        if (this.DrawTexture) return this.DrawTexture;
        if (!this.DrawLoadTried) {
            this.DrawLoadTried = true;
            try { this.DrawTexture = tl.texture.load(this.TextureFile); } catch (e) { }
            if (!this.DrawTexture) {
                try { this.DrawTexture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value || null; } catch (e) { }
            }
        }
        return this.DrawTexture;
    }

    OnSpawn(p) {
        if (!p) return;
        p.friendly = true;
        p.hostile = false;
        p.minion = true;
        p.minionSlots = 0;
        if (!(N(p.damage) > 0)) p.damage = Math.max(1, N(p.originalDamage, 18));
        if (!(N(p.originalDamage) > 0)) p.originalDamage = 18;
    }

    AI(p) {
        if (!p) return;
        p.friendly = true;
        p.hostile = false;
        p.minion = true;
        p.minionSlots = 0;
        p.hide = false;
        if (!(N(p.damage) > 0)) p.damage = Math.max(1, N(p.originalDamage, 18));
        if (BabySlimeOwnerActive(p.owner)) {
            p.timeLeft = 6;
            MarkBabySlimeAlive(p.owner, p.type);
        }
    }

    PreDraw(p, lightColor) {
        try {
            const texture = this.LoadDrawTexture();
            const draw = Terraria.Main.spriteBatch && Terraria.Main.spriteBatch[DrawTexture];
            const getRect = p && p['Rectangle getRect()'];
            if (!texture || !draw || typeof getRect !== 'function') {
                if (!this.DrawFallbackLogged) {
                    this.DrawFallbackLogged = true;
                    try { tl.log(`[CalamityPort Statigel] dedicated Baby Slime native-draw fallback; type=${this.Type}; texture=${!!texture}; draw=${!!draw}; rect=${typeof getRect === 'function'}.`); } catch (e) { }
                }
                return true;
            }

            const rect = getRect();
            if (!rect) return true;
            const frameHeight = Math.max(1, Math.floor(N(texture.Height, FRAME_COUNT) / FRAME_COUNT));
            const frame = ((Math.floor(N(p.frame, 0)) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
            const source = Rectangle.new(0, frame * frameHeight, Math.floor(N(texture.Width, 1)), frameHeight);
            const position = Vector2.new(
                N(rect.X) + N(rect.Width) * 0.5 - N(Terraria.Main.screenPosition?.X),
                N(rect.Y) + N(rect.Height) * 0.5 - N(Terraria.Main.screenPosition?.Y)
            );
            const origin = Vector2.new(N(texture.Width) * 0.5, frameHeight * 0.5);
            let color = lightColor;
            try { color = p.GetAlpha(lightColor); } catch (e) { }
            draw(texture, position, source, color, N(p.rotation), origin, Math.max(0.01, N(p.scale, 1)), SpriteEffects.None, 0);
            if (!this.DrawLogged) {
                this.DrawLogged = true;
                try { tl.log(`[CalamityPort Statigel] dedicated Baby Slime visible renderer active; type=${this.Type}; AIType=266; minionSlots=0.`); } catch (e) { }
            }
            return false;
        } catch (e) {
            if (!this.DrawFallbackLogged) {
                this.DrawFallbackLogged = true;
                try { tl.log(`[CalamityPort Statigel] dedicated Baby Slime draw exception: ${e}`); } catch (_) { }
            }
            return true;
        }
    }

    CanDamage() {
        return true;
    }

    MinionContactDamage() {
        return true;
    }

    OnHitNPC(p, npc) {
        if (!this.HitLogged) {
            this.HitLogged = true;
            try { tl.log(`[CalamityPort 12.84.3] Baby Slime contact hit reached; type=${p.type}; damage=${p.damage}; target=${npc?.type}.`); } catch (e) { }
        }
    }

    OnTileCollide() {
        return false;
    }
}

export class CrimsonSlimeGodMinion extends BabySlimeGodMinionBase {
    constructor() {
        super('Projectiles/Summon/CrimslimeMinion', 'Textures/Projectiles/Summon/CrimslimeMinion.png');
    }
}

export class CorruptionSlimeGodMinion extends BabySlimeGodMinionBase {
    constructor() {
        super('Projectiles/Summon/CorroslimeMinion', 'Textures/Projectiles/Summon/CorroslimeMinion.png');
    }
}
