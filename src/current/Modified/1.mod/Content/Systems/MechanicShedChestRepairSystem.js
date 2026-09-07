import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import {
    EnsureAndFillMechanicChest,
    FillMechanicChestByIndex,
    FindExistingMechanicShedChest,
    FindChestIndexAt,
    GetChestByIndex,
    IsChestEmpty
} from './../../Core/OfficialSchematicRuntime.js';

const KEY = 'calamity:structure:mechanicShed:';
const REPAIR_VERSION = 3;
const SCHEMATIC_CHEST_OFFSET_X = 19;
const SCHEMATIC_CHEST_OFFSET_Y = 12;

function Log(message) {
    try { tl.log(`[CalamityPort MechanicShedRepair] ${message}`); } catch (e) { }
}

function NumberOr(value, fallback) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? n : fallback;
}

function LocalPlayer() {
    try { return Terraria.Main.player.get_Item(Math.floor(Number(Terraria.Main.myPlayer))); }
    catch (e) { return null; }
}

function ExpectedChestPosition() {
    const left = NumberOr(WorldDB.get(KEY + 'left'), -1);
    const top = NumberOr(WorldDB.get(KEY + 'top'), -1);
    if (left >= 0 && top >= 0)
        return { x: left + SCHEMATIC_CHEST_OFFSET_X, y: top + SCHEMATIC_CHEST_OFFSET_Y };
    const x = NumberOr(WorldDB.get(KEY + 'chestX'), -1);
    const y = NumberOr(WorldDB.get(KEY + 'chestY'), -1);
    return x >= 0 && y >= 0 ? { x, y } : null;
}

function IsInsideSavedShed(x, y) {
    const left = NumberOr(WorldDB.get(KEY + 'left'), -1);
    const top = NumberOr(WorldDB.get(KEY + 'top'), -1);
    const width = Math.max(1, NumberOr(WorldDB.get(KEY + 'width'), 30));
    const height = Math.max(1, NumberOr(WorldDB.get(KEY + 'height'), 21));
    return left >= 0 && top >= 0 && x >= left && x < left + width && y >= top && y < top + height;
}

function MarkSuccess(x, y) {
    WorldDB.set(KEY + 'generated', true);
    WorldDB.set(KEY + 'chestX', x);
    WorldDB.set(KEY + 'chestY', y);
    WorldDB.set(KEY + 'lootVersion', REPAIR_VERSION);
}

export class MechanicShedChestRepairSystem extends ModSystem {
    constructor() {
        super();
        this.ResetRuntime();
    }

    ResetRuntime() {
        this.Delay = 60;
        this.OpenChestPoll = 0;
        this.BackgroundDone = false;
    }

    OnWorldLoad() { this.ResetRuntime(); }
    OnWorldUnload() { this.ResetRuntime(); }

    Update() {
        if (!WorldDB.Instance)
            return;
        if (Number(WorldDB.get(KEY + 'lootVersion')) >= REPAIR_VERSION) {
            this.BackgroundDone = true;
            return;
        }

        // Most reliable mobile path: use the chest index Terraria has already
        // resolved when the player opens it, then verify it belongs to the
        // stored 30x21 Mechanic Shed rectangle.
        if (this.OpenChestPoll-- <= 0) {
            this.OpenChestPoll = 10;
            this.RepairOpenedMechanicChest();
        }

        if (this.BackgroundDone)
            return;
        if (this.Delay-- > 0)
            return;
        this.BackgroundDone = true;
        this.RepairSavedChest();
    }

    RepairOpenedMechanicChest() {
        const player = LocalPlayer();
        if (!player)
            return;
        const chestIndex = NumberOr(player.chest, -1);
        if (chestIndex < 0)
            return;
        const chest = GetChestByIndex(chestIndex);
        if (!chest)
            return;
        const x = NumberOr(chest.x, -1);
        const y = NumberOr(chest.y, -1);
        const expected = ExpectedChestPosition();
        const isExpected = expected && x === expected.x && y === expected.y;
        if (!isExpected && !IsInsideSavedShed(x, y))
            return;

        if (!IsChestEmpty(chest)) {
            MarkSuccess(x, y);
            return;
        }

        const filled = FillMechanicChestByIndex(chestIndex);
        Log(`Opened chest repair index=${chestIndex}, position=${x},${y}, filled=${filled}.`);
        if (filled === 5)
            MarkSuccess(x, y);
    }

    RepairSavedChest() {
        if (Number(WorldDB.get(KEY + 'lootVersion')) >= REPAIR_VERSION)
            return;

        const expected = ExpectedChestPosition();
        if (expected) {
            const result = EnsureAndFillMechanicChest(expected.x, expected.y, true);
            Log(`Saved coordinate repair ${expected.x},${expected.y}: success=${result.success}, index=${result.chestIndex}, filled=${result.filled}, reason=${result.reason}.`);
            if (result.success && (result.filled === 5 || result.reason === 'already-has-items')) {
                MarkSuccess(expected.x, expected.y);
                return;
            }
        }

        const found = FindExistingMechanicShedChest();
        if (found) {
            const result = EnsureAndFillMechanicChest(found.x, found.y, true);
            Log(`Fallback chest repair ${found.x},${found.y}: success=${result.success}, index=${result.chestIndex}, filled=${result.filled}, reason=${result.reason}.`);
            if (result.success && (result.filled === 5 || result.reason === 'already-has-items')) {
                MarkSuccess(found.x, found.y);
                return;
            }
        }

        // Keep background repair available, while the opened-chest path remains
        // active every ten updates regardless of this retry timer.
        this.BackgroundDone = false;
        this.Delay = 600;
    }
}
