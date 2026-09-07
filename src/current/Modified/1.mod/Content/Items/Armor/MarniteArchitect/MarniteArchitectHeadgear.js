import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';

let AnyGoldCrown = null;
export class MarniteArchitectHeadgear extends ModItem {
    constructor() { super(); this.Texture = 'Items/Armor/MarniteArchitect/MarniteArchitectHeadgear'; this.ResearchUnlockCount = 1; }
    SetDefaults() { const i = this.Item; i.width = 18; i.height = 18; i.maxStack = 1; i.value = Terraria.Item.buyPrice(0, 1, 0, 0); i.rare = Terraria.ID.ItemRarityID.Blue; i.defense = 4; }
    UpdateEquip(item, player) { try { if (Number(Terraria.PlayerIndex(player)) !== Number(Terraria.Main.myPlayer)) return; Terraria.Player.tileRangeX = Number(Terraria.Player.tileRangeX) + 5; Terraria.Player.tileRangeY = Number(Terraria.Player.tileRangeY) + 5; } catch (_) { } }
    AddRecipeGroups() { if (AnyGoldCrown) return; const a = [Terraria.ID.ItemID.GoldCrown, Terraria.ID.ItemID.PlatinumCrown].map(Number).filter(v => v > 0); if (a.length) AnyGoldCrown = ModRecipe.CreateRecipeGroup('Any Gold Crown', a); }
    AddRecipes() { const r = this.CreateRecipe(); if (AnyGoldCrown) r.AddRecipeGroup(AnyGoldCrown, 1); else r.AddIngredient(Terraria.ID.ItemID.GoldCrown, 1); r.AddIngredient(Terraria.ID.ItemID.Granite, 5).AddIngredient(Terraria.ID.ItemID.Marble, 5).AddTile(Terraria.ID.TileID.Anvils).Register(); }
}
