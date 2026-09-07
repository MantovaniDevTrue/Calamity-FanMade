import { Terraria, Modules } from './../TL/ModImports.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './FrozenCubeTargetRuntime.js';

const { Vector2 } = Modules;
const MAX_NPCS = 200;
const ArcZapCooldownUntil = new Array(MAX_NPCS).fill(0);
const GladiatorOnKill = new Array(MAX_NPCS).fill(true);
const NPCIdentity = new Array(MAX_NPCS).fill(-1);
let CachedArcZapType = 0;

function NPCIndex(npc) {
    const index = Math.floor(Number(npc && npc.whoAmI));
    return index >= 0 && index < MAX_NPCS ? index : -1;
}
function Identity(npc) {
    const value = Number(npc && npc.netID);
    return Number.isFinite(value) ? value : Number(npc && npc.type) || -1;
}
function EnsureIdentity(npc) {
    const index = NPCIndex(npc);
    if (index < 0)
        return -1;
    const identity = Identity(npc);
    if (NPCIdentity[index] !== identity) {
        NPCIdentity[index] = identity;
        ArcZapCooldownUntil[index] = 0;
        GladiatorOnKill[index] = true;
    }
    return index;
}
function CanChase(npc) {
    return !!(npc && npc.active && !npc.friendly && !npc.townNPC && !npc.dontTakeDamage && Number(npc.life) > 0);
}
function EntityCenterXY(entity) {
    const position = entity && entity.position;
    return {
        X: Number(position && position.X) + Number(entity && entity.width) * 0.5,
        Y: Number(position && position.Y) + Number(entity && entity.height) * 0.5
    };
}
function DistanceSquared(a, b) {
    const dx = Number(a.X) - Number(b.X);
    const dy = Number(a.Y) - Number(b.Y);
    return dx * dx + dy * dy;
}

export const GraniteShrineAccessoryRuntime = {
    OnNPCSpawn(npc) {
        const index = NPCIndex(npc);
        if (index < 0)
            return;
        NPCIdentity[index] = Identity(npc);
        ArcZapCooldownUntil[index] = 0;
        GladiatorOnKill[index] = true;
    },

    TickNPC(npc) {
        // Cooldown usa tick de expiração; não preciso decrementar um inteiro em cada NPC/frame.
    },

    RemoveNPC(npc) {
        const index = NPCIndex(npc);
        if (index < 0)
            return;
        ArcZapCooldownUntil[index] = 0;
        GladiatorOnKill[index] = true;
        NPCIdentity[index] = -1;
    },

    CanChase,

    GetArcCooldown(npc) {
        const index = EnsureIdentity(npc);
        if (index < 0) return 0;
        let tick = 0; try { tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0); } catch (e) { }
        return Math.max(0, Math.floor(Number(ArcZapCooldownUntil[index]) || 0) - tick);
    },

    SetArcCooldown(npc, frames) {
        const index = EnsureIdentity(npc);
        if (index >= 0)
            { let tick = 0; try { tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0); } catch (e) { }
              ArcZapCooldownUntil[index] = tick + Math.max(0, Math.floor(Number(frames) || 0)); }
    },

    ConsumeGladiatorOnKill(npc) {
        const index = EnsureIdentity(npc);
        if (index < 0 || GladiatorOnKill[index] !== true)
            return false;
        GladiatorOnKill[index] = false;
        return true;
    },

    FindNearestTarget(center, maxDistance = 300) {
        // Spawn tracking mantém o conjunto compacto; o scan é só uma rede de segurança
        // globalmente limitada, nunca mais uma travessia de 200 NativeObjects por arco.
        ScanFrozenCubeNPCs(2);
        let target = -1;
        let bestDistanceSq = Number(maxDistance) * Number(maxDistance);
        let tick = 0; try { tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0); } catch (e) { }
        const slots = FrozenCubeTrackedIndices();
        for (let k = 0; k < slots.length; k++) {
            const i = Number(slots[k]);
            const npc = FrozenCubeNPC(i);
            if (!CanChase(npc))
                continue;
            const identityIndex = EnsureIdentity(npc);
            if (identityIndex < 0 || Number(ArcZapCooldownUntil[identityIndex] || 0) > tick)
                continue;
            const distanceSq = DistanceSquared(EntityCenterXY(npc), center);
            if (distanceSq < bestDistanceSq) {
                bestDistanceSq = distanceSq;
                target = i;
            }
        }
        return target;
    },

    ResolveArcZapType() {
        if (!(CachedArcZapType > 0))
            CachedArcZapType = Number(ModProjectile.getTypeByName('ArcZap') || 0);
        return CachedArcZapType;
    }
};
