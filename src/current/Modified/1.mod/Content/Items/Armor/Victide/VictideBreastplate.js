import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { IsVictideSubmerged } from './../../../../Core/VictideRuntime.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';

export class VictideBreastplate extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Victide/VictideBreastplate';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 18;
        item.height = 18;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.defense = 5;
    }

    UpdateEquip(item, player) {
        player.endurance = Number(player.endurance || 0) + 0.05;
        player.meleeCrit = Number(player.meleeCrit || 0) + 5;
        player.rangedCrit = Number(player.rangedCrit || 0) + 5;
        player.magicCrit = Number(player.magicCrit || 0) + 5;
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.RogueCritBonus += 5;
        if (IsVictideSubmerged(player)) {
            player.statDefense = Number(player.statDefense || 0) + 5;
            player.endurance = Number(player.endurance || 0) + 0.10;
        }
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('SeaRemains'), 5)
            .AddTile(16)
            .Register();
    }
}
