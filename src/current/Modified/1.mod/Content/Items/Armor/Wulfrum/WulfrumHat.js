import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';

export class WulfrumHat extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Wulfrum/WulfrumHat';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 30;
        item.height = 26;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
        item.defense = 1;
    }

    AddArmorSets() {
        this.CreateArmorSet(this.Type, ModItem.getTypeByName('WulfrumJacket'), ModItem.getTypeByName('WulfrumOveralls'), 'ArmorSetBonus.Empty');
    }

    UpdateEquip(item, player) {
        player.minionDamage += 0.05;
    }

    UpdateArmorSet(item, player) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && typeof state.ApplyWulfrumSet === 'function')
            state.ApplyWulfrumSet(player);
        else
            player.setBonus = ModLocalization.getTranslationArmorSetBonus('Wulfrum');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 5)
            .AddIngredient(ModItem.getTypeByName('EnergyCore'), 1)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
