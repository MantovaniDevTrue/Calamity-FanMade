import { Terraria } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { TileData } from './../../TL/Modules/TileData.js';

const EFFIGY_TILE = 617;
const SLAB_TILE = 1;
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];

function N(v, fallback = 0) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : fallback;
}

function IsGeneratingWorld() {
    try {
        return Terraria.WorldGen.isGeneratingOrLoadingWorld === true;
    } catch (e) {
        return false;
    }
}

export class EffigyGlobalTile extends GlobalTile {
    constructor() {
        super();
        this.ClearingRox = false;
    }

    S() {
        return ModSystem.getByName('EffigySystem');
    }

    R() {
        return ModSystem.getByName('RoxShrineVisualSystem');
    }

    A() {
        return ModSystem.getByName('AbyssShrineVisualSystem');
    }

    // TileLoader currently discovers mining callbacks through this method name,
    // then invokes GetMinPick/GetMineResist on the same GlobalTile instance.
    PickPowerCheck() { }

    OnPlace(player, i, j, type, style) {
        if (IsGeneratingWorld())
            return;

        const tileType = Number(type);
        if (tileType === EFFIGY_TILE) {
            const system = this.S();
            const kind = system?.ConsumePending(player);
            if (kind) {
                const topLeft = system.GetTopLeft(i, j);
                system.AddPosition(topLeft.x, topLeft.y, kind, true);
            }
            return;
        }

        if (tileType === SLAB_TILE) {
            const rox = this.R();
            if (rox && rox.ConsumeSlabPlacement(player))
                rox.AddSlab(i, j, true);
        }
    }

    OnReplace(x, y, targetType, targetStyle) {
        if (IsGeneratingWorld())
            return;

        const effigy = this.S();
        const position = effigy?.FindContaining(x, y);
        if (position)
            effigy.RemovePosition(position, true);

        const abyss = this.A();
        const voidCell = abyss?.IsCell(x, y);
        if (voidCell) abyss.RemoveCell(voidCell, true);

        const rox = this.R();
        const slab = rox?.IsCell(x, y, 'slab');
        if (slab)
            rox.RemoveCell(slab, true);
        if (rox?.FindRox(x, y))
            rox.RemoveRox(true);
    }

    GetMinPick(player, x, y, tile) {
        if (IsGeneratingWorld() || Number(tile?.type) !== 1)
            return 0;
        if (this.A()?.IsCell(x, y)) return 0;
        return this.R()?.IsCell(x, y, 'slab') ? 100 : 0;
    }

    GetMineResist(player, x, y, tile) {
        if (IsGeneratingWorld() || Number(tile?.type) !== 1)
            return 1;
        if (this.A()?.IsCell(x, y)) return 2.1;
        return this.R()?.IsCell(x, y, 'slab') ? 2 : 1;
    }

    RightClick(player, i, j, type) {
        if (IsGeneratingWorld())
            return null;

        // World Evil Island uses the vanilla locked Corruption/Crimson biome
        // chest styles. TLPro can incorrectly open those as an empty panel
        // while they are still locked, so let the dedicated system restore
        // the original Plantera + biome-key gate before any normal chest UI.
        try {
            const islandChest = ModSystem.getByName('WorldEvilIslandChestRepairSystem');
            if (islandChest && typeof islandChest.HandleRightClick === 'function') {
                const handled = islandChest.HandleRightClick(player, i, j, type);
                if (handled === false)
                    return false;
            }
        } catch (e) { }

        if (Number(type) !== EFFIGY_TILE)
            return null;
        const system = this.S();
        const position = system?.FindContaining(i, j);
        if (!position)
            return null;

        const own = Number(ModBuff.getTypeByName(position.kind === 'crimson' ? 'CrimsonEffigyBuff' : 'CorruptionEffigyBuff') || 0);
        const other = Number(ModBuff.getTypeByName(position.kind === 'crimson' ? 'CorruptionEffigyBuff' : 'CrimsonEffigyBuff') || 0);
        try {
            if (other > 0)
                player.ClearBuff(other);
        } catch (e) { }
        try {
            player['void AddBuff(int type, int time, bool fromNetPvP)'](own, 108000, true);
        } catch (e) {
            try { player.AddBuff(own, 108000, true); } catch (_) { }
        }
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](
                3,
                Terraria.PlayerCenter(player),
                1,
                position.kind === 'crimson' ? 0.4 : -0.4
            );
        } catch (e) { }
        try { player.tileInteractionHappened = true; } catch (e) { }
        try {
            tl.log(`[CalamityPort Effigy] activated=${position.kind}, buffType=${own}, duration=108000.`);
        } catch (e) { }
        return false;
    }

    MouseOver(player, i, j, type) {
        if (IsGeneratingWorld())
            return;

        const abyss = this.A();
        if (abyss?.IsChestCell(i, j)) {
            try { player.noThrow=2; player.cursorItemIconEnabled=true; player.cursorItemIconID=Number(ModItem.getTypeByName('VoidChest')||0); } catch(e) { }
            return;
        }
        if (abyss?.IsCell(i, j)) {
            try { player.noThrow=2; player.cursorItemIconEnabled=true; player.cursorItemIconID=Number(ModItem.getTypeByName('SmoothVoidstone')||0); } catch(e) { }
            return;
        }

        const rox = this.R()?.FindRox(i, j);
        if (rox) {
            try {
                player.noThrow = 2;
                player.cursorItemIconEnabled = true;
                player.cursorItemIconID = Number(ModItem.getTypeByName('Roxcalibur') || 0);
            } catch (e) { }
            return;
        }

        if (Number(type) !== EFFIGY_TILE)
            return;
        const position = this.S()?.FindContaining(i, j);
        if (!position)
            return;
        try {
            player.noThrow = 2;
            player.cursorItemIconEnabled = true;
            player.cursorItemIconID = Number(ModItem.getTypeByName(position.kind === 'crimson' ? 'CrimsonEffigy' : 'CorruptionEffigy') || 0);
        } catch (e) { }
    }

    CanDropItems(i, j, tile) {
        if (IsGeneratingWorld() || this.ClearingRox)
            return true;
        const tileType = Number(tile?.type) || 0;
        if (tileType !== 1 && tileType !== EFFIGY_TILE) return true;

        const abyss = this.A();
        const voidCell = abyss?.IsCell(i, j);
        if (voidCell) {
            const itemType=Number(ModItem.getTypeByName('SmoothVoidstone')||0);
            abyss.RemoveCell(voidCell,true);
            if(itemType>0)try{NewItem(N(i)*16,N(j)*16,16,16,itemType,1,false,-1,true);}catch(e){}
            return false;
        }

        const roxSystem = this.R();
        const rox = roxSystem?.FindRox(i, j);
        if (rox) {
            const itemType = Number(ModItem.getTypeByName('Roxcalibur') || 0);
            this.ClearingRox = true;
            try {
                for (let y = 0; y < 4; y++) {
                    for (let x = 0; x < 3; x++) {
                        try {
                            const cell = new TileData(rox.x + x, rox.y + y);
                            cell.ClearEverything();
                        } catch (e) { }
                    }
                }
                roxSystem.RemoveRox(true);
                if (itemType > 0)
                    NewItem(rox.x * 16, rox.y * 16, 48, 64, itemType, 1, false, -1, true);
                try {
                    tl.log(`[CalamityPort RoxTile] Roxcalibur released; topLeft=${rox.x},${rox.y}, itemType=${itemType}.`);
                } catch (e) { }
            } finally {
                this.ClearingRox = false;
            }
            return false;
        }

        const slab = roxSystem?.IsCell(i, j, 'slab');
        if (slab) {
            const itemType = Number(ModItem.getTypeByName('BrimstoneSlab') || 0);
            roxSystem.RemoveCell(slab, true);
            if (itemType > 0) {
                try {
                    NewItem(N(i) * 16, N(j) * 16, 16, 16, itemType, 1, false, -1, true);
                } catch (e) { }
            }
            return false;
        }

        if (Number(tile?.type) !== EFFIGY_TILE)
            return true;
        const system = this.S();
        const position = system?.FindContaining(i, j);
        if (!position)
            return true;
        const itemType = Number(ModItem.getTypeByName(position.kind === 'crimson' ? 'CrimsonEffigy' : 'CorruptionEffigy') || 0);
        system.RemovePosition(position, true);
        if (itemType > 0) {
            try {
                NewItem(position.x * 16, position.y * 16, 48, 64, itemType, 1, false, -1, true);
            } catch (e) { }
        }
        return false;
    }

    KillTile(i, j, type, fail, effectOnly, noItem) {
        if (IsGeneratingWorld() || fail || effectOnly || this.ClearingRox)
            return;
        const tileType = Number(type) || 0;
        if (tileType !== 1 && tileType !== EFFIGY_TILE) return;

        const roxSystem = this.R();
        if (noItem) {
            const slab = roxSystem?.IsCell(i, j, 'slab');
            if (slab)
                roxSystem.RemoveCell(slab, true);
            if (roxSystem?.FindRox(i, j))
                roxSystem.RemoveRox(true);
        }

        const system = this.S();
        const position = system?.FindContaining(i, j);
        if (position && noItem)
            system.RemovePosition(position, true);
    }
}
