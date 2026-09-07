import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';

function Next(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Roll(d) {
    return Math.random() < 1 / Math.max(1, Number(d));
}

function Spawn(player, source, type, stack = 1) {
    type = Number(type || 0);
    if (!(type > 0))
        return;
    try {
        player['void QuickSpawnItem(IEntitySource source, int item, int stack)'](source, type, Math.max(1, Math.floor(stack)));
    } catch (e) { }
}

export class PerforatorBag extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/TreasureBags/PerforatorBag';
        this.ResearchUnlockCount = 3;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.BossBag[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 24;
        i.height = 24;
        i.maxStack = ModItem.CommonMaxStack;
        i.consumable = true;
        i.rare = Terraria.ID.ItemRarityID.Cyan;
        i.expert = true;
    }

    OpenBossBag(item, player) {
        const source = player['IEntitySource GetItemSource_OpenItem(int itemType)'](item.type), ID = Terraria.ID.ItemID;
        Spawn(player, source, ID.GoldCoin, 5);
        Spawn(player, source, ID.CrimtaneBar, Next(15, 20));
        Spawn(player, source, ID.TissueSample, Next(15, 20));
        Spawn(player, source, ID.CrimsonSeeds, Next(10, 15));
        if (Terraria.Main.hardMode === true)
            Spawn(player, source, ID.Ichor, Next(25, 30));
        const weapons = ['Aorta', 'SausageMaker', 'VeinBurster', 'Eviscerator', 'BloodBath', 'FleshOfInfidelity', 'ToothBall'].map(n => Number(ModItem.getTypeByName(n) || 0)).filter(n => n > 0);
        if (weapons.length)
            Spawn(player, source, weapons[Math.floor(Math.random() * weapons.length)], 1);
        if (Roll(3))
            Spawn(player, source, ModItem.getTypeByName('BloodstainedGlove'), 1);
        Spawn(player, source, ModItem.getTypeByName('BloodyWormTooth'), 1);
        if (Roll(7))
            Spawn(player, source, ModItem.getTypeByName('PerforatorMask'), 1);
        if (Roll(10))
            Spawn(player, source, ModItem.getTypeByName('BloodyVein'), 1);
        if (Roll(100))
            Spawn(player, source, ModItem.getTypeByName('ThankYouPainting'), 1);
        const world = ModSystem.getByName('CalamityWorldState');
        if (world && world.RevengeanceMode === true && Roll(20)) {
            const choices = ['HeartofDarkness', 'StressPills'].map(n => Number(ModItem.getTypeByName(n) || 0)).filter(n => n > 0);
            if (choices.length)
                Spawn(player, source, choices[Math.floor(Math.random() * choices.length)], 1);
        }
    }
}
