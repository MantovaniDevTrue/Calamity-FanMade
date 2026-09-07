import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { AerialiteAnchorTiles } from './../../../../Core/AerialiteAnchorIDs.js';
import { AerialiteMaterialRuntime } from './../../../../Core/AerialiteMaterialRuntime.js';

export class AerialiteOreDisenchanted extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Ores/AerialiteOreDisenchanted';
        this.ResearchUnlockCount = 100;
    }
    SetDefaults() {
        this.DefaultToPlaceableTile(AerialiteAnchorTiles.Dormant, 0);
        const item = this.Item;
        item.width = 20; item.height = 20; item.maxStack = ModItem.CommonMaxStack;
        item.value = Terraria.Item.sellPrice(0, 0, 6, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.material = true;
    }
    CanUseItem(item, player) { AerialiteMaterialRuntime.MarkPending(player, 'dormant'); return true; }
}
