import { Terraria, Modules } from './../TL/ModImports.js';
import { ModNPC } from './../TL/ModNPC.js';
import { ModBuff } from './../TL/ModBuff.js';
import { CalamityNPCState } from './CalamityNPCState.js';
import { SunkenSeaPreviewRuntime } from './SunkenSeaPreviewRuntime.js';

const { Vector2 } = Modules;

let CachedClamityType = 0;

export function GetClamityType() {
    if (!(CachedClamityType > 0))
        CachedClamityType = Number(ModBuff.getTypeByName('Clamity') || 0);
    return CachedClamityType;
}

export function HasClamity(player) {
    const type = GetClamityType();
    if (!(type > 0) || !player)
        return false;
    try {
        return Number(player.FindBuffIndex(type)) >= 0;
    } catch (e) {
        return false;
    }
}

export function ApplyClamity(player, time = 2) {
    const type = GetClamityType();
    if (!(type > 0) || !player)
        return false;
    try {
        player.AddBuff(type, Math.max(2, Math.floor(Number(time) || 2)), true);
        return true;
    } catch (e) {
        try {
            player.AddBuff(type, Math.max(2, Math.floor(Number(time) || 2)), false);
            return true;
        } catch (ignored) {
            return false;
        }
    }
}
function DeactivateNoLoot(npc) {
    if (!npc)
        return;
    try {
        npc.active = false;
        npc.netUpdate = true;
        npc.timeLeft = 0;
    } catch (e) { }
    try {
        CalamityNPCState.Remove(npc);
    } catch (e) { }
}

export function IsGiantClamDenTile(x, y, padding = 0) {
    if (!SunkenSeaPreviewRuntime.IsAvailable())
        return false;
    const dx = Math.abs(Math.floor(Number(x) || 0) - Number(SunkenSeaPreviewRuntime.CenterX));
    const dy = Math.abs(Math.floor(Number(y) || 0) - Number(SunkenSeaPreviewRuntime.CenterY));
    return dx <= 74 + Math.max(0, Number(padding) || 0)
        && dy <= 46 + Math.max(0, Number(padding) || 0);
}

export function GiantClamDenWorldPosition() {
    return {
        x: Math.floor(Number(SunkenSeaPreviewRuntime.CenterX) * 16),
        y: Math.floor((Number(SunkenSeaPreviewRuntime.CenterY) + 28) * 16)
    };
}

export function SpawnGiantClamAtDen(player = null) {
    const type = Number(ModNPC.getTypeByName('GiantClam') || 0);
    if (!(type > 0) || Terraria.NPC.AnyNPCs(type))
        return -1;
    const pos = GiantClamDenWorldPosition();
    const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
    const owner = player ? Number(Terraria.PlayerIndex(player)) : 255;
    return Terraria.NPC.NewNPC(source, pos.x, pos.y, type, 0, 0, 0, 0, 0, owner);
}

export function AnyLivingPlayer() {
    if (Number(Terraria.Main.netMode) !== 0)
        return true;
    const index = Math.max(0, Math.floor(Number(Terraria.Main.myPlayer) || 0));
    const player = Terraria.Main.player[index];
    return !!(player && player.dead !== true && Number(player.statLife) > 0);
}

export function CleanupGiantClamIfNoLivingPlayers() {
    if (AnyLivingPlayer())
        return false;
    const giant = Number(ModNPC.getTypeByName('GiantClam') || 0);
    const clam = Number(ModNPC.getTypeByName('Clam') || 0);
    let removed = 0;
    for (let i = 0; i < 200; i++) {
        const npc = Terraria.Main.npc[i];
        if (!npc || npc.active !== true)
            continue;
        const state = CalamityNPCState.Get(npc);
        if (Number(npc.type) === giant || (Number(npc.type) === clam && state.summonedByGiantClam === true)) {
            DeactivateNoLoot(npc);
            removed++;
        }
    }
    return removed > 0;
}

export function CleanupAbandonedGiantClam(npc) {
    const clam = Number(ModNPC.getTypeByName('Clam') || 0);
    for (let i = 0; i < 200; i++) {
        const other = Terraria.Main.npc[i];
        if (!other || other.active !== true || Number(other.type) !== clam)
            continue;
        const state = CalamityNPCState.Get(other);
        if (state.summonedByGiantClam === true)
            DeactivateNoLoot(other);
    }
    DeactivateNoLoot(npc);
}
