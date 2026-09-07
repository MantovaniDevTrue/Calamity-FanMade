import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { AcidRainTier1Runtime } from './../../../Core/AcidRainTier1Runtime.js';

export class CausticTear extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/SummonItems/Invasion/CausticTear';
        this.ResearchUnlockCount = 3;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 16;
        i.height = 28;
        i.consumable = true;
        i.maxStack = ModItem.CommonMaxStack;
        i.useAnimation = 10;
        i.useTime = 10;
        i.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        i.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('tool');
    }

    CanUseItem() {
        return AcidRainTier1Runtime.Active !== true &&
            AcidRainTier1Runtime.IsBiomeReady() === true &&
            AcidRainTier1Runtime.CanStartFromProgress() === true;
    }

    UseItem() {
        const result = AcidRainTier1Runtime.Start(true, 'caustic-tear');
        return result && result.ok === true;
    }

    AddRecipes() {
        const scale = Number(ModItem.getTypeByName('SulphuricScale') || 0);
        if (scale <= 0) return;
        this.CreateRecipe()
            .AddIngredient(scale, 1)
            .SetProperty('needWater', true)
            .Register();
    }
}
