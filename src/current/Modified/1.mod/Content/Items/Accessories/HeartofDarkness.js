import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class HeartofDarkness extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/HeartofDarkness';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 46;
        this.Item.height = 66;
        this.Item.maxStack = 1;
        this.Item.accessory = true;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('accessory');
    }

    PostSetupContent() {
        try {
            const heart = Number(this.Type);
            const pills = Number(ModItem.getTypeByName('StressPills') || 0);
            const sets = Terraria.ID.ItemID.Sets;
            const needed = Math.max(heart, pills) + 1;
            if (sets.ShimmerTransformToItem && Number(sets.ShimmerTransformToItem.length) < needed) {
                sets.ShimmerTransformToItem = sets.ShimmerTransformToItem.cloneResized(needed);
            }
            if (sets.ShimmerTransformToItem && heart > 0 && pills > 0) {
                sets.ShimmerTransformToItem[heart] = pills;
                sets.ShimmerTransformToItem[pills] = heart;
            }
            if (sets.AnimatesAsSoul && Number(sets.AnimatesAsSoul.length) < needed) {
                sets.AnimatesAsSoul = sets.AnimatesAsSoul.cloneResized(needed);
            }
            if (sets.AnimatesAsSoul && heart > 0)
                sets.AnimatesAsSoul[heart] = true;
        } catch (e) {
            tl.log(`[CalamityPort] Revengeance accessory Shimmer bridge unavailable: ${e}`);
        }
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.HeartOfDarknessEquipped = true;
    }
}
