import { Terraria } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModSystem } from './../../../../TL/ModSystem.js';

let CachedScourgeTypes = null;
export function GetDesertScourgeDifficultyFlags() {
    const worldState = ModSystem.getByName('CalamityWorldState');
    let goodWorld = false;
    let zenithWorld = false;
    try {
        goodWorld = Terraria.Main.getGoodWorld === true;
    } catch (e) { }
    try {
        zenithWorld = Terraria.Main.zenithWorld === true;
    } catch (e) { }
    const death = !!(worldState && worldState.DeathMode === true);
    return {
        death,
        revenge: death || !!(worldState && worldState.RevengeanceMode === true),
        expert: Terraria.Main.expertMode === true || Terraria.Main.masterMode === true,
        master: Terraria.Main.masterMode === true,
        goodWorld,
        zenithWorld
    };
}

export function MinimumPlayerCornerDistance(npc, player) {
    if (!npc || !player)
        return 999999;
    const cx = Number(npc.Center.X);
    const cy = Number(npc.Center.Y);
    const left = Number(Terraria.PlayerPositionX(player));
    const top = Number(Terraria.PlayerPositionY(player));
    const right = left + Number(Terraria.PlayerWidth(player));
    const bottom = top + Number(Terraria.PlayerHeight(player));
    const points = [[left, top], [right, top], [left, bottom], [right, bottom]];
    let min = 999999;
    for (const point of points) {
        const dx = cx - point[0];
        const dy = cy - point[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < min)
            min = distance;
    }
    return min;
}

export function ApplyCircularContactFilter(npc, player, modifiers, radius, requireVisible = false) {
    if (!modifiers)
        return false;
    const visible = !requireVisible || Number(npc.alpha) <= 0;
    const allowed = visible && MinimumPlayerCornerDistance(npc, player) <= Math.max(0, Number(radius));
    if (!allowed) {
        modifiers.damage = 0;
        modifiers.quiet = true;
    }
    return allowed;
}

function ResolveDesertScourgeHitVariant(preferredIndex = 0) {
    const normalized = Math.max(0, Math.min(2, Math.floor(Number(preferredIndex) || 0)));
    const order = normalized === 0
        ? ['Item145', 'Item146', 'Item147']
        : (normalized === 1 ? ['Item146', 'Item147', 'Item145'] : ['Item147', 'Item145', 'Item146']);
    for (const name of order) {
        try {
            const sound = Terraria.ID.SoundID[name];
            if (sound)
                return sound;
        } catch (e) { }
    }
    return Terraria.ID.SoundID.NPCHit13;
}

export function GetCurrentDesertScourgeHitSound() {
    return ResolveDesertScourgeHitVariant(Math.floor(Math.random() * 3));
}

export function QueueNextDesertScourgeHitSound(npc) {
    if (!npc || npc.life <= 0)
        return;
    try {
        npc.HitSound = GetCurrentDesertScourgeHitSound();
    } catch (e) { }
}

export function GetScourgeTypes() {
    if (!CachedScourgeTypes) {
        CachedScourgeTypes = {
            head: ModNPC.getTypeByName('DesertScourgeHead'),
            body: ModNPC.getTypeByName('DesertScourgeBody'),
            tail: ModNPC.getTypeByName('DesertScourgeTail')
        };
    }
    return CachedScourgeTypes;
}

export function IsActiveNPC(index) {
    const i = Math.floor(Number(index));
    if (!(i >= 0 && i < 200))
        return false;
    const npc = Terraria.Main.npc[i];
    return !!(npc && npc.active);
}

export function GetHead(npc) {
    const headIndex = Math.floor(Number(npc.ai[2]));
    if (!(headIndex >= 0 && headIndex < 200))
        return null;
    const head = Terraria.Main.npc[headIndex];
    const types = GetScourgeTypes();
    if (!head || !head.active || head.type !== types.head)
        return null;
    return head;
}

export function DeactivateSegment(npc) {
    try {
        npc.life = 0;
        npc.active = false;
        npc.netUpdate = true;
    } catch (e) { }
}

export function FollowPreviousSegment(npc, spacing = 70) {
    const head = GetHead(npc);
    if (!head) {
        DeactivateSegment(npc);
        return false;
    }
    const previousIndex = Math.floor(Number(npc.ai[1]));
    if (!(previousIndex >= 0 && previousIndex < 200)) {
        DeactivateSegment(npc);
        return false;
    }
    const previous = Terraria.Main.npc[previousIndex];
    if (!previous || !previous.active) {
        DeactivateSegment(npc);
        return false;
    }
    if (Number(npc.realLife) !== Number(head.whoAmI))
        npc.realLife = head.whoAmI;
    if (Number(npc.lifeMax) !== Number(head.lifeMax))
        npc.lifeMax = head.lifeMax;
    if (Number(npc.life) !== Number(head.life))
        npc.life = head.life;
    if (Number(npc.alpha) !== Number(head.alpha))
        npc.alpha = head.alpha;
    if (npc.dontTakeDamage !== head.dontTakeDamage)
        npc.dontTakeDamage = head.dontTakeDamage;
    if (Number(npc.target) !== Number(head.target))
        npc.target = head.target;
    const dx = Number(previous.Center.X) - Number(npc.Center.X);
    const dy = Number(previous.Center.Y) - Number(npc.Center.Y);
    const distanceSquared = dx * dx + dy * dy;
    const safeDistance = distanceSquared > 0.000001 ? Math.sqrt(distanceSquared) : 0.001;
    const desiredSpacing = Number(spacing) * (Number(npc.scale) || 1);
    const centerX = Number(previous.Center.X) - dx / safeDistance * desiredSpacing;
    const centerY = Number(previous.Center.Y) - dy / safeDistance * desiredSpacing;
    const position = npc.position;
    position.X = centerX - Number(npc.width) * 0.5;
    position.Y = centerY - Number(npc.height) * 0.5;
    npc.position = position;
    const velocity = npc.velocity;
    if (Math.abs(Number(velocity.X)) > 0.001 || Math.abs(Number(velocity.Y)) > 0.001) {
        velocity.X = 0;
        velocity.Y = 0;
        npc.velocity = velocity;
    }
    npc.rotation = Math.atan2(dy, dx) + Math.PI * 0.5;
    const direction = dx > 0 ? 1 : -1;
    if (Number(npc.spriteDirection) !== direction)
        npc.spriteDirection = direction;
    if (Number(npc.direction) !== direction)
        npc.direction = direction;
    return true;
}
