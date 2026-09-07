import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class SnowRuffianGreaves extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/SnowRuffian/SnowRuffianGreaves';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 22;
        this.Item.height = 18;
        this.Item.maxStack = 1;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Blue;
        this.Item.defense = 3;
    }

    UpdateEquip(item, player) {
        player.rangedDamage += 0.05;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(Terraria.ID.ItemID.BorealWood, 15)
            .AddIngredient(Terraria.ID.ItemID.Silk, 5)
            .AddIngredient(Terraria.ID.ItemID.FlinxFur, 1)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
