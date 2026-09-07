import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { TileData } from './../../TL/Modules/TileData.js';

export class SlimeGodTrophySystem extends ModSystem {
    constructor() {
        super();
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.LastCleanupTick = -1000;
    }
    static StorageKey() {
        return 'calamity:world:slimeGodTrophies';
    }

    OnWorldLoad() {
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.LastCleanupTick = -1000;
        const raw = WorldDB.get(SlimeGodTrophySystem.StorageKey());
        if (typeof raw !== 'string' || raw.length <= 0)
            return;
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed))
                return;
            for (const value of parsed) {
                const x = Math.floor(Number(value?.x));
                const y = Math.floor(Number(value?.y));
                if (!Number.isFinite(x) || !Number.isFinite(y))
                    continue;
                this.AddPosition(x, y, false);
            }
        } catch (e) {
            tl.log(`[CalamityPort] Slime God trophy position load failed: ${e}`);
        }
    }

    OnWorldUnload() {
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.LastCleanupTick = -1000;
    }

    PreSaveAndQuit() {
        this.SavePositions();
    }

    PostUpdateTime() {
        if (!Array.isArray(this.Positions) || this.Positions.length === 0)
            return;
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        if (tick - this.LastCleanupTick < 120)
            return;
        this.LastCleanupTick = tick;
        let changed = false;
        const valid = [];
        for (const position of this.Positions) {
            if (this.IsPositionValid(position))
                valid.push(position);
            else
                changed = true;
        }
        if (changed) {
            this.Positions = valid;
            this.SavePositions();
        }
    }

    SavePositions() {
        try {
            WorldDB.set(SlimeGodTrophySystem.StorageKey(), JSON.stringify(this.Positions.map(p => ({ x: Math.floor(p.x), y: Math.floor(p.y) }))));
        } catch (e) {
            tl.log(`[CalamityPort] Slime God trophy position save failed: ${e}`);
        }
    }

    MarkPending(player) {
        if (!player)
            return;
        this.PendingPlayer = Math.floor(Number(Terraria.PlayerIndex(player)));
        this.PendingTick = Number(Terraria.Main.GameUpdateCount || 0);
    }

    ConsumePending(player) {
        if (!player)
            return false;
        const who = Math.floor(Number(Terraria.PlayerIndex(player)));
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        const matches = who === this.PendingPlayer && tick - this.PendingTick >= 0 && tick - this.PendingTick <= 45;
        if (matches) {
            this.PendingPlayer = -1;
            this.PendingTick = -1000;
        }
        return matches;
    }

    GetTopLeft(i, j) {
        let frameX = 0;
        let frameY = 0;
        try {
            const tile = new TileData(i, j);
            frameX = Number(tile.frameX || 0);
            frameY = Number(tile.frameY || 0);
        } catch (e) { }
        const localX = ((frameX % 54) + 54) % 54;
        const localY = ((frameY % 54) + 54) % 54;
        const column = Math.max(0, Math.min(2, Math.floor(localX / 18)));
        const row = Math.max(0, Math.min(2, Math.floor(localY / 18)));
        return { x: Math.floor(Number(i)) - column, y: Math.floor(Number(j)) - row };
    }

    AddFromPlacedTile(i, j) {
        const topLeft = this.GetTopLeft(i, j);
        return this.AddPosition(topLeft.x, topLeft.y, true);
    }

    AddPosition(x, y, save = true) {
        x = Math.floor(Number(x));
        y = Math.floor(Number(y));
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return false;
        if (this.Positions.some(p => p.x === x && p.y === y))
            return false;
        this.Positions.push({ x, y });
        if (save)
            this.SavePositions();
        return true;
    }

    FindContaining(i, j) {
        i = Math.floor(Number(i));
        j = Math.floor(Number(j));
        return this.Positions.find(p => i >= p.x && i < p.x + 3 && j >= p.y && j < p.y + 3) || null;
    }

    RemovePosition(position, save = true) {
        if (!position)
            return false;
        const oldLength = this.Positions.length;
        this.Positions = this.Positions.filter(p => !(p.x === position.x && p.y === position.y));
        const changed = this.Positions.length !== oldLength;
        if (changed && save)
            this.SavePositions();
        return changed;
    }

    IsPositionValid(position) {
        const trophyTile = 240;
        try {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    const tile = new TileData(position.x + x, position.y + y);
                    if (Number(tile.type) !== trophyTile)
                        return false;
                    try {
                        const nativeTile = tile.tile;
                        if (nativeTile && !Terraria.TileHasTile(nativeTile))
                            return false;
                    } catch (e) { }
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    GetCustomItemType() {
        return Number(ModItem.getTypeByName('PerforatorTrophy') || 0);
    }
}
