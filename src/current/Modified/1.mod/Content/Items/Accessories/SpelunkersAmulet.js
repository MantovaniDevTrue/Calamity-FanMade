import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

function VanillaItemID(name, fallback) {
    try {
        const value = Number(Terraria.ID.ItemID[name]);
        if (Number.isFinite(value) && value > 0)
            return value;
    } catch (e) { }
    return Number(fallback) || 0;
}

export class SpelunkersAmulet extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/SpelunkersAmulet';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 22;
        item.height = 32;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 10, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.LightRed;
        item.accessory = true;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        player.pickSpeed = Number(player.pickSpeed || 1) - 0.1;
        player.findTreasure = true;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(VanillaItemID('GoldDust', 1348), 7)
            .AddIngredient(VanillaItemID('SpelunkerPotion', 296), 7)
            .AddTile(16)
            .Register();
    }
}
