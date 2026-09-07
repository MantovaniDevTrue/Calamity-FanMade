import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';

export class SnowRuffianMask extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/SnowRuffian/SnowRuffianMask';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 22;
        this.Item.height = 20;
        this.Item.maxStack = 1;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Blue;
        this.Item.defense = 2;
    }

    AddArmorSets() {
        this.CreateArmorSet(this.Type, ModItem.getTypeByName('SnowRuffianChestplate'), ModItem.getTypeByName('SnowRuffianGreaves'), 'ArmorSetBonus.Empty');
    }

    UpdateEquip(item, player) {
        player.rangedDamage += 0.05;
    }

    UpdateArmorSet(item, player) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && typeof state.ApplySnowRuffianSet === 'function') {
            state.ApplySnowRuffianSet(player);
        } else {
            player.setBonus = ModLocalization.getTranslationArmorSetBonus('SnowRuffian');
            const falling = player.gravDir === -1 ? Terraria.PlayerVelocity(player).Y < -0.05 : Terraria.PlayerVelocity(player).Y > 0.05;
            if (player.controlJump && falling) {
                player.noFallDmg = true;
                player.fallStart = Math.floor(Terraria.PlayerPositionY(player) / 16);
            }
        }
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(Terraria.ID.ItemID.BorealWood, 10)
            .AddIngredient(Terraria.ID.ItemID.Silk, 4)
            .AddIngredient(Terraria.ID.ItemID.FlinxFur, 1)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
