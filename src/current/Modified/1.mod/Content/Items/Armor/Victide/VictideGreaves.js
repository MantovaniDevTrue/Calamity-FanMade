import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { IsVictideSubmerged } from './../../../../Core/VictideRuntime.js';

export class VictideGreaves extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Victide/VictideGreaves';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 18;
        item.height = 18;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.defense = 4;
    }

    UpdateEquip(item, player) {
        player.moveSpeed = Number(player.moveSpeed || 1) + (IsVictideSubmerged(player) ? 0.30 : 0.08);
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('SeaRemains'), 4)
            .AddTile(16)
            .Register();
    }
}
