import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class WulfrumOveralls extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Wulfrum/WulfrumOveralls';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 20;
        item.height = 16;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
        item.defense = 1;
    }

    UpdateEquip(item, player) {
        player.minionDamage += 0.05;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 8)
            .AddIngredient(ModItem.getTypeByName('EnergyCore'), 1)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
