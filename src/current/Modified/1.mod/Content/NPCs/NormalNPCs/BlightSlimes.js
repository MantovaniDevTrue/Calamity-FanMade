import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { AbyssLayer1Runtime } from './../../../Core/AbyssLayer1Runtime.js';

const { Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function speed(npc) {
    const x = Number(npc.velocity.X) || 0;
    const y = Number(npc.velocity.Y) || 0;
    return Math.sqrt(x * x + y * y);
}
function addRareDrop(loot, itemType) {
    try { loot.Add(ItemDropRule.NormalvsExpert(itemType, 100, 50)); }
    catch (e) { loot.Add(ItemDropRule.Common(itemType, 100, 1, 1)); }
}

class BlightSlimeBase extends ModNPC {
    constructor(texture, evil, dustType, debuffType, rareDrop) {
        super();
        this.Texture = texture;
        this.Evil = evil;
        this.DustType = dustType;
        this.DebuffType = debuffType;
        this.RareDrop = rareDrop;
        this.BestiaryRarityStars = 2;
        this.AIType = Terraria.ID.NPCID.DungeonSlime;
        this.AnimationType = Terraria.ID.NPCID.RainbowSlime;
    }
    SetStaticDefaults() { Terraria.Main.npcFrameCount[this.Type] = 4; }
    SetDefaults() {
        const n = this.NPC;
        n.aiStyle = 1;
        n.damage = 30;
        n.width = 60;
        n.height = 42;
        n.defense = 8;
        n.lifeMax = 130;
        n.knockBackResist = 0.3;
        n.value = Terraria.Item.buyPrice(0, 0, 1, 0);
        n.alpha = 105;
        n.lavaImmune = false;
        n.noGravity = false;
        n.noTileCollide = false;
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }
    SetBestiary(database, entry) {
        try {
            const biome = this.Evil === 'crimson' ? BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.TheCrimson : BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.TheCorruption;
            entry.Info.Add(biome);
            const flavor = FlavorTextBestiaryInfoElement.new();
            flavor._key = ModLocalization.Translate('Bestiary.BlightSlime');
            entry.Info.Add(flavor);
        } catch (e) { }
    }
    SpawnChance(info) {
        if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe) return 0;
        if (AbyssLayer1Runtime.ContainsAbyssPlayer(info.Player)) return 0;
        if (this.Evil === 'crimson') return info.Player.ZoneCrimson === true ? 0.15 : 0;
        return info.Player.ZoneCorrupt === true ? 0.15 : 0;
    }
    AI(npc) {
        const vy = Number(npc.velocity.Y) || 0;
        npc.damage = (Math.abs(vy) < 0.001 || speed(npc) < 3) ? 0 : Number(npc.defDamage || 30);
    }
    OnHitPlayer(npc, target, damageSource, damage) {
        if (Number(damage) <= 0 || !target) return;
        try { target.AddBuff(this.DebuffType, 240, true); } catch (e) { }
    }
    ModifyNPCLoot(loot) {
        const gel = Number(ModItem.getTypeByName('BlightedGel') || 0);
        loot.Add(ItemDropRule.Common(Terraria.ID.ItemID.Gel, 1, 10, 14));
        addRareDrop(loot, this.RareDrop);
        if (gel > 0) loot.Add(ItemDropRule.Common(gel, 1, 15, 21));
    }
    HitEffect(npc, hitDirection, damage) {
        const count = npc.life <= 0 ? 40 : (this.Evil === 'crimson' ? 5 : 3);
        for (let i = 0; i < count; i++) NewDust(npc.position, npc.width, npc.height, this.DustType, hitDirection, -1, 0, Color.White, 1);
    }
}

export class CrimulanBlightSlime extends BlightSlimeBase {
    constructor() { super('NPCs/NormalNPCs/CrimulanBlightSlime', 'crimson', Terraria.ID.DustID.Blood, Terraria.ID.BuffID.Darkness, Terraria.ID.ItemID.Blindfold); }
}

export class EbonianBlightSlime extends BlightSlimeBase {
    constructor() { super('NPCs/NormalNPCs/EbonianBlightSlime', 'corrupt', 14, Terraria.ID.BuffID.Weak, Terraria.ID.ItemID.Vitamins); }
}
