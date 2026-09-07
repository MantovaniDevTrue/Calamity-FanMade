import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

function Next(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Roll(denominator) {
    return Math.random() < 1 / Math.max(1, Math.floor(Number(denominator) || 1));
}

export class CrabulonBag extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/TreasureBags/CrabulonBag';
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
        const mask = Number(ModItem.getTypeByName('CrabulonMask') || 0);
        QuickSpawnItem(source, Terraria.ID.ItemID.GoldCoin, 5);
        QuickSpawnItem(source, Terraria.ID.ItemID.GlowingMushroom, Next(25, 35));
        QuickSpawnItem(source, Terraria.ID.ItemID.MushroomGrassSeeds, Next(5, 10));
        if (mask > 0 && Roll(7))
            QuickSpawnItem(source, mask, 1);
        const painting = Number(ModItem.getTypeByName('ThankYouPainting') || 0);
        if (painting > 0 && Roll(100))
            QuickSpawnItem(source, painting, 1);
        const weapons = [
            Number(ModItem.getTypeByName('MycelialClaws') || 0),
            Number(ModItem.getTypeByName('Fungicide') || 0),
            Number(ModItem.getTypeByName('HyphaeRod') || 0),
            Number(ModItem.getTypeByName('InfestedClawmerang') || 0),
            Number(ModItem.getTypeByName('Mycoroot') || 0),
            Number(ModItem.getTypeByName('PuffShroom') || 0)
        ].filter(type => type > 0);
        let weaponDropped = false;
        for (const weapon of weapons) {
            if (!Roll(3))
                continue;
            QuickSpawnItem(source, weapon, 1);
            weaponDropped = true;
        }
        if (!weaponDropped && weapons.length === 6) {
            QuickSpawnItem(source, weapons[Math.floor(Math.random() * weapons.length)], 1);
        }
        const fungalClump = Number(ModItem.getTypeByName('FungalClump') || 0);
        if (fungalClump > 0)
            QuickSpawnItem(source, fungalClump, 1);
    }
}
