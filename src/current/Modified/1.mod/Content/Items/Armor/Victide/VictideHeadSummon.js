import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { ApplyVictideArmorSet, AddVictideClassDamage } from './../../../../Core/VictideRuntime.js';

export class VictideHeadSummon extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Victide/VictideHeadSummon';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 18;
        item.height = 18;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.defense = 1;
    }

    AddArmorSets() {
        this.CreateArmorSet(this.Type, ModItem.getTypeByName('VictideBreastplate'), ModItem.getTypeByName('VictideGreaves'), 'ArmorSetBonus.Empty');
    }

    UpdateEquip(item, player) {
        AddVictideClassDamage(player, 'summon', 0.10);
    }

    UpdateArmorSet(item, player) {
        player.setBonus = ModLocalization.getTranslationArmorSetBonus('VictideSummon');
        ApplyVictideArmorSet(player, item, 'summon');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('SeaRemains'), 3)
            .AddTile(16)
            .Register();
    }
}
