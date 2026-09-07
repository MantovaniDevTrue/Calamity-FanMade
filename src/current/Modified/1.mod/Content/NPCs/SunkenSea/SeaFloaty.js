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

export class SeaFloaty extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SunkenSea/SeaFloaty';
        this.BestiaryRarityStars = 1;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 6;
    }

    SetDefaults() {
        const n = this.NPC;
        n.npcSlots = 0.5;
        n.aiStyle = -1;
        n.damage = 5;
        n.width = 72;
        n.height = 22;
        n.defense = 0;
        n.lifeMax = 50;
        n.knockBackResist = 0.5;
        n.value = Terraria.Item.buyPrice(0, 0, 0, 50);
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        n.noGravity = true;
        n.noTileCollide = false;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        s.hasBeenHit = false;
        s.age = 0;
        npc.direction = Math.random() < 0.5 ? -1 : 1;
    }

    SetBestiary(database, entry) {
        AddBestiary(entry, 'Bestiary.SeaFloaty');
    }

    SpawnChance(info) {
        return InSunken(info) ? 0.083 : 0;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 72, 22);
    }

    PreAI(npc) {
        const s = CalamityNPCState.Get(npc);
        s.age = Number(s.age || 0) + 1;
        let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
        if (!s.hasBeenHit) {
            vx += Number(npc.direction || 1) * 0.10;
            if (Math.abs(vx) > 2.5)
                vx *= 0.95;
            vy = Math.sin(Number(s.age) * 0.045) * 0.35;
            if (npc.collideX) {
                vx *= -1;
                npc.direction *= -1;
                npc.netUpdate = true;
            }
            npc.damage = 5;
        } else {
            npc.TargetClosest(true);
            const p = Terraria.Main.player[Number(npc.target)];
            if (p && !p.dead) {
                const c = CenterOf(npc);
                if (c) {
                    const dx = c.x - Terraria.PlayerCenterX(p), dy = c.y - Terraria.PlayerCenterY(p), l = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                    vx += dx / l * 0.5;
                    vy += dy / l * 0.3;
                }
            }
            vx = Math.max(-10, Math.min(10, vx));
            vy = Math.max(-10, Math.min(10, vy));
            npc.rotation = Math.max(-0.3, Math.min(0.3, vx * 0.1));
            npc.damage = 5;
        }
        npc.velocity = Vector2.new(vx, vy);
        npc.spriteDirection = vx > 0 ? -1 : 1;
        return false;
    }

    OnHitByPlayer(npc) {
        const s = CalamityNPCState.Get(npc);
        if (!s.hasBeenHit) {
            s.hasBeenHit = true;
            npc.noTileCollide = true;
            npc.netUpdate = true;
        }
    }

    FindFrame(npc, h) {
        const s = CalamityNPCState.Get(npc);
        npc.frameCounter += s.hasBeenHit ? 0.30 : 0.15;
        const f = Math.floor(Number(npc.frameCounter)) % 6;
        const r = npc.frame;
        r.Y = f * h;
        npc.frame = r;
    }

    HitEffect(npc) {
        DustAt(npc, 68, npc.life <= 0 ? 24 : 5, npc.life <= 0 ? 1.05 : 0.8);
        if (npc.life <= 0)
            CalamityNPCState.Remove(npc);
    }
}
