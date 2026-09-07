import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { InSulphurSpawn, CountNPC, TargetPlayer, PlayerCenter, NPCCenter, ApplyIrradiated, N, Clamp, ModeMultiplier, SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';

const { Vector2, Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function bestiary(entry, key) { try { const e = FlavorTextBestiaryInfoElement.new(); e._key = ModLocalization.Translate(key); entry.Info.Add(e); } catch (_) { } }
function modeValues() {
    const m = ModeMultiplier();
    if (m >= 2) return { ax: .6, ay: .2, capX: 20, capY: 10, land: 2.5 };
    if (m >= 1.5) return { ax: .45, ay: .15, capX: 15, capY: 7.5, land: 1 };
    return { ax: .3, ay: .1, capX: 10, capY: 5, land: 1 };
}
function dist(a, b) { const dx = b.x - a.x, dy = b.y - a.y; return { dx, dy, value: Math.sqrt(dx * dx + dy * dy) }; }

export class Trasher extends ModNPC {
    constructor() { super(); this.Texture = 'NPCs/SulphurousSea/Trasher'; this.BestiaryRarityStars = 2; }

    SetStaticDefaults() { Terraria.Main.npcFrameCount[this.Type] = 8; }

    SetDefaults() {
        const n = this.NPC;
        n.noGravity = true;
        n.damage = 50;
        n.width = 150;
        n.height = 40;
        n.defense = 22;
        n.lifeMax = 200;
        n.aiStyle = -1;
        n.value = Terraria.Item.buyPrice(0, 0, 3, 0);
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath5;
        n.knockBackResist = .15;
        n.chaseable = false;
        n.npcSlots = 1.5;
    }

    OnSpawn(n) {
        const s = CalamityNPCState.Reset(n);
        s.hasBeenHit = false;
        s.verticalDir = Math.random() < .5 ? -1 : 1;
        s.stuckTicks = 0;
        n.direction = Math.random() < .5 ? -1 : 1;
        n.directionY = s.verticalDir;
        n.spriteDirection = -n.direction;
    }

    SetBestiary(db, entry) { bestiary(entry, 'Bestiary.Trasher'); }

    SpawnChance(info) {
        if (!info || info.PlayerSafe || !InSulphurSpawn(info, 8)) return 0;
        return .05;
    }

    PreAI(n) {
        const s = CalamityNPCState.Get(n);
        if (n.justHit) { s.hasBeenHit = true; n.netUpdate = true; }
        n.chaseable = s.hasBeenHit === true;
        let vx = N(n.velocity?.X), vy = N(n.velocity?.Y);
        const player = TargetPlayer(n, false);
        const target = player ? dist(NPCCenter(n), PlayerCenter(player)) : null;
        n.spriteDirection = N(n.direction, 1) > 0 ? -1 : 1;

        if (n.wet) {
            n.noGravity = true;
            n.noTileCollide = false;
            let canAttack = s.hasBeenHit === true;
            if (player && !player.dead && player.wet && target && target.value < 200) canAttack = true;
            if (!player || player.dead) canAttack = false;
            if (canAttack) n.chaseable = true;

            if (!canAttack) {
                if (n.collideX) { vx *= -1; n.direction = -(N(n.direction, 1) || 1); n.netUpdate = true; }
                if (n.collideY) { vy *= -1; s.verticalDir = -(Number(s.verticalDir || 1)); n.directionY = s.verticalDir; n.netUpdate = true; }
                vx += (N(n.direction, 1) || 1) * .1;
                if (vx < -1.5 || vx > 1.5) vx *= .95;
                const yd = Number(s.verticalDir || 1);
                vy += yd * .01;
                if (vy > .3) s.verticalDir = -1;
                else if (vy < -.3) s.verticalDir = 1;
            } else if (target) {
                const m = modeValues();
                const dir = target.dx >= 0 ? 1 : -1;
                const dirY = target.dy >= 0 ? 1 : -1;
                n.direction = dir; n.directionY = dirY;
                vx = Clamp(vx + dir * m.ax, -m.capX, m.capX);
                vy = Clamp(vy + dirY * m.ay, -m.capY, m.capY);
            }
            if (Math.abs(vy) > .4) vy *= .95;
            SetNPCVelocity(n, s, vx, vy);
        } else {
            n.noGravity = false;
            n.noTileCollide = false;
            if (player && target) n.direction = target.dx >= 0 ? 1 : -1;
            let boost = 1;
            const lifeRatio = N(n.lifeMax) > 0 ? N(n.life) / N(n.lifeMax) : 1;
            if (lifeRatio < .5) boost = 1.5;
            if (lifeRatio < .25) boost = 2.5;
            if (ModeMultiplier() >= 2) boost = 2.5;

            if (target && Math.abs(target.dx) < 20) vx *= .9;
            else vx = (vx * 20 + (N(n.direction, 1) || 1) * boost) / 21;

            if (n.collideX) { vy = -10; n.netUpdate = true; }
            const oldX = N(n.oldPosition?.X, N(n.position?.X));
            const oldY = N(n.oldPosition?.Y, N(n.position?.Y));
            if (Math.abs(oldX - N(n.position?.X)) < .01 && Math.abs(oldY - N(n.position?.Y)) < .01 && Math.abs(vx) > .1) s.stuckTicks = Number(s.stuckTicks || 0) + 1;
            else s.stuckTicks = 0;
            if (Number(s.stuckTicks) > 20) { vy = -10; s.stuckTicks = 0; n.netUpdate = true; }
            SetNPCVelocity(n, s, vx, Math.min(10, vy));
        }

        n.spriteDirection = N(n.direction, 1) > 0 ? -1 : 1;
        n.rotation = Clamp(N(n.velocity?.Y) * (N(n.direction, 1) || 1) * .05, -.1, .1);
        return false;
    }

    FindFrame(n, frameHeight) {
        const s = CalamityNPCState.Get(n);
        n.frameCounter = N(n.frameCounter) + (s.hasBeenHit ? 1.25 : 1);
        let frame = 0;
        if (N(n.frameCounter) < 6) frame = 0;
        else if (N(n.frameCounter) < 12) frame = 1;
        else if (N(n.frameCounter) < 18) frame = 2;
        else if (N(n.frameCounter) < 24) frame = 3;
        else { n.frameCounter = 0; frame = 0; }
        if (!n.wet) frame += 4;
        const r = n.frame; r.Y = frame * frameHeight; n.frame = r;
    }

    OnHitPlayer(n, target, source, damage) { if (N(damage) > 0) ApplyIrradiated(target, 180); }

    ModifyNPCLoot(loot) {
        try { loot.Add(ItemDropRule.Common(Terraria.ID.ItemID.DivingHelmet, 20, 1, 1)); } catch (_) { }
        const pet = Number(ModItem.getTypeByName('TrashmanTrashcan') || 0);
        if (pet > 0) try { loot.Add(ItemDropRule.Common(pet, 20, 1, 1)); } catch (_) { }
    }

    OnKill(n) {
        CalamityNPCState.Remove(n);
        if (Terraria.Main.netMode === 1) return;
        try {
            const angler = Terraria.ID.NPCID.Angler;
            const sleeping = Terraria.ID.NPCID.SleepingAngler;
            if (Terraria.NPC.AnyNPCs(angler) || Terraria.NPC.AnyNPCs(sleeping)) return;
            const c = NPCCenter(n);
            Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(c.x), Math.floor(c.y), angler, 0, 0, 0, 0, 0, 255);
        } catch (_) { }
    }

    HitEffect(n, hitDirection) {
        const dead = N(n.life) <= 0, count = dead ? 25 : 5;
        for (let i = 0; i < count; i++) {
            try { NewDust(Vector2.new(N(n.position.X), N(n.position.Y)), N(n.width), N(n.height), 5, N(hitDirection), -1, 0, Color.White, dead ? 1.05 : .9); } catch (_) { }
        }
    }
}
