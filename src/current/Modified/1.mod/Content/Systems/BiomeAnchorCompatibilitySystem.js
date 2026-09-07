import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { BiomeAnchorTiles, BiomeAnchorItems } from './../../Core/BiomeAnchorIDs.js';

const { Color } = Modules;
const INVALID_RECIPE_ITEM = 5013;
export class BiomeAnchorCompatibilitySystem extends ModSystem {
    constructor() {
        super();
        this.DisabledRecipes = 0;
        this.Applied = false;
    }

    SetupContent() {
        this.SetMapColors();
    }

    SetMapColors() {
        try {
            Terraria.Main.tileMergeDirt[BiomeAnchorTiles.SunkenEutrophic] = true;
            Terraria.Main.tileMergeDirt[BiomeAnchorTiles.SulphurousSand] = true;
        } catch (e) { }
        try {
            const sunken = Terraria.Map.MapHelper.tileLookup[BiomeAnchorTiles.SunkenEutrophic];
            const sulphurous = Terraria.Map.MapHelper.tileLookup[BiomeAnchorTiles.SulphurousSand];
            Terraria.Map.MapHelper.colorLookup[sunken] = Color.new(64, 144, 164);
            Terraria.Map.MapHelper.colorLookup[sulphurous] = Color.new(166, 156, 72);
        } catch (e) { }
    }

    DisableRecipes() {
        if (this.Applied)
            return;
        this.Applied = true;
        this.DisabledRecipes = 0;
        const blockedItems = new Set([
            BiomeAnchorItems.SunkenEutrophic,
            BiomeAnchorItems.SulphurousSand
        ]);
        const recipes = Terraria.Main.recipe;
        if (!recipes)
            return;
        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];
            if (!recipe || !recipe.createItem)
                continue;
            if (!blockedItems.has(Number(recipe.createItem.type)))
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

    PostSetupContent() {
        this.DisableRecipes();
    }

    GetStatus() {
        return `sunkenTile=${BiomeAnchorTiles.SunkenEutrophic} sulphurTile=${BiomeAnchorTiles.SulphurousSand} disabledRecipes=${this.DisabledRecipes} applied=${this.Applied}`;
    }
}
