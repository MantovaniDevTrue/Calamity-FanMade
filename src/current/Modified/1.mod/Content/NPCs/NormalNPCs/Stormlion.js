import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { SunkenSeaPreviewRuntime } from './../../../Core/SunkenSeaPreviewRuntime.js';

const { Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const SandDustType = Number.isFinite(Number(Terraria.ID.DustID.Sand)) ? Math.floor(Number(Terraria.ID.DustID.Sand)) : 32;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

export class Stormlion extends ModNPC {
    constructor() { super(); this.Texture = 'NPCs/NormalNPCs/Stormlion'; this.BestiaryRarityStars = 2; }
    SetStaticDefaults() { Terraria.Main.npcFrameCount[this.Type] = 6; }
    SetDefaults() {
        const n = this.NPC;
        n.damage = 20; n.aiStyle = 3; n.width = 33; n.height = 31; n.defense = 8; n.lifeMax = 100;
        n.knockBackResist = 0.2; n.value = Terraria.Item.buyPrice(0, 0, 2, 0); n.npcSlots = 0.8;
        n.HitSound = Terraria.ID.SoundID.NPCHit4; n.DeathSound = Terraria.ID.SoundID.NPCDeath14;
    }
    SetBestiary(database, entry) {
        entry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.UndergroundDesert);
        const flavor = FlavorTextBestiaryInfoElement.new(); flavor._key = ModLocalization.Translate('Bestiary.Stormlion'); entry.Info.Add(flavor);
    }
    SpawnChance(info) {
        if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe)
            return 0;
        if (SunkenSeaPreviewRuntime.ContainsPlayer(info.Player))
            return 0;
        if (info.Player.ZoneDesert !== true || info.Player.ZoneCorrupt || info.Player.ZoneCrimson)
            return 0;
        let storm = false;
        try { storm = Terraria.Main.IsItStorming === true; } catch (_) { }
        if (!storm) try { storm = Terraria.GameContent.Events.Sandstorm.Happening === true; } catch (_) { }
        if (info.AboveSurface)
            return storm ? 0.085 : 0;
        return 0.045;
    }
    FindFrame(npc, frameHeight) {
        npc.spriteDirection = -npc.direction;
        const moving = Math.abs(Number(npc.velocity.X)) > 0.12;
        npc.frameCounter += moving ? 1 + Math.abs(Number(npc.velocity.X)) * 0.4 : 0.25;
        const frame = moving ? Math.floor(npc.frameCounter / 6) % 6 : 0;
        const rect = npc.frame; rect.Y = frame * frameHeight; npc.frame = rect;
    }
    OnHitPlayer(npc, target, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        if (Number(damage) <= 0 || !target) return;
        try { target.AddBuff(Terraria.ID.BuffID.Electrified, 120, false); } catch (e) { }
    }
    ModifyNPCLoot(npcLoot) {
        const mandible = Number(ModItem.getTypeByName('StormlionMandible') || 0);
        if (mandible > 0) npcLoot.Add(ItemDropRule.Common(mandible, 1, 1, 1));
        const stormjaw = Number(ModItem.getTypeByName('StormjawStaff') || 0);
        if (stormjaw > 0) npcLoot.Add(ItemDropRule.Common(stormjaw, 5, 1, 1));
    }
    HitEffect(npc, hitDirection, damage) {
        const count = npc.life <= 0 ? 20 : 5;
        for (let i = 0; i < count; i++)
            NewDust(npc.position, npc.width, npc.height, SandDustType, hitDirection, -1, 0, Color.White, 1);
    }
}
