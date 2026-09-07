// Mobile-first virtual worm runtime.
// A worm owns one real NPC. Body/tail segments are sampled from the head's
// movement trail and exist only as lightweight JS geometry for drawing.
// This avoids consuming NPC slots / AI / global hooks for dozens of segments.

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function B(v) { if (v === true) return true; if (v === false || v == null) return false; try { const n = Number(v); if (Number.isFinite(n)) return n !== 0; } catch (e) { } return String(v).toLowerCase() === 'true'; }

function center(npc) {
    return {
        x: N(npc?.position?.X) + N(npc?.width) * 0.5,
        y: N(npc?.position?.Y) + N(npc?.height) * 0.5
    };
}

function ensure(state, visualSegments, capacity) {
    const segs = Math.max(1, I(visualSegments, 1));
    const cap = Math.max(64, I(capacity, 512));
    if (!state.virtualWormX || state.virtualWormCapacity !== cap) {
        state.virtualWormX = new Float32Array(cap);
        state.virtualWormY = new Float32Array(cap);
        state.virtualWormCapacity = cap;
        state.virtualWormCursor = 0;
        state.virtualWormCount = 0;
    }
    if (!state.virtualSegmentX || state.virtualSegmentX.length !== segs) {
        state.virtualSegmentX = new Float32Array(segs);
        state.virtualSegmentY = new Float32Array(segs);
        state.virtualSegmentRotation = new Float32Array(segs);
    }
    return { segs, cap };
}

export function InitVirtualWorm(npc, state, visualSegments = 41, spacing = 16, capacity = 512) {
    const q = ensure(state, visualSegments, capacity);
    const c = center(npc);
    state.virtualWormCursor = 0;
    state.virtualWormCount = 1;
    state.virtualWormSpacing = Math.max(4, N(spacing, 16));
    state.virtualWormX[0] = c.x;
    state.virtualWormY[0] = c.y;
    for (let i = 0; i < q.segs; i++) {
        state.virtualSegmentX[i] = c.x;
        state.virtualSegmentY[i] = c.y + (i + 1) * state.virtualWormSpacing;
        state.virtualSegmentRotation[i] = 0;
    }
}

export function UpdateVirtualWorm(npc, state, visualSegments = 41, spacing = 16, capacity = 512) {
    const q = ensure(state, visualSegments, capacity);
    const c = center(npc);
    const cap = q.cap;
    let cursor = I(state.virtualWormCursor, 0);
    const oldX = N(state.virtualWormX[cursor], c.x);
    const oldY = N(state.virtualWormY[cursor], c.y);
    const movedX = c.x - oldX, movedY = c.y - oldY;
    // Record every frame once the head moved. Keeping every point gives smooth
    // curves at low Oarfish speeds while the fixed ring prevents allocations.
    if (state.virtualWormCount <= 1 || movedX * movedX + movedY * movedY > 0.01) {
        cursor = (cursor + 1) % cap;
        state.virtualWormCursor = cursor;
        state.virtualWormX[cursor] = c.x;
        state.virtualWormY[cursor] = c.y;
        state.virtualWormCount = Math.min(cap, I(state.virtualWormCount, 0) + 1);
    } else {
        state.virtualWormX[cursor] = c.x;
        state.virtualWormY[cursor] = c.y;
    }

    const targetSpacing = Math.max(4, N(spacing, state.virtualWormSpacing || 16));
    state.virtualWormSpacing = targetSpacing;
    const count = Math.max(1, I(state.virtualWormCount, 1));
    let prevX = c.x, prevY = c.y;
    let trailIndex = cursor;
    let accumulated = 0;
    let nextDistance = targetSpacing;
    let out = 0;

    for (let step = 1; step < count && out < q.segs; step++) {
        const idx = (cursor - step + cap) % cap;
        const x = N(state.virtualWormX[idx], prevX);
        const y = N(state.virtualWormY[idx], prevY);
        const dx = x - prevX, dy = y - prevY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.0001) {
            while (out < q.segs && accumulated + d >= nextDistance) {
                const t = (nextDistance - accumulated) / d;
                const sx = prevX + dx * t;
                const sy = prevY + dy * t;
                state.virtualSegmentX[out] = sx;
                state.virtualSegmentY[out] = sy;
                state.virtualSegmentRotation[out] = Math.atan2(prevY - sy, prevX - sx) + Math.PI * 0.5;
                out++;
                nextDistance += targetSpacing;
            }
            accumulated += d;
        }
        prevX = x; prevY = y; trailIndex = idx;
    }

    // During the first seconds after spawning there is not enough history for
    // the full body. Extend the missing tail backwards using the oldest tangent.
    if (out < q.segs) {
        let tx = prevX, ty = prevY;
        let dirX = 0, dirY = 1;
        const vx = N(npc?.velocity?.X), vy = N(npc?.velocity?.Y);
        const vl = Math.sqrt(vx * vx + vy * vy);
        if (vl > 0.01) { dirX = -vx / vl; dirY = -vy / vl; }
        else if (out > 0) {
            const ax = out === 1 ? c.x : N(state.virtualSegmentX[out - 2]);
            const ay = out === 1 ? c.y : N(state.virtualSegmentY[out - 2]);
            const bx = N(state.virtualSegmentX[out - 1]);
            const by = N(state.virtualSegmentY[out - 1]);
            const dx = bx - ax, dy = by - ay, dl = Math.sqrt(dx * dx + dy * dy) || 1;
            dirX = dx / dl; dirY = dy / dl;
            tx = bx; ty = by;
        }
        while (out < q.segs) {
            tx += dirX * targetSpacing;
            ty += dirY * targetSpacing;
            state.virtualSegmentX[out] = tx;
            state.virtualSegmentY[out] = ty;
            state.virtualSegmentRotation[out] = Math.atan2(-dirY, -dirX) + Math.PI * 0.5;
            out++;
        }
    }
    state.virtualWormReady = true;
    state.virtualWormTrailIndex = trailIndex;
    if (state.virtualDamageEnabled === true) refreshDamageTarget(npc, state);
    return state;
}

export function GetVirtualWormGeometry(state) {
    if (!state || state.virtualWormReady !== true) return null;
    return {
        x: state.virtualSegmentX,
        y: state.virtualSegmentY,
        rotation: state.virtualSegmentRotation,
        count: state.virtualSegmentX ? state.virtualSegmentX.length : 0
    };
}


// Active single-entity worm hurtboxes. Only opted-in worms are registered.
// Collision geometry stays in JS; the real head is moved only for the duration
// of a synchronous native damage pass, then restored immediately.
const ActiveVirtualWormTargets = new Array(200);
const ActiveVirtualWormSlots = new Set();

function rectParts(rect) {
    if (!rect) return null;
    const x = I(rect.X, 0), y = I(rect.Y, 0);
    const w = Math.max(1, I(rect.Width, 1)), h = Math.max(1, I(rect.Height, 1));
    return { x, y, w, h, r: x + w, b: y + h };
}
function rectOverlap(a, x, y, w, h) {
    return !!a && a.x < x + w && a.r > x && a.y < y + h && a.b > y;
}
function refreshDamageTarget(npc, state) {
    if (!state || state.virtualDamageEnabled !== true || !state.virtualSegmentX) return;
    const slot = I(npc?.whoAmI, -1);
    if (slot < 0 || slot >= ActiveVirtualWormTargets.length) return;
    const px = N(npc?.position?.X), py = N(npc?.position?.Y);
    const w = Math.max(1, I(npc?.width, 1)), h = Math.max(1, I(npc?.height, 1));
    state.virtualHeadX = Math.floor(px); state.virtualHeadY = Math.floor(py);
    state.virtualHeadW = w; state.virtualHeadH = h;
    const bw = Math.max(8, N(state.virtualDamageWidth, w));
    const bh = Math.max(8, N(state.virtualDamageHeight, h));
    state.virtualDamageWidth = bw; state.virtualDamageHeight = bh;
    const hx = bw * 0.5, hy = bh * 0.5;
    let minX = state.virtualHeadX, minY = state.virtualHeadY;
    let maxX = state.virtualHeadX + w, maxY = state.virtualHeadY + h;
    let bodyMinX = Infinity, bodyMinY = Infinity, bodyMaxX = -Infinity, bodyMaxY = -Infinity;
    const xs = state.virtualSegmentX, ys = state.virtualSegmentY;
    for (let i = 0; i < xs.length; i++) {
        const x = N(xs[i]), y = N(ys[i]);
        const left = x - hx, top = y - hy, right = x + hx, bottom = y + hy;
        if (left < minX) minX = left;
        if (top < minY) minY = top;
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
        if (left < bodyMinX) bodyMinX = left;
        if (top < bodyMinY) bodyMinY = top;
        if (right > bodyMaxX) bodyMaxX = right;
        if (bottom > bodyMaxY) bodyMaxY = bottom;
    }
    state.virtualBoundsX = minX; state.virtualBoundsY = minY;
    state.virtualBoundsW = Math.max(1, maxX - minX); state.virtualBoundsH = Math.max(1, maxY - minY);
    // Separate body-only bounds let projectile-heavy weapons reject shots that
    // are nowhere near a virtual segment without entering the segment loop.
    state.virtualBodyBoundsX = Number.isFinite(bodyMinX) ? bodyMinX : minX;
    state.virtualBodyBoundsY = Number.isFinite(bodyMinY) ? bodyMinY : minY;
    state.virtualBodyBoundsW = Number.isFinite(bodyMaxX) ? Math.max(1, bodyMaxX - state.virtualBodyBoundsX) : state.virtualBoundsW;
    state.virtualBodyBoundsH = Number.isFinite(bodyMaxY) ? Math.max(1, bodyMaxY - state.virtualBodyBoundsY) : state.virtualBoundsH;
    let entry = ActiveVirtualWormTargets[slot];
    if (!entry) {
        entry = { npc, state, slot, type: I(npc?.type, -1) };
        ActiveVirtualWormTargets[slot] = entry;
        ActiveVirtualWormSlots.add(slot);
    } else {
        entry.npc = npc; entry.state = state; entry.type = I(npc?.type, -1);
    }
}

export function EnableVirtualWormDamage(npc, state, width = 112, height = 112) {
    if (!state) return;
    state.virtualDamageEnabled = true;
    state.virtualDamageWidth = Math.max(8, N(width, 112));
    state.virtualDamageHeight = Math.max(8, N(height, 112));
    refreshDamageTarget(npc, state);
}

export function DisableVirtualWormDamage(npc, state = null) {
    const slot = I(npc?.whoAmI, -1);
    if (state) state.virtualDamageEnabled = false;
    if (slot >= 0 && slot < ActiveVirtualWormTargets.length) {
        ActiveVirtualWormTargets[slot] = null;
        ActiveVirtualWormSlots.delete(slot);
    }
}

export function HasActiveVirtualWormDamage() {
    return ActiveVirtualWormSlots.size > 0;
}

// Cheap gate used before Projectile.Damage_GetHitbox(). Perforator encounters can
// have many hostile projectiles; asking native Terraria for a damage rectangle
// for every hostile shot was pure overhead because virtual worm bodies are only
// damageable by friendly projectiles. Keep this check to three scalar reads and
// only build/test hitboxes for projectiles that can actually hurt an NPC.
export function CanUseVirtualWormProjectileProxy(projectile) {
    if (ActiveVirtualWormSlots.size === 0 || !projectile) return false;
    try {
        return B(projectile.friendly) && !B(projectile.hostile) && N(projectile.damage) > 0;
    } catch (e) { return false; }
}

// 13.09.9 friendly-projectile broadphase. Ordinary bullets/arrows can call
// Projectile.Damage repeatedly, especially from high-rate weapons. Check only
// the body AABBs first so shots far from every virtual worm never enter the
// per-segment collision path. Invalid entries are cleaned here as well.
export function VirtualWormBodyBroadphaseOverlaps(projectileRect) {
    if (ActiveVirtualWormSlots.size === 0 || !projectileRect) return false;
    const rect = rectParts(projectileRect);
    if (!rect) return false;
    for (const slot of ActiveVirtualWormSlots) {
        const entry = ActiveVirtualWormTargets[slot];
        if (!entry) { ActiveVirtualWormSlots.delete(slot); continue; }
        const state = entry.state, npc = entry.npc;
        if (!state || state.virtualDamageEnabled !== true || !npc) {
            ActiveVirtualWormTargets[slot] = null; ActiveVirtualWormSlots.delete(slot); continue;
        }
        if (rectOverlap(rect, state.virtualBodyBoundsX, state.virtualBodyBoundsY, state.virtualBodyBoundsW, state.virtualBodyBoundsH)) return true;
    }
    return false;
}

function proxyAtSegment(rect, testSegment = null) {
    if (!rect || ActiveVirtualWormSlots.size === 0) return null;
    for (const slot of ActiveVirtualWormSlots) {
        const entry = ActiveVirtualWormTargets[slot];
        if (!entry) { ActiveVirtualWormSlots.delete(slot); continue; }
        const state = entry.state, npc = entry.npc;
        if (!state || state.virtualDamageEnabled !== true || !npc) {
            ActiveVirtualWormTargets[slot] = null; ActiveVirtualWormSlots.delete(slot); continue;
        }
        // Let vanilla hit the real head normally when it is already under the attack.
        if (rectOverlap(rect, state.virtualHeadX, state.virtualHeadY, state.virtualHeadW, state.virtualHeadH)) continue;
        if (!rectOverlap(rect, state.virtualBoundsX, state.virtualBoundsY, state.virtualBoundsW, state.virtualBoundsH)) continue;
        const bw = N(state.virtualDamageWidth, 112), bh = N(state.virtualDamageHeight, 112);
        const hx = bw * 0.5, hy = bh * 0.5;
        const xs = state.virtualSegmentX, ys = state.virtualSegmentY;
        let sx = 0, sy = 0, found = false;
        for (let i = 0; i < xs.length; i++) {
            const cx = N(xs[i]), cy = N(ys[i]);
            const x = cx - hx, y = cy - hy;
            const hit = typeof testSegment === 'function'
                ? testSegment(Math.floor(x), Math.floor(y), Math.ceil(bw), Math.ceil(bh))
                : rectOverlap(rect, x, y, bw, bh);
            if (hit) { sx = cx; sy = cy; found = true; break; }
        }
        if (!found) continue;
        try {
            const pos = npc.position;
            const oldX = N(pos.X), oldY = N(pos.Y);
            pos.X = sx - N(npc.width) * 0.5;
            pos.Y = sy - N(npc.height) * 0.5;
            npc.position = pos;
            if (state.virtualDamageProxyLogged !== true) {
                state.virtualDamageProxyLogged = true;
                try { tl.log('[CalamityPort SingleWorm] first virtual-body native damage proxy hit confirmed.'); } catch (_) { }
            }
            return { npc, oldX, oldY, state };
        } catch (e) { return null; }
    }
    return null;
}

// Projectile.Damage() proxy. This runs before Terraria performs its native NPC
// candidate loop, so a virtual body hit becomes a real hit on the head while all
// vanilla damage, defense, immunity, penetration and OnHit paths remain native.
export function BeginVirtualWormProjectileProxy(projectile, projectileRect, testSegment = null, eligibilityChecked = false) {
    if (ActiveVirtualWormSlots.size === 0 || !projectile) return null;
    if (!eligibilityChecked) {
        try {
            if (!B(projectile.active) || !B(projectile.friendly) || B(projectile.hostile) || N(projectile.damage) <= 0) return null;
        } catch (e) { return null; }
    }
    return proxyAtSegment(rectParts(projectileRect), testSegment);
}

export function EndVirtualWormProjectileProxy(proxy) {
    if (!proxy) return;
    try {
        const pos = proxy.npc.position;
        pos.X = proxy.oldX; pos.Y = proxy.oldY;
        proxy.npc.position = pos;
        // Refresh the cached real-head rectangle immediately after restoration.
        const state = proxy.state;
        state.virtualHeadX = Math.floor(proxy.oldX);
        state.virtualHeadY = Math.floor(proxy.oldY);
    } catch (e) { }
}

// Melee keeps the same native-pass strategy. This hook is only entered during a
// melee item check, so it does not add per-frame projectile collision overhead.
export function BeginVirtualWormMeleeProxy(itemRect) {
    if (ActiveVirtualWormSlots.size === 0) return null;
    const proxy = proxyAtSegment(rectParts(itemRect), null);
    return proxy ? [proxy] : null;
}

export function EndVirtualWormMeleeProxy(restores) {
    if (!restores) return;
    for (let i = 0; i < restores.length; i++) EndVirtualWormProjectileProxy(restores[i]);
}
