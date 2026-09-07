import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { AerialiteAnchorTiles } from './../../../../Core/AerialiteAnchorIDs.js';
import { AerialiteMaterialRuntime } from './../../../../Core/AerialiteMaterialRuntime.js';

export class AerialiteOre extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Ores/AerialiteOre';
        this.ResearchUnlockCount = 100;
    }
    SetStaticDefaults() {
        try { Terraria.ID.ItemID.Sets.SortingPriorityMaterials[this.Type] = 69; } catch (e) { }
    }
    SetDefaults() {
        this.DefaultToPlaceableTile(AerialiteAnchorTiles.Enchanted, 0);
        const item = this.Item;
        item.width = 20; item.height = 20; item.maxStack = ModItem.CommonMaxStack;
        item.value = Terraria.Item.sellPrice(0, 0, 6, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.material = true;
    }
    CanUseItem(item, player) { AerialiteMaterialRuntime.MarkPending(player, 'enchanted'); return true; }
}
