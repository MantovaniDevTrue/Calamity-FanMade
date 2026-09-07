import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class Bloodfin extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Fishing/Bloodfin';
        this.ResearchUnlockCount = 30;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 38;
        i.height = 36;
        i.maxStack = ModItem.CommonMaxStack;
        i.healLife = 240;
        i.potion = true;
        i.consumable = true;
        i.useStyle = 2;
        i.useTime = 17;
        i.useAnimation = 17;
        i.UseSound = Terraria.ID.SoundID.Item3;
        i.value = Terraria.Item.sellPrice(0, 5, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Cyan;
    }

    OnConsumeItem(item, player) {
        const b = Number(ModBuff.getTypeByName('BloodfinBoost') || 0);
        if (b > 0)
            try {
                player.AddBuff(b, 600, true);
            } catch (e) { }
    }
}
