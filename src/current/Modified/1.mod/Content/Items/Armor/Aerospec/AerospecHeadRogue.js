import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { ApplyAerospecSet } from './../../../../Core/AerospecRuntime.js';

export class AerospecHeadRogue extends ModItem {
    constructor() { super(); this.Texture = 'Items/Armor/Aerospec/AerospecHeadRogue'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const item = this.Item; item.width = 18; item.height = 18; item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0); item.rare = Terraria.ID.ItemRarityID.Orange; item.defense = 4;
    }
    AddArmorSets() { this.CreateArmorSet(this.Type, ModItem.getTypeByName('AerospecBreastplate'), ModItem.getTypeByName('AerospecLeggings'), ''); }
    UpdateEquip(item, player) {}
    UpdateArmorSet(item, player) {
        player.setBonus = ModLocalization.getTranslationArmorSetBonus('AerospecRogue');
        ApplyAerospecSet(player, 'rogue');
    }
    AddRecipes() { this.CreateRecipe().AddIngredient(ModItem.getTypeByName('AerialiteBar'), 5).AddIngredient(320, 1).AddTile(16).Register(); }
}
