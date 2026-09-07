import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class RottenBrain extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/RottenBrain';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 34;
        this.Item.height = 34;
        this.Item.maxStack = 1;
        this.Item.accessory = true;
        this.Item.expert = true;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.RottenBrainEquipped = true;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('BloodyWormTooth'), 1)
            .AddTile(Terraria.ID.TileID.TinkerersWorkbench)
            .SetProperty('needGraveyardBiome', true)
            .SetProperty('notDecraftable', true)
            .Register();
    }
}
