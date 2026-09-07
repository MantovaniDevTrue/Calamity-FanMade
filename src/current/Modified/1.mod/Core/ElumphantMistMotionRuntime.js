// Reflection-free spawn-motion handoff for Frozen Cube's Elumphant Mist.
// TLPro's NativeObject bridge enumerates Projectile -> Entity -> Object when
// inherited Projectile.velocity / whoAmI / Center members are resolved.
// Keep the original spawn velocity entirely in JavaScript instead.
const PendingByOwner = new Map();
const MAX_PENDING_PER_OWNER = 64;

function OwnerKey(owner) {
    const n = Math.floor(Number(owner));
    return Number.isFinite(n) ? n : -1;
}

export function QueueElumphantMistMotion(owner, vx, vy) {
    const key = OwnerKey(owner);
    let q = PendingByOwner.get(key);
    if (!q) {
        q = [];
        PendingByOwner.set(key, q);
    }
    q.push({ vx: Number(vx) || 0, vy: Number(vy) || 0 });
    if (q.length > MAX_PENDING_PER_OWNER)
        q.splice(0, q.length - MAX_PENDING_PER_OWNER);
}

export function TakeElumphantMistMotion(owner) {
    const key = OwnerKey(owner);
    const q = PendingByOwner.get(key);
    if (!q || q.length === 0)
        return null;
    const motion = q.shift();
    if (q.length === 0)
        PendingByOwner.delete(key);
    return motion;
}

export function ClearElumphantMistMotion(owner) {
    PendingByOwner.delete(OwnerKey(owner));
}
