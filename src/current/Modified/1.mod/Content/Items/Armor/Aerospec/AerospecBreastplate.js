import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';

export class AerospecBreastplate extends ModItem {
    constructor() { super(); this.Texture = 'Items/Armor/Aerospec/AerospecBreastplate'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const item = this.Item; item.width = 18; item.height = 18; item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0); item.rare = Terraria.ID.ItemRarityID.Orange; item.defense = 7;
    }
    UpdateEquip(item, player) {
        player.meleeDamage = Number(player.meleeDamage || 1) + 0.03;
        player.rangedDamage = Number(player.rangedDamage || 1) + 0.03;
        player.magicDamage = Number(player.magicDamage || 1) + 0.03;
        player.minionDamage = Number(player.minionDamage || player.summonDamage || 1) + 0.03;
        player.meleeCrit = Number(player.meleeCrit || 0) + 3;
        player.rangedCrit = Number(player.rangedCrit || 0) + 3;
        player.magicCrit = Number(player.magicCrit || 0) + 3;
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player)) { state.RogueDamageBonus += 0.03; state.RogueCritBonus += 3; }
    }
    AddRecipes() { this.CreateRecipe().AddIngredient(ModItem.getTypeByName('AerialiteBar'), 15).AddIngredient(320, 2).AddTile(16).Register(); }
}
