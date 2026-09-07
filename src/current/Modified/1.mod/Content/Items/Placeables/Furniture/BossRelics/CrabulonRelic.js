import { Terraria } from './../../../../../TL/ModImports.js';
import { ModItem } from './../../../../../TL/ModItem.js';
import { ModSystem } from './../../../../../TL/ModSystem.js';

export class CrabulonRelic extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Furniture/BossRelics/CrabulonRelic';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const template = Number(Terraria.ID.ItemID.KingSlimeMasterTrophy || 4924);
        this.CloneDefaults(Number.isFinite(template) && template > 0 ? template : 4924);
        const masterTrophyBase = 617;
        this.Item.createTile = Number.isFinite(masterTrophyBase) && masterTrophyBase > 0 ? masterTrophyBase : 617;
        this.Item.placeStyle = 0;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        this.Item.useAnimation = 15;
        this.Item.useTime = 10;
        this.Item.useTurn = true;
        this.Item.autoReuse = true;
        this.Item.consumable = true;
        this.Item.width = 30;
        this.Item.height = 40;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.value = Terraria.Item.sellPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Master;
    }

    CanUseItem(item, player) {
        const system = ModSystem.getByName('CrabulonRelicSystem');
        if (system)
            system.MarkPending(player);
        return true;
    }
}
