import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class SulphurskinPotion extends ModItem {
    constructor() { super(); this.Texture = 'Items/Potions/SulphurskinPotion'; this.ResearchUnlockCount = 20; }
    SetDefaults() {
        const i = this.Item;
        i.width = 22; i.height = 26; i.maxStack = ModItem.CommonMaxStack; i.consumable = true;
        i.useStyle = 2; i.useTime = 17; i.useAnimation = 17; i.UseSound = Terraria.ID.SoundID.Item3;
        i.buffType = Number(ModBuff.getTypeByName('SulphurskinBuff') || 0); i.buffTime = 14400;
        i.value = Terraria.Item.sellPrice(0, 0, 2, 0); i.rare = Terraria.ID.ItemRarityID.Green;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(126, 1)
            .AddIngredient(ModItem.getTypeByName('SulphurousSand'), 1)
            .AddIngredient(317, 1)
            .AddTile(13)
            .Register();
    }
}
