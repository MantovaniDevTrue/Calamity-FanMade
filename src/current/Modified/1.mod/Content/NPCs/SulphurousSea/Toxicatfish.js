import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { GetAbyssAggroRange } from './../../../Core/AbyssAggroRuntime.js';
import { InSulphurSpawn, InAbyssLayer1Spawn, WaterAtSpawn, CountNPC, TargetPlayer, PlayerCenter, NPCCenter, ApplyIrradiated, ModeMultiplier, N, Clamp, SpawnAquaticNPC, SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';

const { Vector2, Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function bestiary(entry, key) {
    try { const e = FlavorTextBestiaryInfoElement.new(); e._key = ModLocalization.Translate(key); entry.Info.Add(e); } catch (_) { }
}

function distance(a, b) { const dx = b.x - a.x, dy = b.y - a.y; return { dx, dy, value: Math.sqrt(dx * dx + dy * dy) }; }

export class Toxicatfish extends ModNPC {
    constructor() { super(); this.Texture = 'NPCs/SulphurousSea/Toxicatfish'; this.BestiaryRarityStars = 1; }

    SetStaticDefaults() { Terraria.Main.npcFrameCount[this.Type] = 4; }

    SetDefaults() {
        const n = this.NPC;
        n.noGravity = true;
        n.damage = 30;
        n.width = 98;
        n.height = 40;
        n.defense = 12;
        n.lifeMax = 120;
        n.aiStyle = -1;
        n.value = Terraria.Item.buyPrice(0, 0, 1, 0);
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath40;
        n.knockBackResist = .8;
        n.chaseable = false;
        n.npcSlots = 1;
    }

    OnSpawn(n) {
        const s = CalamityNPCState.Reset(n);
        s.verticalDir = Math.random() < .5 ? -1 : 1;
        n.direction = Math.random() < .5 ? -1 : 1;
        n.directionY = s.verticalDir;
        n.spriteDirection = n.direction;
        n.chaseable = false;
    }

    SetBestiary(db, entry) { bestiary(entry, 'Bestiary.Toxicatfish'); }

    SpawnChance(info) {
        if (!WaterAtSpawn(info)) return 0;
        if (InSulphurSpawn(info, 8)) return .2;
        if (InAbyssLayer1Spawn(info, 8)) return .165;
        return 0;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 98, 40);
    }

    PreAI(n) {
        const s = CalamityNPCState.Get(n);
        if (n.justHit) n.chaseable = true;
        let vx = N(n.velocity?.X), vy = N(n.velocity?.Y);

        if (!n.wet) {
            vx *= .94;
            if (Math.abs(vx) < .2) vx = 0;
            vy = Math.min(12, vy + .4);
            SetNPCVelocity(n, s, vx, vy);
            n.rotation = Clamp(vy * (N(n.direction, 1) || 1) * .1, -.2, .2);
            return false;
        }

        const player = TargetPlayer(n, false);
        let hasTarget = n.chaseable === true;
        let target = null;
        if (player && player.active && !player.dead) {
            target = distance(NPCCenter(n), PlayerCenter(player));
            const detect = GetAbyssAggroRange(player, 160);
            if (player.wet && target.value < detect) { hasTarget = true; n.chaseable = true; }
        } else hasTarget = false;

        if (hasTarget && (!player || player.dead)) hasTarget = false;

        if (!hasTarget) {
            if (n.collideX) { vx *= -1; n.direction = -(N(n.direction, 1) || 1); n.netUpdate = true; }
            if (n.collideY) { vy *= -1; s.verticalDir = -(Number(s.verticalDir || 1)); n.netUpdate = true; }
            vx += (N(n.direction, 1) || 1) * .1;
            if (vx < -2.5 || vx > 2.5) vx *= .95;
            let yDir = Number(s.verticalDir || 1);
            vy += yDir * .01;
            if (vy > .3) { yDir = -1; vy *= .95; }
            if (vy < -.3) { yDir = 1; vy *= .95; }
            s.verticalDir = yDir;
            n.directionY = yDir;
        } else if (target) {
            const m = ModeMultiplier();
            const dir = target.dx >= 0 ? 1 : -1;
            const dirY = target.dy >= 0 ? 1 : -1;
            vx += dir * .25 * m;
            vy += dirY * .15 * m;
            vx = Clamp(vx, -8 * m, 8 * m);
            vy = Clamp(vy, -8 * m, 8 * m);
            n.direction = dir;
            n.directionY = dirY;
        }

        if (Math.abs(vy) > .4) vy *= .95;
        SetNPCVelocity(n, s, vx, vy);
        n.spriteDirection = N(n.direction, 1) > 0 ? 1 : -1;
        n.rotation = Clamp(vy * (N(n.direction, 1) || 1) * .1, -.2, .2);
        return false;
    }

    FindFrame(n, frameHeight) {
        if (!n.wet) { n.frameCounter = 0; return; }
        n.frameCounter = (N(n.frameCounter) + (n.chaseable ? .15 : .075)) % 4;
        const r = n.frame; r.Y = Math.floor(N(n.frameCounter)) * frameHeight; n.frame = r;
    }

    OnHitPlayer(n, target, source, damage) { if (N(damage) > 0) ApplyIrradiated(target, 180); }

    ModifyNPCLoot(loot) {
        try { loot.Add(ItemDropRule.Common(Terraria.ID.ItemID.DivingHelmet, 20, 1, 1)); } catch (_) { }
    }

    HitEffect(n, hitDirection) {
        const dead = N(n.life) <= 0, count = dead ? 25 : 5;
        for (let i = 0; i < count; i++) {
            try { NewDust(Vector2.new(N(n.position.X), N(n.position.Y)), N(n.width), N(n.height), 5, N(hitDirection), -1, 0, Color.White, dead ? 1.05 : .9); } catch (_) { }
        }
        if (dead) CalamityNPCState.Remove(n);
    }

    OnKill(n) { CalamityNPCState.Remove(n); }
}
