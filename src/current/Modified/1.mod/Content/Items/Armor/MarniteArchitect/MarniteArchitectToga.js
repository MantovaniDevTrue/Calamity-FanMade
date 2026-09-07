import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';

let AnyGoldBar = null;
export class MarniteArchitectToga extends ModItem {
    constructor() { super(); this.Texture = 'Items/Armor/MarniteArchitect/MarniteArchitectToga'; this.ResearchUnlockCount = 1; }
    SetDefaults() { const i = this.Item; i.width = 18; i.height = 18; i.maxStack = 1; i.value = Terraria.Item.buyPrice(0, 1, 0, 0); i.rare = Terraria.ID.ItemRarityID.Blue; i.defense = 5; }
    UpdateEquip(item, player) { try { player.tileSpeed = Number(player.tileSpeed) + .5; player.wallSpeed = Number(player.wallSpeed) + .5; } catch (_) { } try { if (Number(item?.legSlot) >= 0) player.legs = Number(item.legSlot); } catch (_) { } }
    AddRecipeGroups() { if (AnyGoldBar) return; const a = [Terraria.ID.ItemID.GoldBar, Terraria.ID.ItemID.PlatinumBar].map(Number).filter(v => v > 0); if (a.length) AnyGoldBar = ModRecipe.CreateRecipeGroup('Any Gold Bar', a); }
    AddRecipes() { const r = this.CreateRecipe(); if (AnyGoldBar) r.AddRecipeGroup(AnyGoldBar, 2); else r.AddIngredient(Terraria.ID.ItemID.GoldBar, 2); r.AddIngredient(Terraria.ID.ItemID.Silk, 15).AddIngredient(Terraria.ID.ItemID.Granite, 15).AddIngredient(Terraria.ID.ItemID.Marble, 15).AddTile(Terraria.ID.TileID.Anvils).Register(); }
}
