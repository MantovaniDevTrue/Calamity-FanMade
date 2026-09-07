import { Terraria } from './../../../../../TL/ModImports.js';
import { ModItem } from './../../../../../TL/ModItem.js';
import { ModSystem } from './../../../../../TL/ModSystem.js';

export class PerforatorsRelic extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Furniture/BossRelics/PerforatorsRelic';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.CloneDefaults(Number(Terraria.ID.ItemID.KingSlimeMasterTrophy || 4924));
        const i = this.Item;
        i.createTile = 617;
        i.placeStyle = 0;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.useAnimation = 15;
        i.useTime = 10;
        i.useTurn = true;
        i.autoReuse = true;
        i.consumable = true;
        i.width = 30;
        i.height = 40;
        i.maxStack = ModItem.CommonMaxStack;
        i.value = Terraria.Item.sellPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Master;
    }

    CanUseItem(item, player) {
        const s = ModSystem.getByName('PerforatorRelicSystem');
        if (s)
            s.MarkPending(player);
        return true;
    }
}
