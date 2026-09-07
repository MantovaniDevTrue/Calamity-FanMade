import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModRecipe } from './../../../TL/ModRecipe.js';

export class RogueEmblem extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/RogueEmblem';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 24;
        this.Item.height = 24;
        this.Item.maxStack = 1;
        this.Item.accessory = true;
        this.Item.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.LightRed;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.RogueEmblemEquipped = true;
    }

    AddRecipes() {
        new ModRecipe().SetResult(935, 1)
            .AddIngredient(this.Type, 1)
            .AddIngredient(548, 5)
            .AddIngredient(549, 5)
            .AddIngredient(547, 5)
            .AddTile(Terraria.ID.TileID.TinkerersWorkbench)
            .Register();
    }
}
