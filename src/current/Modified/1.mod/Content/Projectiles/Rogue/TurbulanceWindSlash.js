import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Vector2 } = Modules;

// Per-projectile state. Keep this in typed arrays so a large stealth trail does not
// allocate JS objects every update on Android.
const targetIndex = new Int16Array(1000);
const trailSlashFlag = new Uint8Array(1000);
const homeFlag = new Uint8Array(1000);

// Shared mobile broadphase. The official helper scans all active NPCs every homing
// update. A stealth Turbulance can leave many slashes at once, so all slashes share
// one candidate snapshot instead of each crossing the JS/native bridge 200 times.
const candidateIndex = new Int16Array(200);
const candidateX = new Float32Array(200);
const candidateY = new Float32Array(200);
const candidateExtraRange = new Float32Array(200);
let candidateCount = 0;
let lastCandidateScanTick = -999999;
let WindType = 0;

function idx(p) {
    const n = Number(p && p.whoAmI);
    return Number.isFinite(n) ? n | 0 : -1;
}

function readNPC(i) {
    if (!(i >= 0 && i < 200)) return null;
    try { return Terraria.Main.npc.get_Item(i); } catch (e) { }
    try { return Terraria.Main.npc[i]; } catch (e) { }
    return null;
}

function validBase(n, p) {
    if (!n || !n.active || n.friendly || n.townNPC || n.dontTakeDamage || Number(n.life) <= 0 || Number(n.lifeMax) <= 5)
        return false;
    try {
        if (!n['bool CanBeChasedBy(object attacker, bool ignoreDontTakeDamage)'](p, false)) return false;
    } catch (e) { }
    return true;
}

function refreshCandidates(p) {
    const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
    if (tick - lastCandidateScanTick < 6) return;
    lastCandidateScanTick = tick;
    candidateCount = 0;

    ScanFrozenCubeNPCs(4);
    const slots = FrozenCubeTrackedIndices();
    for (let k = 0; k < slots.length; k++) {
        const i = Number(slots[k]);
        const n = FrozenCubeNPC(i);
        if (!validBase(n, p)) continue;
        let c = null;
        try { c = n.Center; } catch (e) { }
        if (!c) continue;
        const slot = candidateCount++;
        candidateIndex[slot] = i;
        candidateX[slot] = Number(c.X) || 0;
        candidateY[slot] = Number(c.Y) || 0;
        candidateExtraRange[slot] = (Math.max(0, Number(n.width) || 0) + Math.max(0, Number(n.height) || 0)) * 0.5;
        if (candidateCount >= 200) break;
    }
}

function targetStillValid(p, i, range) {
    const n = readNPC(i);
    if (!validBase(n, p)) return null;
    let c = null;
    try { c = n.Center; } catch (e) { }
    if (!c) return null;
    const dx = Number(c.X) - Number(p.Center.X);
    const dy = Number(c.Y) - Number(p.Center.Y);
    const extra = (Math.max(0, Number(n.width) || 0) + Math.max(0, Number(n.height) || 0)) * 0.5;
    const r = range + extra;
    if (dx * dx + dy * dy > r * r) return null;
    return n;
}

function acquireNearest(p, range) {
    refreshCandidates(p);
    const cx = Number(p.Center.X) || 0;
    const cy = Number(p.Center.Y) || 0;
    let best = -1;
    let bestSq = Number.POSITIVE_INFINITY;

    for (let k = 0; k < candidateCount; k++) {
        const dx = Number(candidateX[k]) - cx;
        const dy = Number(candidateY[k]) - cy;
        const d2 = dx * dx + dy * dy;
        const r = range + Number(candidateExtraRange[k]);
        if (d2 <= r * r && d2 < bestSq) {
            bestSq = d2;
            best = Number(candidateIndex[k]);
        }
    }
    return best;
}

function wind(npc) {
    if (!(WindType > 0)) WindType = Number(ModBuff.getTypeByName('WindChilled') || 0);
    if (WindType > 0 && npc) {
        try { npc['void AddBuff(int type, int time, bool quiet)'](Math.floor(WindType), 120, false); } catch (e) { }
    }
}

function homeToward(p, target) {
    const tc = target.Center;
    const pc = p.Center;
    const dx = Number(tc.X) - Number(pc.X);
    const dy = Number(tc.Y) - Number(pc.Y);
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const desiredX = dx / d * 8;
    const desiredY = dy / d * 8;
    const vx = Number(p.velocity.X) || 0;
    const vy = Number(p.velocity.Y) || 0;

    // Exact Calamity HomeInOnNPC steering constants: homingVelocity=8, inertia=20.
    p.velocity = Vector2.new((vx * 20 + desiredX) / 21, (vy * 20 + desiredY) / 21);
}

export class TurbulanceWindSlash extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Rogue/TurbulanceWindSlash';
    }

    SetStaticDefaults() {
        try { Terraria.Main.projFrames[this.Type] = 4; } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 10;
        p.height = 10;
        // Source projectile is always friendly. Its first 40 ticks are made harmless
        // by CanHitNPC in C#; TLPro exposes CanDamage, which is the correct emulation.
        p.friendly = true;
        p.penetrate = 1;
        p.extraUpdates = 0;
        p.alpha = 255;
        p.ignoreWater = true;
        p.timeLeft = 240;
    }

    OnSpawn(p) {
        const s = idx(p);
        if (s < 0 || s >= 1000) return;
        targetIndex[s] = -1;
        const ai = new ProjAI(p, false);
        trailSlashFlag[s] = Number(ai[0]) === 1 ? 1 : 0;
        homeFlag[s] = Number(ai[1]) === 1 ? 1 : 0;
    }

    CanDamage(p) {
        // Official CanHitNPC condition: timeLeft < 200.
        return Number(p.timeLeft) < 200;
    }

    AI(p) {
        const s = idx(p);
        const trailSlash = s >= 0 && trailSlashFlag[s] === 1;
        const shouldHome = s >= 0 && homeFlag[s] === 1;

        p.velocity = Vector2.new(Number(p.velocity.X) * 0.99, Number(p.velocity.Y) * 0.99);
        p.alpha = Math.max(0, Number(p.alpha) - 30);
        p.frameCounter = Number(p.frameCounter) + 1;
        if (p.frameCounter > 1) {
            p.frameCounter = 0;
            p.frame = (Number(p.frame) + 1) % 4;
        }

        if (trailSlash)
            p.rotation = Math.atan2(Number(p.velocity.Y), Number(p.velocity.X)) - Math.PI / 2;

        if (!shouldHome) {
            if (Number(p.extraUpdates) !== 0) p.extraUpdates = 0;
            return;
        }

        const range = trailSlash ? 900 : 450;
        let target = s >= 0 ? targetStillValid(p, Number(targetIndex[s]), range) : null;
        if (!target) {
            const found = acquireNearest(p, range);
            if (s >= 0) targetIndex[s] = found;
            target = targetStillValid(p, found, range);
        }

        if (!target) {
            if (Number(p.extraUpdates) !== 0) p.extraUpdates = 0;
            return;
        }

        // The official Calamity helper adds one extra update only while a target exists.
        // Target acquisition is shared/cached, so the additional update is cheap and
        // restores the original responsiveness without the 13.10.2/13.10.3 scan cost.
        if (Number(p.extraUpdates) !== 1) p.extraUpdates = 1;
        homeToward(p, target);
    }

    OnHitNPC(p, npc) { wind(npc); }

    OnKill(p) {
        const s = idx(p);
        if (s >= 0 && s < 1000) {
            targetIndex[s] = -1;
            trailSlashFlag[s] = 0;
            homeFlag[s] = 0;
        }
    }
}
