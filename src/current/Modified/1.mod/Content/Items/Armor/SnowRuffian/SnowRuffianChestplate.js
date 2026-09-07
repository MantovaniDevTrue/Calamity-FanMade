import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class SnowRuffianChestplate extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/SnowRuffian/SnowRuffianChestplate';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 30;
        this.Item.height = 20;
        this.Item.maxStack = 1;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Blue;
        this.Item.defense = 4;
    }

    UpdateEquip(item, player) {
        player.rangedCrit += 4;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(Terraria.ID.ItemID.BorealWood, 20)
            .AddIngredient(Terraria.ID.ItemID.Silk, 6)
            .AddIngredient(Terraria.ID.ItemID.FlinxFur, 2)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
