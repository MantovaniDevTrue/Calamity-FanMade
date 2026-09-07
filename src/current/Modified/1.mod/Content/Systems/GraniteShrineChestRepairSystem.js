import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { GetChestByIndex, IsChestEmpty } from './../../Core/OfficialSchematicRuntime.js';
import { FillGraniteShrineChestByIndex, FillMarbleShrineChestByIndex } from './../../Core/OfficialStructureRuntime.js';

const KEY = 'calamity:structure:graniteShrine:';
const REPAIR_VERSION = 1;
function NumberOr(value, fallback) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function LocalPlayer() { try { return Terraria.Main.player.get_Item(Math.floor(Number(Terraria.Main.myPlayer))); } catch (e) { return null; } }
function IsInside(x, y) {
    const left = NumberOr(WorldDB.get(KEY + 'left'), -1), top = NumberOr(WorldDB.get(KEY + 'top'), -1);
    const width = Math.max(1, NumberOr(WorldDB.get(KEY + 'width'), 17)), height = Math.max(1, NumberOr(WorldDB.get(KEY + 'height'), 18));
    return left >= 0 && top >= 0 && x >= left && x < left + width && y >= top && y < top + height;
}
function Log(message) { try { tl.log(`[CalamityPort GraniteShrineRepair] ${message}`); } catch (e) { } }

export class GraniteShrineChestRepairSystem extends ModSystem {
    constructor() { super(); this.Poll = 30; }
    OnWorldLoad() { this.Poll = 30; }
    OnWorldUnload() { this.Poll = 30; }
    Update() {
        if (!WorldDB.Instance || this.Poll-- > 0)
            return;
        this.Poll = 10;
        const player = LocalPlayer();
        if (!player)
            return;
        const chestIndex = NumberOr(player.chest, -1);
        if (chestIndex < 0)
            return;
        const chest = GetChestByIndex(chestIndex);
        if (!chest)
            return;
        const x = NumberOr(chest.x, -1), y = NumberOr(chest.y, -1);
        if (!IsInside(x, y))
            return;
        if (!IsChestEmpty(chest)) {
            WorldDB.set(KEY + 'lootVersion', REPAIR_VERSION);
            return;
        }
        const drunk = WorldDB.get(KEY + 'drunkVariant') === true;
        const filled = drunk ? FillMarbleShrineChestByIndex(chestIndex) : FillGraniteShrineChestByIndex(chestIndex);
        Log(`Opened chest repair index=${chestIndex}, position=${x},${y}, drunk=${drunk}, filled=${filled}.`);
        if (filled >= 7)
            WorldDB.set(KEY + 'lootVersion', REPAIR_VERSION);
    }
}
