import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class AnechoicCoating extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Potions/AnechoicCoating';
        this.ResearchUnlockCount = 20;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 22;
        item.height = 26;
        item.maxStack = ModItem.CommonMaxStack;
        item.consumable = true;
        item.useStyle = 2;
        item.useTime = 17;
        item.useAnimation = 17;
        item.UseSound = Terraria.ID.SoundID.Item3;
        item.buffType = Number(ModBuff.getTypeByName('AnechoicCoatingBuff') || 0);
        item.buffTime = 14400;
        item.value = Terraria.Item.sellPrice(0, 0, 2, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
    }
}
