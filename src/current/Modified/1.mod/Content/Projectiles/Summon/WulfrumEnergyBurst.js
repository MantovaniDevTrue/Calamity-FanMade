import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { Vector2 } from './../../../TL/Modules/Vector2.js';
import { Rand } from './../../../TL/Modules/Rand.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaledTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const CanHit = Terraria.Collision['bool CanHit(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

const HOMING_RANGE = 350;
const HOMING_ANGLE = Math.PI / 4;
const MAX_PROJECTILES = 1000;
const TARGET_SCAN_UPDATES = 6;

const BurstStates = new Array(MAX_PROJECTILES);
let CachedBurstTexture = null;
let CachedBurstOrigin = null;
let TrailPosition = null;
let TrailScale = null;
let BurstPosition = null;
let BurstScale = null;
let TrailColors = null;

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function WrapAngle(angle) {
    let value = Number(angle);
    while (value > Math.PI)
        value -= Math.PI * 2;
    while (value < -Math.PI)
        value += Math.PI * 2;
    return value;
}

function AngleTowards(current, target, maxChange) {
    const difference = WrapAngle(target - current);
    return current + Clamp(difference, -maxChange, maxChange);
}

function ProjectileSlot(projectile) {
    const slot = Math.floor(Number(projectile.whoAmI));
    return slot >= 0 && slot < MAX_PROJECTILES ? slot : -1;
}

function ProjectileIdentity(projectile) {
    const identity = Number(projectile.identity);
    return Number.isFinite(identity) ? Math.floor(identity) : ProjectileSlot(projectile);
}

function CreateBurstState(projectile) {
    return {
        identity: ProjectileIdentity(projectile),
        owner: Math.floor(Number(projectile.owner)),
        type: Math.floor(Number(projectile.type)),
        initialized: false,
        originalRotation: 0,
        target: -1,
        scan: 0,
        aiCalls: 0,
        scans: 0,
        losChecks: 0
    };
}

function GetBurstState(projectile) {
    const slot = ProjectileSlot(projectile);
    if (slot < 0)
        return CreateBurstState(projectile);
    const identity = ProjectileIdentity(projectile);
    const owner = Math.floor(Number(projectile.owner));
    const type = Math.floor(Number(projectile.type));
    let state = BurstStates[slot];
    if (!state || state.identity !== identity || state.owner !== owner || state.type !== type) {
        state = CreateBurstState(projectile);
        BurstStates[slot] = state;
    }
    return state;
}

function SetVector(vector, x, y) {
    vector.X = Number(x);
    vector.Y = Number(y);
    return vector;
}

function EnsureDrawCache(texture) {
    if (CachedBurstTexture !== texture || !CachedBurstOrigin) {
        CachedBurstTexture = texture;
        CachedBurstOrigin = Vector2.new(Number(texture.Width) * 0.5, Number(texture.Height) * 0.5);
    }
    if (!TrailPosition) {
        TrailPosition = Vector2.new(0, 0);
        TrailScale = Vector2.new(0.85, 0.85);
        BurstPosition = Vector2.new(0, 0);
        BurstScale = Vector2.new(1, 1);
        TrailColors = new Array(5);
        for (let i = 0; i < 5; i++)
            TrailColors[i] = Color.new(125, 255, 80, Math.floor(90 * i / 4));
    }
}

function SpawnDust(projectile, initial = false) {
    const count = initial ? 5 : 1;
    for (let i = 0; i < count; i++) {
        const velocityX = Number(projectile.velocity.X);
        const velocityY = Number(projectile.velocity.Y);
        const rotation = (Math.random() * 2 - 1) * Math.PI / 4;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const speed = initial ? Rand.NextFloat(0.2, 0.5) : -Rand.NextFloat(0.2, 0.5);
        const dustVelocityX = (velocityX * cos - velocityY * sin) * speed;
        const dustVelocityY = (velocityX * sin + velocityY * cos) * speed;
        try {
            const index = NewDust(
                projectile.Center,
                1,
                1,
                178,
                dustVelocityX,
                dustVelocityY,
                0,
                Color.White,
                initial ? Rand.NextFloat(1, 1.2) : Rand.NextFloat(0.6, 1.15)
            );
            if (index >= 0) {
                const dust = Terraria.Main.dust[index];
                if (dust) {
                    dust.noGravity = true;
                    if (!initial && Math.random() < 0.5)
                        dust.noLight = true;
                }
            }
        } catch (e) { }
    }
}

function CanChase(npc) {
    return !!(npc && npc.active && !npc.friendly && !npc.dontTakeDamage && Number(npc.life) > 0);
}

function FindTarget(projectile, state) {
    const velocityX = Number(projectile.velocity.X);
    const velocityY = Number(projectile.velocity.Y);
    const velocityAngle = Math.atan2(velocityY, velocityX);
    let bestIndex = -1;
    let bestScore = 0;
    state.scans++;

    ScanFrozenCubeNPCs(2);
    for (const i of FrozenCubeTrackedIndices()) {
        const npc = FrozenCubeNPC(i);
        if (!CanChase(npc))
            continue;

        const dx = Number(npc.Center.X) - Number(projectile.Center.X);
        const dy = Number(npc.Center.Y) - Number(projectile.Center.Y);
        const centerDistance = Math.sqrt(dx * dx + dy * dy);
        const extraDistance = (Number(npc.width) + Number(npc.height)) * 0.5;
        const distance = centerDistance - extraDistance;
        if (distance >= HOMING_RANGE)
            continue;

        const targetAngle = Math.atan2(dy, dx);
        const angle = Math.abs(WrapAngle(targetAngle - velocityAngle));
        if (angle >= HOMING_ANGLE * 0.5)
            continue;

        const score = 1 - Clamp(distance / HOMING_RANGE, 0, 1) * 0.5 + (1 - Clamp(angle / HOMING_ANGLE, 0, 1)) * 0.5;
        if (score <= bestScore)
            continue;

        let visible = extraDistance >= centerDistance;
        if (!visible) {
            state.losChecks++;
            try {
                visible = CanHit(projectile.Center, 1, 1, npc.Center, 1, 1) !== false;
            } catch (e) {
                visible = true;
            }
        }
        if (!visible)
            continue;

        bestScore = score;
        bestIndex = i;
    }

    return bestIndex;
}

export class WulfrumEnergyBurst extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/WulfrumEnergyBurst';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.MinionShot[this.Type] = true;
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 20;
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0;
        } catch (e) { }
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 8;
        projectile.height = 8;
        projectile.friendly = true;
        projectile.hostile = false;
        projectile.ignoreWater = true;
        projectile.timeLeft = 140;
        projectile.extraUpdates = 2;
        projectile.penetrate = 1;
        projectile.tileCollide = true;
    }

    AI(projectile) {
        const state = GetBurstState(projectile);
        state.aiCalls++;

        if (!state.initialized) {
            state.initialized = true;
            state.originalRotation = Math.atan2(Number(projectile.velocity.Y), Number(projectile.velocity.X));
            projectile.rotation = state.originalRotation;
            state.target = -1;
            state.scan = 1 + (Math.max(0, ProjectileSlot(projectile)) % 3);
            SpawnDust(projectile, true);
        }

        state.scan--;
        if (state.scan <= 0) {
            state.scan = TARGET_SCAN_UPDATES;
            state.target = FindTarget(projectile, state);
            if (Math.random() < 0.5)
                SpawnDust(projectile, false);
        }

        if (state.aiCalls % 3 === 0) {
        }

        const target = state.target >= 0 && state.target < 200 ? Terraria.Main.npc[state.target] : null;
        if (CanChase(target)) {
            const dx = Number(target.Center.X) - Number(projectile.Center.X);
            const dy = Number(target.Center.Y) - Number(projectile.Center.Y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const targetRotation = Math.atan2(dy, dx);
            const turnRate = 0.07 * Math.pow(1 - Clamp(distance / HOMING_RANGE, 0, 1), 2);
            projectile.rotation = AngleTowards(Number(projectile.rotation), targetRotation, turnRate);
        }

        const speed = Math.sqrt(Number(projectile.velocity.X) ** 2 + Number(projectile.velocity.Y) ** 2) * 1.01;
        projectile.velocity.X = Math.cos(Number(projectile.rotation)) * speed;
        projectile.velocity.Y = Math.sin(Number(projectile.rotation)) * speed;
    }

    PreDraw(projectile, lightColor) {
        try {
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            if (!texture)
                return true;
            const draw = Terraria.Main.spriteBatch[DrawScaledTexture];
            if (!draw)
                return true;
            EnsureDrawCache(texture);
            const screenX = Number(Terraria.Main.screenPosition.X);
            const screenY = Number(Terraria.Main.screenPosition.Y);

            try {
                const oldPositions = projectile.oldPos;
                const count = Math.min(10, Number(oldPositions?.Length || 0));
                let colorIndex = 1;
                for (let i = count - 1; i >= 0; i -= 3) {
                    const old = oldPositions[i];
                    if (!old)
                        continue;
                    draw(
                        texture,
                        SetVector(TrailPosition, Number(old.X) + Number(projectile.width) * 0.5 - screenX, Number(old.Y) + Number(projectile.height) * 0.5 - screenY),
                        null,
                        TrailColors[Math.min(4, colorIndex++)],
                        Number(projectile.rotation) + Math.PI / 2,
                        CachedBurstOrigin,
                        TrailScale,
                        SpriteEffects.None,
                        0
                    );
                }
            } catch (e) { }

            const speed = Math.sqrt(Number(projectile.velocity.X) ** 2 + Number(projectile.velocity.Y) ** 2);
            const stretchy = Clamp((speed - 6) / 16, 0, 1);
            draw(
                texture,
                SetVector(BurstPosition, Number(projectile.Center.X) - screenX, Number(projectile.Center.Y) - screenY),
                null,
                lightColor,
                Number(projectile.rotation) + Math.PI / 2,
                CachedBurstOrigin,
                SetVector(BurstScale, 1 - stretchy * 0.2, 1 + stretchy * 0.5),
                SpriteEffects.None,
                0
            );
            return false;
        } catch (e) {
            return true;
        }
    }

    OnKill(projectile, timeLeft) {
        const slot = ProjectileSlot(projectile);
        if (slot >= 0)
            BurstStates[slot] = null;
    }
}
