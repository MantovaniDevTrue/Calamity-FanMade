import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { TileData } from './../../TL/Modules/TileData.js';

export class ThankYouPaintingSystem extends ModSystem {
    constructor() {
        super();
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.LastCleanupTick = -1000;
    }
    static StorageKey() {
        return 'calamity:world:thankYouPaintings';
    }

    OnWorldLoad() {
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.LastCleanupTick = -1000;
        const raw = WorldDB.get(ThankYouPaintingSystem.StorageKey());
        if (typeof raw !== 'string' || raw.length <= 0)
            return;
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed))
                return;
            for (const value of parsed)
                this.AddPosition(Number(value?.x), Number(value?.y), false);
        } catch (e) {
            tl.log(`[CalamityPort] Thank You Painting load failed: ${e}`);
        }
    }

    OnWorldUnload() {
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
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
        const valid = this.Positions.filter(position => this.IsPositionValid(position));
        if (valid.length !== this.Positions.length) {
            this.Positions = valid;
            this.SavePositions();
        }
    }

    SavePositions() {
        try {
            WorldDB.set(ThankYouPaintingSystem.StorageKey(), JSON.stringify(this.Positions));
        } catch (e) {
            tl.log(`[CalamityPort] Thank You Painting save failed: ${e}`);
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
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        const matches = Math.floor(Number(Terraria.PlayerIndex(player))) === this.PendingPlayer && tick - this.PendingTick >= 0 && tick - this.PendingTick <= 45;
        if (matches) {
            this.PendingPlayer = -1;
            this.PendingTick = -1000;
        }
        return matches;
    }

    GetTopLeft(i, j) {
        let frameX = 0, frameY = 0;
        try {
            const tile = new TileData(i, j);
            frameX = Number(tile.frameX || 0);
            frameY = Number(tile.frameY || 0);
        } catch (e) { }
        const localX = ((frameX % 108) + 108) % 108;
        const localY = ((frameY % 72) + 72) % 72;
        const column = Math.max(0, Math.min(5, Math.floor(localX / 18)));
        const row = Math.max(0, Math.min(3, Math.floor(localY / 18)));
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
        return this.Positions.find(p => i >= p.x && i < p.x + 6 && j >= p.y && j < p.y + 4) || null;
    }

    RemovePosition(position, save = true) {
        if (!position)
            return false;
        const old = this.Positions.length;
        this.Positions = this.Positions.filter(p => p.x !== position.x || p.y !== position.y);
        const changed = old !== this.Positions.length;
        if (changed && save)
            this.SavePositions();
        return changed;
    }

    IsPositionValid(position) {
        const type = 242;
        try {
            for (let row = 0; row < 4; row++) {
                for (let column = 0; column < 6; column++) {
                    const tile = new TileData(position.x + column, position.y + row);
                    if (Number(tile.type) !== type)
                        return false;
                    try {
                        if (tile.tile && !Terraria.TileHasTile(tile.tile))
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
        return Number(ModItem.getTypeByName('ThankYouPainting') || 0);
    }
}
