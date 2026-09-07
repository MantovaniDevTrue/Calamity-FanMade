import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SunkenSeaPreviewRuntime } from './../../../Core/SunkenSeaPreviewRuntime.js';
import { WaterAtSpawn, SpawnAquaticNPC } from './../../../Core/SulphurousSeaEcologyRuntime.js';
import { HasClamity } from './../../../Core/GiantClamRuntime.js';

const { Vector2, Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const WetCollision = Terraria.Collision['bool WetCollision(Vector2 Position, int Width, int Height)'];
function RectOf(npc) {
    try {
        return npc['Rectangle getRect()']();
    } catch (e) {
        return null;
    }
}

function CenterOf(npc) {
    const r = RectOf(npc);
    return r ? { x: Number(r.X) + Number(r.Width) * 0.5, y: Number(r.Y) + Number(r.Height) * 0.5 } : null;
}

function IsWetNPC(npc) {
    const r = RectOf(npc);
    if (!r)
        return false;
    try {
        return WetCollision(Vector2.new(Number(r.X), Number(r.Y)), Math.floor(Number(r.Width)), Math.floor(Number(r.Height))) === true;
    } catch (e) {
        return false;
    }
}

function InSunken(info) {
    if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe)
        return false;
    if (HasClamity(info.Player))
        return false;
    if (!SunkenSeaPreviewRuntime.ContainsPlayer(info.Player))
        return false;
    return WaterAtSpawn(info);
}

function AddBestiary(entry, key) {
    try {
        const f = FlavorTextBestiaryInfoElement.new();
        f._key = ModLocalization.Translate(key);
        entry.Info.Add(f);
    } catch (e) { }
}

function DustAt(npc, type, count, scale = 1) {
    const r = RectOf(npc);
    if (!r)
        return;
    for (let i = 0; i < count; i++)
        NewDust(Vector2.new(Number(r.X), Number(r.Y)), Math.floor(Number(r.Width)), Math.floor(Number(r.Height)), type, (Math.random() - .5) * 2, (Math.random() - .5) * 2, 0, Color.White, scale);
}

export class SeaMinnow extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SunkenSea/SeaMinnow';
        this.BestiaryRarityStars = 1;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 4;
        try {
            Terraria.Main.npcCatchable[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const n = this.NPC;
        n.npcSlots = 0.1;
        n.noGravity = true;
        n.noTileCollide = false;
        n.damage = 0;
        n.width = 36;
        n.height = 22;
        n.defense = 0;
        n.lifeMax = 5;
        n.aiStyle = -1;
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        n.chaseable = false;
        const item = Number(ModItem.getTypeByName('SeaMinnowItem') || 0);
        if (item > 0)
            n.catchItem = item;
        n.knockBackResist = 0.8;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        s.age = 0;
        npc.direction = Math.random() < 0.5 ? -1 : 1;
    }

    SetBestiary(database, entry) {
        AddBestiary(entry, 'Bestiary.SeaMinnow');
    }

    SpawnChance(info) {
        return InSunken(info) ? 0.11 : 0;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 36, 22);
    }

    PreAI(npc) {
        const s = CalamityNPCState.Get(npc);
        s.age = Number(s.age || 0) + 1;
        let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
        if (!IsWetNPC(npc)) {
            vy = Math.min(10, vy + 0.3);
            vx *= 0.94;
        } else {
            npc.TargetClosest(false);
            const p = Terraria.Main.player[Number(npc.target)];
            let flee = false, dx = 0, dy = 0;
            if (p && !p.dead) {
                const c = CenterOf(npc);
                if (c) {
                    dx = c.x - Terraria.PlayerCenterX(p);
                    dy = c.y - Terraria.PlayerCenterY(p);
                    flee = dx * dx + dy * dy < 22500;
                }
            }
            if (flee) {
                const l = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                vx += dx / l * 0.25;
                vy += dy / l * 0.15;
                vx = Math.max(-6, Math.min(6, vx));
                vy = Math.max(-6, Math.min(6, vy));
            } else {
                vx += Number(npc.direction || 1) * 0.08;
                if (Math.abs(vx) > 2.5)
                    vx *= 0.95;
                vy += Math.sin(Number(s.age) * 0.035) * 0.018;
                vy = Math.max(-0.45, Math.min(0.45, vy));
            }
            if (npc.collideX) {
                vx *= -1;
                npc.direction *= -1;
            }
            if (npc.collideY)
                vy *= -1;
        }
        npc.velocity = Vector2.new(vx, vy);
        npc.direction = vx >= 0 ? 1 : -1;
        npc.spriteDirection = npc.direction;
        npc.rotation = Math.max(-0.1, Math.min(0.1, vx * 0.05));
        return false;
    }

    FindFrame(npc, h) {
        if (!IsWetNPC(npc)) {
            npc.frameCounter = 0;
            return;
        }
        npc.frameCounter += 0.075;
        const f = Math.floor(Number(npc.frameCounter)) % 4;
        const r = npc.frame;
        r.Y = f * h;
        npc.frame = r;
    }

    HitEffect(npc) {
        DustAt(npc, 68, 5, 0.75);
        if (npc.life <= 0)
            CalamityNPCState.Remove(npc);
    }
}
