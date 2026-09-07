import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

function vanilla(name, fallback) {
    try {
        const value = Number(Terraria.ID.ItemID[name]);
        if (Number.isFinite(value) && value > 0) return value;
    } catch (e) { }
    return Number(fallback) || 0;
}

export class CoinofDeceit extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/CoinofDeceit';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 20;
        item.height = 22;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.accessory = true;
        item.rare = Terraria.ID.ItemRarityID.Blue;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (!state || !state.IsLocalPlayer(player)) return;
        state.RogueStealthCostFraction = Math.min(Number(state.RogueStealthCostFraction) || 1, 0.9);
        state.RogueCritBonus += 6;
    }

    AddRecipes() {
        const copper = vanilla('CopperBar', 20);
        const tin = vanilla('TinBar', 703);
        const demonite = vanilla('DemoniteBar', 57);
        const crimtane = vanilla('CrimtaneBar', 1257);
        for (const earlyBar of [copper, tin]) {
            for (const evilBar of [demonite, crimtane]) {
                this.CreateRecipe()
                    .AddIngredient(earlyBar, 12)
                    .AddIngredient(evilBar, 8)
                    .AddTile(Terraria.ID.TileID.Anvils)
                    .Register();
            }
        }
    }
}
