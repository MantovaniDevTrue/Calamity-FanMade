import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class AcidwoodSword extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/AcidwoodSword';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.ShadewoodSword);
        const i = this.Item;
        i.width = 36;
        i.height = 40;
        i.damage = 12;
        i.useAnimation = 18;
        i.useTime = 18;
        i.knockBack = 3;
        i.melee = true;
        this.MenuCategories.push('melee');
    }

    AddRecipes() {
        const acidwood = Number(ModItem.getTypeByName('Acidwood') || 0);
        if (!(acidwood > 0)) return;
        this.CreateRecipe()
            .AddIngredient(acidwood, 7)
            .AddTile(Terraria.ID.TileID.WorkBenches)
            .Register();
    }
}
