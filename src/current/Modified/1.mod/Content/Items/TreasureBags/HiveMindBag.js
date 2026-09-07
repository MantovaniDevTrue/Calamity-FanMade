import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';

function Next(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Roll(denominator) {
    return Math.random() < 1 / Math.max(1, Math.floor(Number(denominator) || 1));
}

export class HiveMindBag extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/TreasureBags/HiveMindBag';
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
        const ItemID = Terraria.ID.ItemID;
        QuickSpawnItem(source, ItemID.GoldCoin, 5);
        QuickSpawnItem(source, ItemID.DemoniteBar, Next(15, 20));
        QuickSpawnItem(source, ItemID.RottenChunk, Next(15, 20));
        QuickSpawnItem(source, ItemID.CorruptSeeds, Next(10, 15));
        if (Terraria.Main.hardMode === true)
            QuickSpawnItem(source, ItemID.CursedFlame, Next(25, 30));
        const mask = Number(ModItem.getTypeByName('HiveMindMask') || 0);
        if (mask > 0 && Roll(7))
            QuickSpawnItem(source, mask, 1);
        const weapons = ['PerfectDark', 'Shadethrower', 'ShaderainStaff', 'DankStaff', 'RotBall']
            .map(name => Number(ModItem.getTypeByName(name) || 0)).filter(type => type > 0);
        let dropped = false;
        for (const type of weapons) {
            if (!Roll(3))
                continue;
            QuickSpawnItem(source, type, 1);
            dropped = true;
        }
        if (!dropped && weapons.length === 5)
            QuickSpawnItem(source, weapons[Math.floor(Math.random() * weapons.length)], 1);
        const filthyGlove = Number(ModItem.getTypeByName('FilthyGlove') || 0);
        const rottenBrain = Number(ModItem.getTypeByName('RottenBrain') || 0);
        const rottingEyeball = Number(ModItem.getTypeByName('RottingEyeball') || 0);
        const thankYouPainting = Number(ModItem.getTypeByName('ThankYouPainting') || 0);
        if (filthyGlove > 0 && Roll(3))
            QuickSpawnItem(source, filthyGlove, 1);
        if (rottenBrain > 0)
            QuickSpawnItem(source, rottenBrain, 1);
        const world = ModSystem.getByName('CalamityWorldState');
        if (world && world.RevengeanceMode === true && Roll(20)) {
            const revAccessories = ['HeartofDarkness', 'StressPills']
                .map(name => Number(ModItem.getTypeByName(name) || 0)).filter(type => type > 0);
            if (revAccessories.length > 0)
                QuickSpawnItem(source, revAccessories[Math.floor(Math.random() * revAccessories.length)], 1);
        }
        if (rottingEyeball > 0 && Roll(10))
            QuickSpawnItem(source, rottingEyeball, 1);
        if (thankYouPainting > 0 && Roll(100))
            QuickSpawnItem(source, thankYouPainting, 1);
    }
}
