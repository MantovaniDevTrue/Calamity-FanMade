import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { WorldDB } from './../../../TL/WorldDB.js';

function PlayerIndex(player) {
    try {
        const index = Math.floor(Number(Terraria.PlayerIndex(player)));
        if (index >= 0 && index < 256)
            return index;
    } catch (e) { }
    const index = Math.floor(Number(player && player.whoAmI));
    return index >= 0 && index < 256 ? index : -1;
}

function GetPlayer(index) {
    try { return Terraria.Main.player.get_Item(Math.floor(Number(index))); }
    catch (e) { return null; }
}

export class TrinketofChi extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/TrinketofChi';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 34;
        item.height = 32;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 10, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.accessory = true;
        this.MenuCategories.push('accessory');
    }

    MarkFound() {
        try {
            if (Terraria.Main.netMode !== 1 && WorldDB.Instance && WorldDB.get('calamity:unlock:trinketOfChi') !== true)
                WorldDB.set('calamity:unlock:trinketOfChi', true);
        } catch (e) { }
    }

    UpdateInventory(item, player) { this.MarkFound(); }

    UpdateAccessory(item, player, hideVisual) {
        this.MarkFound();
        const controller = ModPlayer.getByName('SurfaceShrineAccessoryPlayer');
        if (controller)
            controller.EnableTrinket(player);

        // Official multiplayer team aura: a remote wearer refreshes the local
        // teammate's Chi regeneration buff every ten ticks. It intentionally
        // has no distance check in the source implementation.
        const wearerIndex = PlayerIndex(player);
        const localIndex = Math.floor(Number(Terraria.Main.myPlayer));
        if (wearerIndex >= 0 && wearerIndex !== localIndex && Math.floor(Number(player.miscCounter) || 0) % 10 === 0) {
            const local = GetPlayer(localIndex);
            if (local && Number(local.team) !== 0 && Number(local.team) === Number(player.team)) {
                const buff = Number(ModBuff.getTypeByName('ChiRegenBuff') || 0);
                if (buff > 0)
                    local.AddBuff(buff, 20, true);
            }
        }
    }
}
