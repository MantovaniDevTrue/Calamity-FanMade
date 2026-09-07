import { Terraria } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModSystem } from './../../../TL/ModSystem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';

function Message(key) {
    ModLocalization.UpdateTranslations();
    const value = ModLocalization.Translations?.Messages?.[key];
    return typeof value === 'string' ? value : key;
}

const ShopItems = [
    'Shellshooter',
    'SnapClam',
    'SandDollar',
    'Waywasher',
    'AmidiasTrident',
    'EnchantedConch',
    'PolypLauncher'
];
export class SeaKing extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/TownNPCs/SeaKing';
        this.AnimationType = 22;
        this.BestiaryRarityStars = 3;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 25;
        try {
            Terraria.ID.NPCID.Sets.TownNPCBestiaryPriority.Add(this.Type);
        } catch (e) { }
    }

    SetDefaults() {
        const n = this.NPC;
        n.townNPC = true;
        n.friendly = true;
        n.width = 30;
        n.height = 58;
        n.aiStyle = 7;
        n.damage = 10;
        n.defense = 25;
        n.lifeMax = 7500;
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        n.knockBackResist = 0.65;
        n.housingCategory = 0;
    }

    CanTownNPCSpawn() {
        const world = ModSystem.getByName('CalamityWorldState');
        return !!(world && world.DownedGiantClam === true && world.DownedDesertScourge === true);
    }

    SetNPCNameList() {
        return ['Amidias'];
    }

    GetChat(npc) {
        const choices = Terraria.Main.dayTime === true
            ? ['SeaKing.ChatDay1', 'SeaKing.ChatDay2', 'SeaKing.ChatDay3']
            : ['SeaKing.ChatNight1', 'SeaKing.ChatNight2', 'SeaKing.ChatNight3'];
        if (npc.homeless === true)
            return Message('SeaKing.ChatHomeless');
        return Message(choices[Math.floor(Math.random() * choices.length)]);
    }

    SetChatButtons(npc, player, button1, button2) {
        button1.text = Message('SeaKing.ShopButton');
        button2.text = Message('SeaKing.AdviceButton');
    }

    Option1Clicked(npc, player) {
        this.OpenShop(npc, player, 99);
    }

    Option2Clicked(npc, player) {
        const buff = Number(ModBuff.getTypeByName('AmidiasBlessing') || 0);
        if (buff > 0)
            player.AddBuff(buff, 36000, false);
        Terraria.Main.npcChatText = Message('SeaKing.AdviceText');
    }

    SetupShop(npc, player, shop) {
        try {
            shop.Clear();
        } catch (e) { }
        for (const name of ShopItems) {
            const type = Number(ModItem.getTypeByName(name) || 0);
            if (type > 0 && !shop.HasItem(type))
                shop.Add(type);
        }
    }

    CanGoToStatue(npc, toKingStatue) {
        return toKingStatue === true;
    }
}
