import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { TileData } from './../../TL/Modules/TileData.js';

function ResolveMasterTrophyBaseTileID() {
    try {
        const value = 617;
        if (Number.isFinite(value) && value > 0)
            return value;
    } catch (e) { }
    return 617;
}

export class GiantClamRelicSystem extends ModSystem {
    constructor() {
        super();
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.PendingExisting = {};
        this.LastCleanupTick = -1000;
        this.LastClaimStatus = 'idle';
    }
    static StorageKey() {
        return 'calamity:world:giantClamRelics';
    }

    OnWorldLoad() {
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.PendingExisting = {};
        this.LastCleanupTick = -1000;
        this.LastClaimStatus = 'idle';
        const raw = WorldDB.get(GiantClamRelicSystem.StorageKey());
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
            tl.log(`[CalamityPort] Slime God relic position load failed: ${e}`);
        }
    }

    OnWorldUnload() {
        this.Positions = [];
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.PendingExisting = {};
        this.LastCleanupTick = -1000;
        this.LastClaimStatus = 'idle';
    }

    PreSaveAndQuit() {
        this.SavePositions();
    }

    PostUpdateTime() {
        const hasPendingPlacement = Number(this.PendingPlayer) >= 0;
        if (!hasPendingPlacement && (!Array.isArray(this.Positions) || this.Positions.length === 0))
            return;
        if (hasPendingPlacement)
            this.TryClaimPendingPlacement();
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
            WorldDB.set(GiantClamRelicSystem.StorageKey(), JSON.stringify(this.Positions.map(p => ({ x: Math.floor(p.x), y: Math.floor(p.y) }))));
        } catch (e) {
            tl.log(`[CalamityPort] Slime God relic position save failed: ${e}`);
        }
    }

    PositionKey(x, y) {
        return `${Math.floor(Number(x))}:${Math.floor(Number(y))}`;
    }

    MarkPending(player) {
        if (!player)
            return;
        this.PendingPlayer = Math.floor(Number(Terraria.PlayerIndex(player)));
        this.PendingTick = Number(Terraria.Main.GameUpdateCount || 0);
        this.PendingExisting = {};
        this.LastClaimStatus = 'waiting';
        const anchors = this.CollectNearbyRelicAnchors(player, 12);
        for (const anchor of anchors)
            this.PendingExisting[this.PositionKey(anchor.x, anchor.y)] = true;
    }

    ClearPending(status = 'idle') {
        this.PendingPlayer = -1;
        this.PendingTick = -1000;
        this.PendingExisting = {};
        this.LastClaimStatus = status;
    }

    ConsumePending(player) {
        if (!player)
            return false;
        const who = Math.floor(Number(Terraria.PlayerIndex(player)));
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        const matches = who === this.PendingPlayer && tick - this.PendingTick >= 0 && tick - this.PendingTick <= 90;
        if (matches)
            this.ClearPending('claimed-onplace');
        return matches;
    }

    CollectNearbyRelicAnchors(player, radius = 12) {
        const results = [];
        const keys = {};
        if (!player)
            return results;
        const relicTile = ResolveMasterTrophyBaseTileID();
        const centerX = Math.floor(Number(Terraria.PlayerCenterX(player)) / 16);
        const centerY = Math.floor(Number(Terraria.PlayerCenterY(player)) / 16);
        const minX = Math.max(1, centerX - radius);
        const maxX = Math.min(Number(Terraria.Main.maxTilesX || 0) - 2, centerX + radius);
        const minY = Math.max(1, centerY - radius);
        const maxY = Math.min(Number(Terraria.Main.maxTilesY || 0) - 2, centerY + radius);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                try {
                    const tile = new TileData(x, y);
                    if (Number(tile.type) !== relicTile)
                        continue;
                    try {
                        const nativeTile = tile.tile;
                        if (nativeTile && !Terraria.TileHasTile(nativeTile))
                            continue;
                    } catch (e) { }
                    const topLeft = this.GetTopLeft(x, y);
                    const key = this.PositionKey(topLeft.x, topLeft.y);
                    if (keys[key])
                        continue;
                    keys[key] = true;
                    results.push(topLeft);
                } catch (e) { }
            }
        }
        return results;
    }

    TryClaimPendingPlacement() {
        if (this.PendingPlayer < 0)
            return false;
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        const age = tick - this.PendingTick;
        if (age < 0)
            return false;
        if (age > 90) {
            this.ClearPending('expired');
            return false;
        }
        let player = null;
        try {
            player = Terraria.Main.player[this.PendingPlayer];
        } catch (e) {
            player = null;
        }
        if (!player || player.active === false)
            return false;
        const anchors = this.CollectNearbyRelicAnchors(player, 12);
        let best = null;
        let bestDistance = 999999;
        const px = Number(Terraria.PlayerCenterX(player)) / 16;
        const py = Number(Terraria.PlayerCenterY(player)) / 16;
        for (const anchor of anchors) {
            const key = this.PositionKey(anchor.x, anchor.y);
            if (this.PendingExisting[key])
                continue;
            if (this.Positions.some(p => p.x === anchor.x && p.y === anchor.y))
                continue;
            const dx = anchor.x + 1.5 - px;
            const dy = anchor.y + 2 - py;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) {
                bestDistance = distance;
                best = anchor;
            }
        }
        if (!best)
            return false;
        this.AddPosition(best.x, best.y, true);
        this.ClearPending('claimed-fallback-scan');
        return true;
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
        const localY = ((frameY % 72) + 72) % 72;
        const column = Math.max(0, Math.min(2, Math.floor(localX / 18)));
        const row = Math.max(0, Math.min(3, Math.floor(localY / 18)));
        return { x: Math.floor(Number(i)) - column, y: Math.floor(Number(j)) - row };
    }

    AddFromPlacedTile(i, j) {
        const topLeft = this.GetTopLeft(i, j);
        const added = this.AddPosition(topLeft.x, topLeft.y, true);
        if (added)
            this.LastClaimStatus = 'claimed-onplace';
        return added;
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
        return this.Positions.find(p => i >= p.x && i < p.x + 3 && j >= p.y && j < p.y + 4) || null;
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
        const relicTile = ResolveMasterTrophyBaseTileID();
        try {
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 3; x++) {
                    const tile = new TileData(position.x + x, position.y + y);
                    if (Number(tile.type) !== relicTile)
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
        return Number(ModItem.getTypeByName('PerforatorsRelic') || 0);
    }

    GetSummary() {
        return `tracked=${this.Positions.length}, pending=${this.PendingPlayer >= 0}, claim=${this.LastClaimStatus}`;
    }
}
