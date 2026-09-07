import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { AndroidSound } from './../../../Common/Snippets/AndroidSound.js';
import { GraniteShrineAccessoryRuntime } from './../../../Core/GraniteShrineAccessoryRuntime.js';
import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js';

const { Vector2, Color } = Modules;
const TRAIL_LENGTH = 24;
const FAST_VFX_POINTS = 7;
const States = new Map();
let LoggedDrawPath = false;
let LoggedImpactLinger = false;
let LoggedMobilePerf = false;
let ArcAlphaColor = null;
let BeamColor = null;
let HeadColor = null;
let CoreColor = null;
const ProjectileKill = 'void Kill()';
const ProjectileGetRect = 'Rectangle getRect()';
const ProjectileResize = 'void Resize(int newWidth, int newHeight)';
const ProjectileUpdatePosition = 'void UpdatePosition(Vector2 wetVelocity)';
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function StateKey(projectile) {
    const owner = Math.floor(Number(projectile && projectile.owner));
    const identity = Math.floor(Number(projectile && projectile.identity));
    return `${owner}:${identity}`;
}
function CreateState(projectile) {
    return {
        identity: Math.floor(Number(projectile && projectile.identity)),
        ableToHit: false,
        initialized: false,
        trail: [],
        impactLinger: false,
        chainSpawned: false,
        soundPlayed: false,
        aiCached: false,
        targetIndex: -1,
        chainsRemaining: 0,
        initialVelocityApplied: false,
        vx: 0,
        vy: -2,
        sampleX: new Array(FAST_VFX_POINTS),
        sampleY: new Array(FAST_VFX_POINTS),
        impactBurstSpawned: false
    };
}
function ProjectileRect(projectile) {
    try {
        const getRect = projectile && projectile[ProjectileGetRect];
        if (typeof getRect === 'function') {
            const rect = getRect();
            if (rect) return rect;
        }
    } catch (e) { }
    return null;
}
function ProjectileCenterXY(projectile) {
    const rect = ProjectileRect(projectile);
    return rect ? {
        X: Number(rect.X) + Number(rect.Width) * 0.5,
        Y: Number(rect.Y) + Number(rect.Height) * 0.5
    } : { X: 0, Y: 0 };
}
function EntityCenterXY(entity) {
    const position = entity && entity.position;
    return {
        X: Number(position && position.X) + Number(entity && entity.width) * 0.5,
        Y: Number(position && position.Y) + Number(entity && entity.height) * 0.5
    };
}
function MoveProjectile(projectile, dx, dy) {
    try {
        const updatePosition = projectile && projectile[ProjectileUpdatePosition];
        if (typeof updatePosition === 'function') {
            updatePosition(Vector2.new(Number(dx) || 0, Number(dy) || 0));
            return true;
        }
    } catch (e) { }
    return false;
}
function HydrateAI(projectile, state) {
    if (!state || state.aiCached)
        return state;
    const ai = new ProjAI(projectile);
    const localAI = new ProjAI(projectile, true);
    state.targetIndex = Math.floor(Number(ai[0]));
    state.chainsRemaining = Number(ai[1]) || 0;
    state.initialVelocityApplied = Number(localAI[0]) !== 0;
    state.aiCached = true;
    return state;
}
function State(projectile) {
    const key = StateKey(projectile);
    let state = States.get(key);
    const identity = Math.floor(Number(projectile.identity));
    if (!state || state.identity !== identity) {
        state = CreateState(projectile);
        States.set(key, state);
    }
    return state;
}
function RecordTrail(projectile, state) {
    const rect = ProjectileRect(projectile);
    if (!rect)
        return;
    const x = Number(rect.X);
    const y = Number(rect.Y);
    if (!Number.isFinite(x) || !Number.isFinite(y))
        return;
    const first = state.trail[0];
    if (!first || Math.abs(first.X - x) > 0.01 || Math.abs(first.Y - y) > 0.01)
        state.trail.unshift({ X: x, Y: y });
    if (state.trail.length > TRAIL_LENGTH)
        state.trail.length = TRAIL_LENGTH;
}
function Overlap(projectile, npc) {
    const rect = ProjectileRect(projectile);
    if (!rect)
        return false;
    return Number(rect.X) < Number(npc.position.X) + Number(npc.width) &&
        Number(rect.X) + Number(rect.Width) > Number(npc.position.X) &&
        Number(rect.Y) < Number(npc.position.Y) + Number(npc.height) &&
        Number(rect.Y) + Number(rect.Height) > Number(npc.position.Y);
}
function Source(projectile) {
    // GetProjectileSource_FromThis also enters the expensive native reflection
    // path on this bridge. Null is accepted by NewProjectile here.
    return null;
}
function PlayChainSound(projectile, state) {
    if (state && state.soundPlayed)
        return;
    if (state)
        state.soundPlayed = true;
    const variant = 1 + Math.floor(Math.random() * 4);
    const center = ProjectileCenterXY(projectile);
    AndroidSound.PlayOneShot(`Sounds/Custom/ChainLightning${variant}.ogg`, 0.15, center.X, center.Y, 1200, 90);
}
function BeginImpactLinger(projectile, target, state, arcZap) {
    if (state.impactLinger)
        return;
    state.ableToHit = false;
    state.impactLinger = true;
    HydrateAI(projectile, state);
    if (!state.chainSpawned && Number(state.chainsRemaining) > 1) {
        state.chainSpawned = true;
        arcZap.SpawnArc(projectile, Number(state.chainsRemaining));
    }
    PlayChainSound(projectile, state);
    projectile.friendly = false;
    projectile.damage = 0;
    projectile.penetrate = -1;
    projectile.extraUpdates = 0;
    state.vx = 0;
    state.vy = 0;
    const targetCenter = EntityCenterXY(target);
    if (!state.impactBurstSpawned && FusionVFXSystem.Enabled) {
        state.impactBurstSpawned = true;
        try {
            FusionVFXSystem.SpawnLayeredBurst(
                { x: targetCenter.X, y: targetCenter.Y },
                24,
                { r: 65, g: 235, b: 255, a: 235 },
                22,
                { variant: 3, sizeEnd: 72, rotVel: 0.07, pulseAmp: 0.08, fadeIn: 1, fadeOut: 16, priority: 2 }
            );
        } catch (_) { }
    }
    const rect = ProjectileRect(projectile);
    if (rect) {
        const desiredX = targetCenter.X - Number(rect.Width) * 0.5;
        const desiredY = targetCenter.Y - Number(rect.Height) * 0.5;
        MoveProjectile(projectile, desiredX - Number(rect.X), desiredY - Number(rect.Y));
    }
    // Damage and chaining already happened. Reserve enough update budget to
    // survive the remainder of the current 16-update tick and still remain on
    // screen for several normal render frames.
    projectile.timeLeft = 12;
    if (!LoggedImpactLinger) {
        LoggedImpactLinger = true;
        try { tl.log('[CalamityPort ArcZap] impact visual linger active (12-update budget).'); } catch (e) { }
    }
}

export class ArcZap extends ModProjectile {
    constructor() {
        super();
        // The official projectile uses InvisibleProj and draws
        // SmallGreyscaleCircle manually. TLPro reliably registers projectile
        // textures from this conventional folder, so this file is an exact copy
        // of the official SmallGreyscaleCircle and is used by PreDraw below.
        this.Texture = 'Projectiles/Typeless/ArcZap';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = TRAIL_LENGTH;
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0;
        } catch (e) { }
    }

    SetDefaults() {
        const projectile = this.Projectile;
        try {
            const resize = projectile[ProjectileResize];
            if (typeof resize === 'function')
                resize(10, 10);
        } catch (e) { }
        projectile.friendly = true;
        projectile.hostile = false;
        projectile.ignoreWater = true;
        projectile.tileCollide = false;
        projectile.hide = false;
        // The official trail is drawn manually. This visible registered circle
        // remains enabled as an Android renderer fallback.
        projectile.alpha = 0;
        projectile.scale = 0.15;
        projectile.penetrate = 3;
        projectile.timeLeft = 120;
        projectile.extraUpdates = 15;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = -1;
        projectile.armorPenetration = 25;
    }

    CanDamage(projectile) {
        return State(projectile).ableToHit === true;
    }

    GetAlpha(projectile, lightColor) {
        if (!ArcAlphaColor)
            ArcAlphaColor = Color.new(40, 235, 255, 210);
        return ArcAlphaColor;
    }

    AI(projectile) {
        const state = HydrateAI(projectile, State(projectile));
        RecordTrail(projectile, state);
        const targetIndex = Math.floor(Number(state.targetIndex));
        const target = targetIndex >= 0 && targetIndex < 200 ? Terraria.Main.npc[targetIndex] : null;
        if (state.impactLinger) {
            state.ableToHit = false;
            projectile.friendly = false;
            state.vx = 0;
            state.vy = 0;
            if (target && target.active) {
                const targetCenter = EntityCenterXY(target);
                const rect = ProjectileRect(projectile);
                if (rect) {
                    const desiredX = targetCenter.X - Number(rect.Width) * 0.5;
                    const desiredY = targetCenter.Y - Number(rect.Height) * 0.5;
                    MoveProjectile(projectile, desiredX - Number(rect.X), desiredY - Number(rect.Y));
                }
            }
            const center = ProjectileCenterXY(projectile);
            return;
        }
        if (!target || !target.active) {
            try { projectile[ProjectileKill](); } catch (e) { }
            return;
        }

        const targetCenter = EntityCenterXY(target);
        const projectileCenter = ProjectileCenterXY(projectile);
        const dx = targetCenter.X - projectileCenter.X;
        const dy = targetCenter.Y - projectileCenter.Y;

        if (!state.initialVelocityApplied) {
            state.vx += dx / 90;
            state.vy += dy / 90;
            state.initialVelocityApplied = true;
            // Preserve the native localAI flag for compatibility, but write it
            // only once instead of reading/writing the native array 16x/tick.
            try {
                const localAI = new ProjAI(projectile, true);
                localAI[0] = 1;
            } catch (e) { }
        }

        state.vy += 2 / 45;
        const followX = (Number(target.position.X) - Number(target.oldPosition.X)) / 16;
        const followY = (Number(target.position.Y) - Number(target.oldPosition.Y)) / 16;
        MoveProjectile(projectile, state.vx + followX, state.vy + followY);
        const lightCenter = ProjectileCenterXY(projectile);

        if (Number(projectile.timeLeft) <= 15) {
            const rect = ProjectileRect(projectile);
            if (rect)
                MoveProjectile(projectile, targetCenter.X - Number(rect.X), targetCenter.Y - Number(rect.Y));
        }

        if (Number(projectile.penetrate) === 3) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 20 && Overlap(projectile, target))
                state.ableToHit = true;
            return;
        }
        BeginImpactLinger(projectile, target, state, this);
    }

    SpawnArc(projectile, chainsRemaining) {
        const sourceCenter = ProjectileCenterXY(projectile);
        const targetIndex = GraniteShrineAccessoryRuntime.FindNearestTarget(Vector2.new(sourceCenter.X, sourceCenter.Y), 300);
        if (!(targetIndex >= 0))
            return;
        const selected = Terraria.Main.npc[targetIndex];
        if (!GraniteShrineAccessoryRuntime.CanChase(selected))
            return;
        GraniteShrineAccessoryRuntime.SetArcCooldown(selected, 18);
        const sourceRect = ProjectileRect(projectile);
        const spawnX = sourceRect ? Number(sourceRect.X) : 0;
        const spawnY = sourceRect ? Number(sourceRect.Y) - 10 : 0;
        NewProjectile(
            Source(projectile),
            Vector2.new(spawnX, spawnY),
            Vector2.Zero,
            this.Type,
            Math.max(1, Math.floor(Number(projectile.damage) || 1)),
            0,
            Math.floor(Number(projectile.owner)),
            targetIndex,
            chainsRemaining - 1,
            0,
            null
        );
    }

    OnKill(projectile, timeLeft) {
        const state = State(projectile);
        PlayChainSound(projectile, state);
        States.delete(StateKey(projectile));
    }

    PreDraw(projectile, lightColor) {
        try {
            const status = FusionVFXSystem.GetTextureStatus();
            if (!status || status.ready !== true)
                return true;

            const state = State(projectile);
            const rect = ProjectileRect(projectile);
            const points = state.trail;
            const count = points.length > 0 ? Math.min(TRAIL_LENGTH, points.length) : 1;
            if (count <= 0)
                return true;

            const halfWidth = Number(projectile.width) * 0.5;
            const halfHeight = Number(projectile.height) * 0.5;
            const quality = FusionVFXSystem.GetQualityProfile();
            const wantedSamples = Math.max(3, Math.min(FAST_VFX_POINTS, Number(quality.arcTrailPoints) || FAST_VFX_POINTS));
            const samples = Math.min(wantedSamples, count);
            const step = samples > 1 ? (count - 1) / (samples - 1) : 0;
            let sampleCount = 0;

            for (let sample = 0; sample < samples; sample++) {
                const index = Math.min(count - 1, Math.floor(sample * step));
                const point = points.length > 0 ? points[index] : null;
                const px = point ? Number(point.X) : (rect ? Number(rect.X) : 0);
                const py = point ? Number(point.Y) : (rect ? Number(rect.Y) : 0);
                const x = px + halfWidth;
                const y = py + halfHeight + Number(projectile.gfxOffY || 0);
                if (!Number.isFinite(x) || !Number.isFinite(y))
                    continue;
                state.sampleX[sampleCount] = x;
                state.sampleY[sampleCount] = y;
                sampleCount++;
            }

            if (sampleCount <= 0)
                return true;

            const time = Number(projectile.timeLeft) || 0;
            const pulse = 0.82 + 0.18 * Math.cos(time / 7);
            if (!BeamColor) BeamColor = Color.new(0, 215, 255, 0);
            if (!HeadColor) HeadColor = Color.new(65, 235, 255, 0);
            if (!CoreColor) CoreColor = Color.new(190, 250, 255, 0);
            BeamColor.G = Math.floor(215 * pulse);
            BeamColor.B = Math.floor(255 * pulse);
            HeadColor.G = Math.floor(235 * pulse);
            let draws = 0;

            for (let i = 0; i < sampleCount - 1; i++) {
                const taper = 1 - i / Math.max(1, sampleCount - 1);
                const width = 2.2 + taper * 3.8;
                if (FusionVFXSystem.DrawImmediateBeam(
                    state.sampleX[i], state.sampleY[i],
                    state.sampleX[i + 1], state.sampleY[i + 1],
                    width, BeamColor, 0.92, true
                )) draws++;
            }

            const headX = state.sampleX[0];
            const headY = state.sampleY[0];
            if (FusionVFXSystem.DrawImmediateSprite('bloom', headX, headY, 26 * pulse, 26 * pulse, HeadColor, 0.88, 0, true))
                draws++;
            if (FusionVFXSystem.DrawImmediateSprite('tiny', headX, headY, 10 * pulse, 10 * pulse, CoreColor, 1, 0, true))
                draws++;

            if (state.impactLinger && quality.level === 0) {
                if (FusionVFXSystem.DrawImmediateSprite('ring', headX, headY, 30 * pulse, 30 * pulse, HeadColor, 0.72, time * 0.08, true))
                    draws++;
            }

            if (!LoggedDrawPath && draws > 0) {
                LoggedDrawPath = true;
                try { tl.log(`[CalamityPort ArcZap] FusionVFX2 beam renderer active; calls=${draws}.`); } catch (e) { }
            }
            if (!LoggedMobilePerf && draws > 0) {
                LoggedMobilePerf = true;
                try { tl.log(`[CalamityPort ArcZapPerf] FusionVFX2 points<=${wantedSamples}; pooled native draw temps; impact burst enabled; native fallback suppressed.`); } catch (e) { }
            }

            return draws <= 0;
        } catch (e) {
            return true;
        }
    }
}
