import { Terraria } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../../Core/FrozenCubeTargetRuntime.js';

let CachedNuisanceTypes = null;
let CachedScourgeHeadType = null;
const FamilyCache = new Map();
const FamilyCacheWindow = 6;
function CurrentTick() {
    const tick = Number(Terraria.Main.GameUpdateCount || 0);
    return Number.isFinite(tick) ? Math.floor(tick) : 0;
}

function GetFamily(parentHeadIndex = -1) {
    const parent = Math.floor(Number(parentHeadIndex));
    const tick = CurrentTick();
    const key = parent >= 0 ? parent : -1;
    const cached = FamilyCache.get(key);
    if (cached && tick - cached.tick < FamilyCacheWindow)
        return cached;
    const types = GetNuisanceTypes();
    let adult = -1, young = -1;
    const slots = FrozenCubeTrackedIndices();
    for (let k = slots.length - 1; k >= 0; k--) {
        const i = Number(slots[k]);
        const npc = FrozenCubeNPC(i);
        if (!npc || npc.life <= 0)
            continue;
        const type = Number(npc.type);
        if (type !== types.adultHead && type !== types.youngHead)
            continue;
        if (parent >= 0 && Math.floor(Number(npc.ai[2])) !== parent)
            continue;
        if (type === types.adultHead)
            adult = i;
        else
            young = i;
        if (adult >= 0 && young >= 0)
            break;
    }
    const value = { tick, adult, young };
    FamilyCache.set(key, value);
    return value;
}

export function GetNuisanceTypes() {
    if (!CachedNuisanceTypes) {
        CachedNuisanceTypes = {
            adultHead: ModNPC.getTypeByName('DesertNuisanceHead'),
            adultBody: ModNPC.getTypeByName('DesertNuisanceBody'),
            adultTail: ModNPC.getTypeByName('DesertNuisanceTail'),
            youngHead: ModNPC.getTypeByName('DesertNuisanceHeadYoung'),
            youngBody: ModNPC.getTypeByName('DesertNuisanceBodyYoung'),
            youngTail: ModNPC.getTypeByName('DesertNuisanceTailYoung')
        };
    }
    return CachedNuisanceTypes;
}

function GetScourgeHeadType() {
    if (CachedScourgeHeadType === null)
        CachedScourgeHeadType = ModNPC.getTypeByName('DesertScourgeHead');
    return CachedScourgeHeadType;
}

export function IsNuisanceHeadType(type) {
    const t = GetNuisanceTypes();
    return type === t.adultHead || type === t.youngHead;
}

export function GetParentScourgeIndex(npc) {
    if (!npc)
        return -1;
    const index = Math.floor(Number(npc.ai[2]));
    return index >= 0 && index < 200 ? index : -1;
}

export function GetParentScourge(npc) {
    const index = GetParentScourgeIndex(npc);
    if (index < 0)
        return null;
    const parent = Terraria.Main.npc[index];
    const headType = GetScourgeHeadType();
    if (!parent || !parent.active || parent.life <= 0 || parent.type !== headType)
        return null;
    return parent;
}

export function IsLinkedToScourge(npc, parentHeadIndex) {
    const parent = Math.floor(Number(parentHeadIndex));
    if (!(parent >= 0 && parent < 200) || !npc)
        return false;
    return Math.floor(Number(npc.ai[2])) === parent;
}

export function AnyNuisanceAlive(parentHeadIndex = -1) {
    const family = GetFamily(parentHeadIndex);
    return family.adult >= 0 || family.young >= 0;
}

export function OtherNuisanceAlive(young, parentHeadIndex = -1) {
    const family = GetFamily(parentHeadIndex);
    return young === true ? family.adult >= 0 : family.young >= 0;
}

export function GetNuisanceHead(npc) {
    const index = Math.floor(Number(npc.ai[2]));
    if (!(index >= 0 && index < 200))
        return null;
    const head = Terraria.Main.npc[index];
    if (!head || !head.active || !IsNuisanceHeadType(head.type))
        return null;
    return head;
}

export function DeactivateNuisanceSegment(npc) {
    try {
        npc.life = 0;
        npc.active = false;
        npc.netUpdate = true;
    } catch (e) { }
}

export function DeactivateNuisanceFamily(head, includeHead = true) {
    if (!head)
        return 0;
    const t = GetNuisanceTypes();
    const young = head.type === t.youngHead;
    const bodyType = young ? t.youngBody : t.adultBody;
    const tailType = young ? t.youngTail : t.adultTail;
    const headIndex = Math.floor(Number(head.whoAmI));
    let removed = 0;
    const slots = FrozenCubeTrackedIndices();
    for (let k = slots.length - 1; k >= 0; k--) {
        const segment = FrozenCubeNPC(slots[k]);
        if (!segment)
            continue;
        if ((segment.type === bodyType || segment.type === tailType) && Math.floor(Number(segment.ai[2])) === headIndex) {
            DeactivateNuisanceSegment(segment);
            removed++;
        }
    }

    if (includeHead && head.active) {
        DeactivateNuisanceSegment(head);
        removed++;
    }
    FamilyCache.clear();
    return removed;
}

export function FollowNuisanceSegment(npc, spacing) {
    const head = GetNuisanceHead(npc);
    if (!head) {
        DeactivateNuisanceSegment(npc);
        return false;
    }
    const previousIndex = Math.floor(Number(npc.ai[1]));
    if (!(previousIndex >= 0 && previousIndex < 200)) {
        DeactivateNuisanceSegment(npc);
        return false;
    }
    const previous = Terraria.Main.npc[previousIndex];
    if (!previous || !previous.active) {
        DeactivateNuisanceSegment(npc);
        return false;
    }
    if (Number(npc.realLife) !== Number(head.whoAmI))
        npc.realLife = head.whoAmI;
    const tick = CurrentTick();
    if ((tick + Number(npc.whoAmI)) % 3 === 0) {
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
    }
    const previousPosition = previous.position;
    const position = npc.position;
    const previousCenterX = Number(previousPosition.X) + Number(previous.width) * 0.5;
    const previousCenterY = Number(previousPosition.Y) + Number(previous.height) * 0.5;
    const centerX = Number(position.X) + Number(npc.width) * 0.5;
    const centerY = Number(position.Y) + Number(npc.height) * 0.5;
    const dx = previousCenterX - centerX;
    const dy = previousCenterY - centerY;
    const distanceSquared = dx * dx + dy * dy;
    const distance = distanceSquared > 0.000001 ? Math.sqrt(distanceSquared) : 0.001;
    const desiredSpacing = Number(spacing) * (Number(npc.scale) || 1);
    const nextX = previousCenterX - dx / distance * desiredSpacing - Number(npc.width) * 0.5;
    const nextY = previousCenterY - dy / distance * desiredSpacing - Number(npc.height) * 0.5;
    if (Math.abs(Number(position.X) - nextX) > 0.001 || Math.abs(Number(position.Y) - nextY) > 0.001) {
        position.X = nextX;
        position.Y = nextY;
        npc.position = position;
    }
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
