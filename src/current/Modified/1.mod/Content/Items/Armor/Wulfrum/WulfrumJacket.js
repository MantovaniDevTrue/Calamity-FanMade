import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class WulfrumJacket extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Wulfrum/WulfrumJacket';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 32;
        item.height = 20;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
        item.defense = 2;
    }

    UpdateEquip(item, player) {
        player.maxMinions = Number(player.maxMinions || 0) + 1;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 10)
            .AddIngredient(ModItem.getTypeByName('EnergyCore'), 1)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
