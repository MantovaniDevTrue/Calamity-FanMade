import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

function Next(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Roll(denominator, numerator = 1) {
    return Math.random() < numerator / denominator;
}

export class DesertScourgeBag extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/TreasureBags/DesertScourgeBag';
        this.ResearchUnlockCount = 3;
    }

    SetStaticDefaults() {
        Terraria.ID.ItemID.Sets.BossBag[this.Type] = true;
    }

    SetDefaults() {
        this.Item.width = 24;
        this.Item.height = 24;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.consumable = true;
        this.Item.rare = Terraria.ID.ItemRarityID.Cyan;
        this.Item.expert = true;
    }

    OpenBossBag(item, player) {
        const source = player['IEntitySource GetItemSource_OpenItem(int itemType)'](item.type);
        const QuickSpawnItem = player['void QuickSpawnItem(IEntitySource source, int item, int stack)'];
        const pearl = ModItem.getTypeByName('PearlShard');
        const mask = ModItem.getTypeByName('DesertScourgeMask');
        const saharaSlicers = ModItem.getTypeByName('SaharaSlicers');
        const barinade = ModItem.getTypeByName('Barinade');
        const sandstream = ModItem.getTypeByName('SandstreamScepter');
        const brittleStar = ModItem.getTypeByName('BrittleStarStaff');
        const scourgeWeapon = ModItem.getTypeByName('ScourgeoftheDesert');
        if (pearl > 0)
            QuickSpawnItem(source, pearl, Next(30, 40));
        QuickSpawnItem(source, Terraria.ID.ItemID.Coral, Next(30, 40));
        QuickSpawnItem(source, Terraria.ID.ItemID.Seashell, Next(30, 40));
        QuickSpawnItem(source, Terraria.ID.ItemID.Starfish, Next(30, 40));
        QuickSpawnItem(source, Terraria.ID.ItemID.LesserHealingPotion, Next(5, 15));
        if (mask > 0 && Roll(7))
            QuickSpawnItem(source, mask, 1);
        const weapons = [saharaSlicers, barinade, sandstream, brittleStar, scourgeWeapon]
            .filter(type => Number(type) > 0);
        let droppedWeapon = false;
        for (const weapon of weapons) {
            if (!Roll(3))
                continue;
            QuickSpawnItem(source, weapon, 1);
            droppedWeapon = true;
        }
        if (!droppedWeapon && weapons.length > 0) {
            QuickSpawnItem(source, weapons[Next(0, weapons.length - 1)], 1);
        }
    }
}
