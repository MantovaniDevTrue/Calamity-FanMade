import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];

const states = new Array(1000);
const sharedNPCs = new Array(64);
let sharedNPCCount = 0;
let sharedNPCRefreshTick = -9999;
let WindType = 0;

function idx(p) {
    const n = Number(p && p.whoAmI);
    return Number.isFinite(n) ? n | 0 : -1;
}

function tickNow() {
    try { return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0); } catch (e) { return 0; }
}

function addWind(npc, duration) {
    if (!(WindType > 0)) WindType = Number(ModBuff.getTypeByName('WindChilled') || 0);
    if (WindType > 0 && npc) {
        try { npc['void AddBuff(int type, int time, bool quiet)'](Math.floor(WindType), duration, false); } catch (e) { }
    }
}

function basicValidNPC(npc, p) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.life) <= 0 || Number(npc.lifeMax) <= 5) return false;
    try { if (npc.boss) return false; } catch (e) { }
    try { return !!npc['bool CanBeChasedBy(object attacker, bool ignoreDontTakeDamage)'](p, false); } catch (e) { return true; }
}

// One 200-NPC bridge scan is shared by every active Cyclone for 12 game ticks.
// The old 13.10.2 path performed the whole scan separately for each projectile.
function refreshSharedNPCs(p, tick) {
    if (tick - sharedNPCRefreshTick < 12) return;
    sharedNPCRefreshTick = tick;
    sharedNPCCount = 0;
    ScanFrozenCubeNPCs(4);
    const slots = FrozenCubeTrackedIndices();
    for (let k = 0; k < slots.length && sharedNPCCount < sharedNPCs.length; k++) {
        const npc = FrozenCubeNPC(slots[k]);
        if (!basicValidNPC(npc, p)) continue;
        sharedNPCs[sharedNPCCount++] = npc;
    }
    for (let i = sharedNPCCount; i < sharedNPCs.length; i++) sharedNPCs[i] = null;
}

function rebuildLocalTargets(st, p, tick) {
    refreshSharedNPCs(p, tick);
    st.targets.length = 0;
    const px = Number(p.position.X) + Number(p.width) * 0.5;
    const py = Number(p.position.Y) + Number(p.height) * 0.5;
    // Source uses Manhattan distance < 600. No per-target LOS bridge call here: that was
    // the dominant Android hotpath and also prevented the pull from being observable.
    for (let i = 0; i < sharedNPCCount && st.targets.length < 20; i++) {
        const npc = sharedNPCs[i];
        if (!npc || !npc.active) continue;
        const nx = Number(npc.position.X) + Number(npc.width) * 0.5;
        const ny = Number(npc.position.Y) + Number(npc.height) * 0.5;
        if (Math.abs(px - nx) + Math.abs(py - ny) < 600) st.targets.push(npc);
    }
    st.nextTargetRefresh = tick + 12;
}

export class Cyclone extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/Cyclone';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 56;
        p.height = 56;
        p.alpha = 255;
        p.friendly = true;
        p.melee = true;
        // Keep the 13.10.2 single-update movement optimization. Pull is now accumulated
        // continuously from cached targets, rather than doing an expensive scan every tick.
        p.timeLeft = 100;
        p.extraUpdates = 0;
        p.penetrate = 2;
        p.ignoreWater = true;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = -1;
        p.tileCollide = false;
    }

    OnSpawn(p) {
        p.velocity = Vector2.new(Number(p.velocity.X) * 3, Number(p.velocity.Y) * 3);
        const s = idx(p);
        if (s >= 0 && s < states.length) {
            states[s] = {
                dust: Math.abs(s) % 12,
                vortex: 0,
                tileProbe: 0,
                nextTargetRefresh: 0,
                targets: []
            };
        }
    }

    AI(p) {
        const s = idx(p);
        let st = (s >= 0 && s < states.length) ? states[s] : null;
        if (!st) {
            st = { dust: 0, vortex: 0, tileProbe: 0, nextTargetRefresh: 0, targets: [] };
            if (s >= 0 && s < states.length) states[s] = st;
        }

        p.rotation = Number(p.rotation) + 7.5;
        p.alpha = Math.max(50, Number(p.alpha) - 15);

        // Tile collision probe is deliberately sparse.
        if (!p.tileCollide) {
            st.tileProbe--;
            if (st.tileProbe <= 0) {
                st.tileProbe = 4;
                let solid = true;
                try { solid = !!SolidCollision(p.position, p.width, p.height); } catch (e) { }
                if (!solid) p.tileCollide = true;
            }
        }

        const tick = tickNow();
        if (tick >= Number(st.nextTargetRefresh || 0)) rebuildLocalTargets(st, p, tick);

        // Official force is 0.05 per sub-update with extraUpdates=2 => 0.15 per game tick.
        // Apply that exact accumulated force every tick to the cheap cached target list so NPC
        // AI cannot erase a single large pulse before the next scan.
        const px = Number(p.position.X) + Number(p.width) * 0.5;
        const py = Number(p.position.Y) + Number(p.height) * 0.5;
        const targets = st.targets;
        for (let i = targets.length - 1; i >= 0; i--) {
            const npc = targets[i];
            if (!npc || !npc.active || npc.friendly || npc.dontTakeDamage || Number(npc.life) <= 0) {
                targets.splice(i, 1);
                continue;
            }
            const nx = Number(npc.position.X) + Number(npc.width) * 0.5;
            const ny = Number(npc.position.Y) + Number(npc.height) * 0.5;
            if (Math.abs(px - nx) + Math.abs(py - ny) >= 640) continue;
            const v = npc.velocity;
            const vx = Number(v.X) + (nx < px ? 0.15 : -0.15);
            const vy = Number(v.Y) + (ny < py ? 0.15 : -0.15);
            npc.velocity = Vector2.new(vx, vy);
        }

        // Cosmetic vortex: two dusts every 12 ticks instead of three every 10.
        st.dust++;
        if (p.alpha <= 50 && st.dust >= 12) {
            st.dust = 0;
            for (let i = 0; i < 2; i++) {
                const a = (st.vortex + i * 180) * Math.PI / 180;
                try {
                    const d = NewDust(p.Center, Math.floor(p.width / 2), Math.floor(p.height / 2), 31,
                        Math.cos(a) * 4.24, Math.sin(a) * 4.24, 200, Color.White, 1.1);
                    if (d >= 0) Terraria.Main.dust[d].noGravity = true;
                } catch (e) { }
            }
            st.vortex = (st.vortex + 35) % 360;
        }
    }

    GetAlpha(p, lightColor) {
        try { return Color.new(204, 255, 255, Math.max(0, Math.min(255, Number(p.alpha)))); }
        catch (e) { return lightColor; }
    }

    OnHitNPC(p, npc) { addWind(npc, 180); }

    OnKill(p) {
        const s = idx(p);
        if (s >= 0 && s < states.length) states[s] = null;
        // Purely cosmetic mobile budget.
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI * 2 / 12;
            try {
                const d = NewDust(p.Center, p.width, p.height, 31, Math.cos(a) * 4.24, Math.sin(a) * 4.24, 200, Color.White, 1.2);
                if (d >= 0) Terraria.Main.dust[d].noGravity = true;
            } catch (e) { }
        }
    }
}
