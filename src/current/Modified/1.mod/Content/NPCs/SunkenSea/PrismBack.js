import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';
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
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
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

function WorldState() {
    return ModSystem.getByName('CalamityWorldState');
}

export class PrismBack extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SunkenSea/PrismBack';
        this.BestiaryRarityStars = 2;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 5;
    }

    SetDefaults() {
        const n = this.NPC;
        n.npcSlots = 1;
        n.aiStyle = -1;
        n.damage = 20;
        n.width = 72;
        n.height = 58;
        n.defense = 15;
        n.lifeMax = 500;
        n.knockBackResist = 0.15;
        n.value = Terraria.Item.buyPrice(0, 0, 2, 0);
        n.HitSound = Terraria.ID.SoundID.NPCHit4;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        n.noGravity = true;
        n.noTileCollide = false;
        n.chaseable = false;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        s.age = 0;
        npc.direction = Math.random() < 0.5 ? -1 : 1;
    }

    SetBestiary(database, entry) {
        AddBestiary(entry, 'Bestiary.PrismBack');
    }

    SpawnChance(info) {
        return InSunken(info) ? 0.165 : 0;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 72, 58);
    }

    PreAI(npc) {
        const s = CalamityNPCState.Get(npc);
        s.age = Number(s.age || 0) + 1;
        let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
        if (!IsWetNPC(npc)) {
            vy = Math.min(9, vy + 0.30);
            vx *= 0.96;
        } else {
            vx += Number(npc.direction || 1) * 0.085;
            if (Math.abs(vx) > 2.2)
                vx *= 0.95;
            vy += Math.sin(Number(s.age) * 0.035) * 0.022;
            vy = Math.max(-0.65, Math.min(0.65, vy));
            if (npc.collideX) {
                vx *= -1;
                npc.direction *= -1;
            }
            if (npc.collideY)
                vy *= -0.7;
        }
        npc.velocity = Vector2.new(vx, vy);
        npc.direction = vx >= 0 ? 1 : -1;
        npc.spriteDirection = -npc.direction;
        npc.rotation = Math.max(-0.12, Math.min(0.12, vy * 0.08));
        const c = CenterOf(npc);
        if (c) {
            try {
                Terraria.Lighting.AddLight(Vector2.new(c.x, c.y), 0, 0.35, 0.45);
            } catch (e) { }
        }
        return false;
    }

    FindFrame(npc, h) {
        if (!IsWetNPC(npc))
            return;
        npc.frameCounter += 0.10;
        const r = npc.frame;
        r.Y = (Math.floor(Number(npc.frameCounter)) % 5) * h;
        npc.frame = r;
    }

    OnKill(npc) {
        const world = WorldState();
        if (world && world.DownedDesertScourge === true) {
            const shard = Number(ModItem.getTypeByName('PrismShard') || 0);
            const r = RectOf(npc);
            if (shard > 0 && r)
                NewItem(Math.floor(Number(r.X)), Math.floor(Number(r.Y)), Math.floor(Number(r.Width)), Math.floor(Number(r.Height)), shard, 1 + Math.floor(Math.random() * 3), false, -1, true);
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc) {
        DustAt(npc, 68, npc.life <= 0 ? 25 : 5, npc.life <= 0 ? 1.05 : 0.8);
    }
}
