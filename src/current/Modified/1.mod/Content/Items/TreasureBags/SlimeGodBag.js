import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

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

export class SlimeGodBag extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/TreasureBags/SlimeGodBag';
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
        let source = null;
        try {
            source = player['IEntitySource GetItemSource_OpenItem(int itemType)'](item.type);
        } catch (e) { }
        if (!source)
            return;
        Spawn(player, source, Terraria.ID.ItemID.GoldCoin, 8);
        Spawn(player, source, ModItem.getTypeByName('PurifiedGel'), Next(40, 52));
        const weapons = ['OverloadedBlaster', 'AbyssalTome', 'EldritchTome', 'CorroslimeStaff', 'CrimslimeStaff'].map(n => Number(ModItem.getTypeByName(n) || 0)).filter(n => n > 0);
        let weaponDropped = false;
        for (const type of weapons) {
            if (Math.random() >= 1 / 3)
                continue;
            Spawn(player, source, type, 1);
            weaponDropped = true;
        }
        if (!weaponDropped && weapons.length)
            Spawn(player, source, weapons[Math.floor(Math.random() * weapons.length)], 1);
        Spawn(player, source, ModItem.getTypeByName('ManaPolarizer'), 1);
        if (Roll(7)) {
            const masks = ['SlimeGodMask', 'SlimeGodMask2'].map(n => Number(ModItem.getTypeByName(n) || 0)).filter(n => n > 0);
            if (masks.length)
                Spawn(player, source, masks[Math.floor(Math.random() * masks.length)], 1);
        }
        if (Roll(100))
            Spawn(player, source, ModItem.getTypeByName('ThankYouPainting'), 1);
        const world = ModSystem.getByName('CalamityWorldState');
        if (world && world.RevengeanceMode === true) {
            if (Roll(20)) {
                const choices = ['HeartofDarkness', 'StressPills'].map(n => Number(ModItem.getTypeByName(n) || 0)).filter(n => n > 0);
                if (choices.length)
                    Spawn(player, source, choices[Math.floor(Math.random() * choices.length)], 1);
            }
            const state = ModPlayer.getByName('CalamityPlayerState');
            if (state && state.ElectrolyteGelPackUsed !== true)
                Spawn(player, source, ModItem.getTypeByName('ElectrolyteGelPack'), 1);
        }
    }
}
