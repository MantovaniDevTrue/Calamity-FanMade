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

export class MirageMirror extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/MirageMirror';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 30;
        item.height = 30;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.accessory = true;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player)) {
            state.RogueStealthStandstillBonus += 0.25;
            state.RogueStealthMovingBonus += 0.12;
        }
        player.aggro = Number(player.aggro || 0) - 200;
    }

    AddRecipes() {
        const blackLens = vanilla('BlackLens', 236);
        const bone = vanilla('Bone', 154);
        const magicMirror = vanilla('MagicMirror', 50);
        const iceMirror = vanilla('IceMirror', 3199);
        const bench = Number(Terraria.ID.TileID.TinkerersWorkbench || 114);
        this.CreateRecipe().AddIngredient(magicMirror).AddIngredient(blackLens).AddIngredient(bone, 50).AddTile(bench).Register();
        this.CreateRecipe().AddIngredient(iceMirror).AddIngredient(blackLens).AddIngredient(bone, 50).AddTile(bench).Register();
    }
}
