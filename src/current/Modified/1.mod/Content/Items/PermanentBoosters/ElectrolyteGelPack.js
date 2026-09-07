import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { PlayerDB } from './../../../TL/PlayerDB.js';

const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
export class ElectrolyteGelPack extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/PermanentBoosters/ElectrolyteGelPack';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 20;
        i.height = 20;
        i.consumable = true;
        i.maxStack = 1;
        i.useAnimation = 30;
        i.useTime = 30;
        i.UseSound = Terraria.ID.SoundID.Item122;
        i.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        i.value = Terraria.Item.sellPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.LightRed;
    }

    CanUseItem(item, player) {
        const s = ModPlayer.getByName('CalamityPlayerState');
        return !!(s && s.ElectrolyteGelPackUsed !== true);
    }

    UseItem(item, player) {
        const s = ModPlayer.getByName('CalamityPlayerState');
        if (!s || s.ElectrolyteGelPackUsed === true)
            return false;
        s.ElectrolyteGelPackUsed = true;
        PlayerDB.set('calamity:player:adrenalineBoostOne', true);
        try {
            NewText('A Adrenalina foi fortalecida permanentemente!', 100, 255, 210);
        } catch (e) { }
        return true;
    }
}
