import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class AerospecLeggings extends ModItem {
    constructor() { super(); this.Texture = 'Items/Armor/Aerospec/AerospecLeggings'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const item = this.Item; item.width = 18; item.height = 18; item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0); item.rare = Terraria.ID.ItemRarityID.Orange; item.defense = 6;
    }
    UpdateEquip(item, player) { player.moveSpeed = Number(player.moveSpeed || 0) + 0.12; }
    AddRecipes() { this.CreateRecipe().AddIngredient(ModItem.getTypeByName('AerialiteBar'), 10).AddIngredient(320, 2).AddTile(16).Register(); }
}
