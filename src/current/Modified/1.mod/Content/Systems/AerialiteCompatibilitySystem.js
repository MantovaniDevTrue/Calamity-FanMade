import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { AerialiteAnchorTiles, AerialiteAnchorItems } from './../../Core/AerialiteAnchorIDs.js';

const INVALID_RECIPE_ITEM = 5013;

export class AerialiteCompatibilitySystem extends ModSystem {
    constructor() {
        super();
        this.Applied = false;
        this.DisabledRecipes = 0;
    }

    SetupContent() {
        // White/Pink Team Blocks are only physical hosts for Aerialite. Do not mutate their
        // global tile flags or map colors: that changed legitimate vanilla Team Blocks across
        // the whole world. Mining/drop/visual behavior is now scoped by Aerialite metadata.
    }

    PostSetupContent() {
        if (this.Applied)
            return;
        this.Applied = true;
        const blocked = new Set([AerialiteAnchorItems.Dormant, AerialiteAnchorItems.Enchanted]);
        const recipes = Terraria.Main.recipe;
        if (!recipes)
            return;
        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];
            if (!recipe || !recipe.createItem || !blocked.has(Number(recipe.createItem.type)))
                continue;
            for (let j = 0; j < recipe.requiredItem.length; j++) {
                const ingredient = recipe.requiredItem[j];
                if (!ingredient || Number(ingredient.type) === 0)
                    continue;
                ingredient['void SetDefaults(int Type, ItemVariant variant)'](INVALID_RECIPE_ITEM, null);
                ingredient.stack = 1;
            }
            recipe.needMechdusa = true;
            recipe.notDecraftable = true;
            this.DisabledRecipes++;
        }
    }

    GetStatus() {
        return `dormantTile=${AerialiteAnchorTiles.Dormant} enchantedTile=${AerialiteAnchorTiles.Enchanted} disabledRecipes=${this.DisabledRecipes}`;
    }
}
