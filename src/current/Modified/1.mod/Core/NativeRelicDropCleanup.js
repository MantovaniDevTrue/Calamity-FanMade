import { Terraria } from './../TL/ModImports.js';
import { ModSystem } from './../TL/ModSystem.js';
import { ModItem } from './../TL/ModItem.js';

function ResolveMasterTrophyBaseTileID() {
    try {
        const value = 617;
        if (Number.isFinite(value) && value > 0)
            return value;
    } catch (e) { }
    return 617;
}

function NativeRelicTypes() {
    const result = [];
    const add = value => {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0 && !result.includes(n))
            result.push(n);
    };
    try {
        add(Terraria.ID.ItemID.KingSlimeMasterTrophy);
    } catch (e) { }
    try {
        add(Terraria.ID.ItemID.EyeofCthulhuMasterTrophy);
    } catch (e) { }
    add(4924);
    add(4925);
    return result;
}

export class NativeRelicDropCleanup extends ModSystem {
    constructor() {
        super();
        this.Pending = [];
        this.HandledAnchors = [];
        this.NativeTypes = NativeRelicTypes();
        this.CustomTypes = [];
        this.MasterTrophyBase = ResolveMasterTrophyBaseTileID();
    }

    OnWorldLoad() {
        this.Pending = [];
        this.HandledAnchors = [];
        this.RefreshCustomTypes();
    }

    OnWorldUnload() {
        this.Pending = [];
        this.HandledAnchors = [];
        this.CustomTypes = [];
    }

    RefreshCustomTypes() {
        const result = [];
        for (const name of ['DesertScourgeRelic', 'CrabulonRelic', 'HiveMindRelic', 'PerforatorsRelic', 'SlimeGodRelic', 'GiantClamRelic']) {
            try {
                const type = Number(ModItem.getTypeByName(name) || 0);
                if (type > 0 && !result.includes(type))
                    result.push(type);
            } catch (e) { }
        }
        this.CustomTypes = result;
    }

    Queue(topLeftX, topLeftY) {
        const x = Math.floor(Number(topLeftX));
        const y = Math.floor(Number(topLeftY));
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return;
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        this.RefreshCustomTypes();
        const existing = this.Pending.find(entry => entry.x === x && entry.y === y && tick - Number(entry.tick) <= 90);
        if (existing) {
            existing.tick = tick;
            return;
        }
        this.Pending.push({ x, y, tick });
    }

    MarkHandled(topLeftX, topLeftY) {
        const x = Math.floor(Number(topLeftX));
        const y = Math.floor(Number(topLeftY));
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return;
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        const existing = this.HandledAnchors.find(entry => entry.x === x && entry.y === y);
        if (existing)
            existing.tick = tick;
        else
            this.HandledAnchors.push({ x, y, tick });
    }

    IsHandledTile(i, j) {
        const x = Math.floor(Number(i));
        const y = Math.floor(Number(j));
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        for (const entry of this.HandledAnchors) {
            if (tick - Number(entry.tick) > 30)
                continue;
            if (x >= entry.x && x < entry.x + 3 && y >= entry.y && y < entry.y + 4)
                return true;
        }
        return false;
    }

    IsNativeRelicDrop(item) {
        const type = Number(item?.type || 0);
        if (!(type > 0) || this.CustomTypes.includes(type))
            return false;
        if (this.NativeTypes.includes(type))
            return true;
        try {
            return Number(item.createTile) === this.MasterTrophyBase;
        } catch (e) {
            return false;
        }
    }

    RemoveNativeDropNear(entry) {
        const cx = entry.x * 16 + 24;
        const cy = entry.y * 16 + 32;
        let removed = 0;
        for (let i = 0; i < 400; i++) {
            let item = null;
            try {
                item = Terraria.Main.item[i];
            } catch (e) {
                item = null;
            }
            if (!item || !item.active || !this.IsNativeRelicDrop(item))
                continue;
            const ix = Number(item.position?.X || 0) + Number(item.width || 0) * 0.5;
            const iy = Number(item.position?.Y || 0) + Number(item.height || 0) * 0.5;
            const dx = ix - cx, dy = iy - cy;
            if (dx * dx + dy * dy > 112 * 112)
                continue;
            try {
                item.TurnToAir(true);
            } catch (e) {
                item.active = false;
                item.stack = 0;
            }
            removed++;
        }
        return removed;
    }

    PostUpdateTime() {
        const hasHandled = Array.isArray(this.HandledAnchors) && this.HandledAnchors.length > 0;
        const hasPending = Array.isArray(this.Pending) && this.Pending.length > 0;
        if (!hasHandled && !hasPending)
            return;
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        if (Array.isArray(this.HandledAnchors) && this.HandledAnchors.length > 0) {
            this.HandledAnchors = this.HandledAnchors.filter(entry => tick - Number(entry.tick) <= 30);
        }
        if (!Array.isArray(this.Pending) || this.Pending.length === 0)
            return;
        const keep = [];
        for (const entry of this.Pending) {
            this.RemoveNativeDropNear(entry);
            if (tick - Number(entry.tick) <= 90)
                keep.push(entry);
        }
        this.Pending = keep;
    }
}
