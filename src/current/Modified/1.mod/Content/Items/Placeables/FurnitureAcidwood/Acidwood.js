import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class Acidwood extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/FurnitureAcidwood/Acidwood';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        this.Item.width = 16;
        this.Item.height = 16;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.rare = Terraria.ID.ItemRarityID.White;
        this.Item.value = 0;
        this.Item.material = true;
        this.MenuCategories.push('material');
    }
}
