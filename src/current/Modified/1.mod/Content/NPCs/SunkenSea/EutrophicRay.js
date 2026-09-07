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

export class EutrophicRay extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SunkenSea/EutrophicRay';
        this.BestiaryRarityStars = 2;
        this.ContactDamage = 20;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 5;
    }

    SetDefaults() {
        const n = this.NPC;
        n.npcSlots = 1;
        n.aiStyle = -1;
        n.damage = this.ContactDamage;
        n.width = 116;
        n.height = 36;
        n.defense = 5;
        n.lifeMax = 200;
        n.knockBackResist = 0.5;
        n.value = Terraria.Item.buyPrice(0, 0, 1, 0);
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        n.noGravity = true;
        n.noTileCollide = false;
        n.chaseable = false;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        s.hasBeenHit = false;
        s.turnSide = Math.random() < 0.5 ? -1 : 1;
        s.age = 0;
        npc.direction = s.turnSide;
    }

    SetBestiary(database, entry) {
        AddBestiary(entry, 'Bestiary.EutrophicRay');
    }

    SpawnChance(info) {
        return InSunken(info) ? 0.11 : 0;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 116, 36);
    }

    Wake(npc) {
        const s = CalamityNPCState.Get(npc);
        if (s.hasBeenHit)
            return;
        s.hasBeenHit = true;
        npc.chaseable = true;
        npc.noTileCollide = true;
        npc.netUpdate = true;
    }

    OnHitByPlayer(npc) {
        this.Wake(npc);
    }

    OnHitByProjectile(npc) {
        this.Wake(npc);
    }

    PreAI(npc) {
        const s = CalamityNPCState.Get(npc);
        s.age = Number(s.age || 0) + 1;
        let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
        if (!IsWetNPC(npc) && !s.hasBeenHit) {
            vy = Math.min(8, vy + 0.28);
            vx *= 0.96;
            npc.damage = 0;
        } else if (!s.hasBeenHit) {
            npc.damage = 0;
            vx += Number(npc.direction || 1) * 0.07;
            if (Math.abs(vx) > 1.8)
                vx *= 0.96;
            vy = Math.sin(Number(s.age) * 0.04) * 0.18;
            if (npc.collideX) {
                vx *= -1;
                npc.direction *= -1;
            }
        } else {
            npc.TargetClosest(true);
            const p = Terraria.Main.player[Number(npc.target)];
            npc.damage = this.ContactDamage;
            if (p && !p.dead) {
                const c = CenterOf(npc);
                if (c) {
                    const px = Terraria.PlayerCenterX(p), py = Terraria.PlayerCenterY(p);
                    const side = Number(s.turnSide || 1);
                    const wantedX = px + side * 300;
                    const dx = wantedX - c.x, dy = py - c.y;
                    vx += Math.sign(dx) * 0.25;
                    vy += Math.sign(dy) * 0.20;
                    vx = Math.max(-4, Math.min(4, vx));
                    vy = Math.max(-2.5, Math.min(2.5, vy));
                    if ((side > 0 && c.x > px + 300) || (side < 0 && c.x < px - 300))
                        s.turnSide = -side;
                }
            }
            npc.rotation = Math.max(-0.1, Math.min(0.1, vy * (vx >= 0 ? 0.05 : -0.05)));
        }
        npc.velocity = Vector2.new(vx, vy);
        npc.spriteDirection = vx > 0 ? 1 : -1;
        return false;
    }

    FindFrame(npc, h) {
        const s = CalamityNPCState.Get(npc);
        if (!s.hasBeenHit) {
            const r = npc.frame;
            r.Y = 0;
            npc.frame = r;
            return;
        }
        npc.frameCounter += 0.15;
        const r = npc.frame;
        r.Y = (Math.floor(Number(npc.frameCounter)) % 5) * h;
        npc.frame = r;
    }

    HitEffect(npc) {
        DustAt(npc, 68, npc.life <= 0 ? 25 : 5, npc.life <= 0 ? 1.05 : 0.8);
        if (npc.life <= 0)
            CalamityNPCState.Remove(npc);
    }
}
