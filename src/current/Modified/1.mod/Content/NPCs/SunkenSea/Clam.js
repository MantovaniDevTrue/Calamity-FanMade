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

export class Clam extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SunkenSea/Clam';
        this.BestiaryRarityStars = 1;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 5;
    }

    SetDefaults() {
        const n = this.NPC;
        n.damage = 0;
        n.width = 56;
        n.height = 38;
        n.defense = 9999;
        n.lifeMax = Terraria.Main.hardMode ? 300 : 150;
        if (Terraria.Main.expertMode)
            n.lifeMax *= 2;
        n.aiStyle = -1;
        n.value = Terraria.Main.hardMode ? Terraria.Item.buyPrice(0, 0, 5, 0) : Terraria.Item.buyPrice(0, 0, 1, 0);
        n.HitSound = Terraria.ID.SoundID.NPCHit4;
        n.knockBackResist = 0.05;
        n.chaseable = false;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        s.hitAmount = 0;
        s.awake = false;
        s.jumpTimer = 0;
        s.jumpCount = 0;
    }

    SetBestiary(database, entry) {
        AddBestiary(entry, 'Bestiary.Clam');
    }

    SpawnChance(info) {
        return InSunken(info) ? 0.22 : 0;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 56, 38);
    }

    OnHitByPlayer(npc) {
        const s = CalamityNPCState.Get(npc);
        if (Number(s.hitAmount) < 3) {
            s.hitAmount = Number(s.hitAmount || 0) + 1;
            if (s.hitAmount >= 3) {
                s.awake = true;
                npc.defense = Terraria.Main.hardMode ? 15 : 6;
                npc.damage = Terraria.Main.hardMode ? 60 : 30;
                npc.chaseable = true;
            }
            npc.netUpdate = true;
        }
    }

    PreAI(npc) {
        const s = CalamityNPCState.Get(npc);
        npc.TargetClosest(true);
        const player = Terraria.Main.player[Number(npc.target)];
        if (!s.awake && HasClamity(player)) {
            s.hitAmount = 3;
            s.awake = true;
            npc.defense = Terraria.Main.hardMode ? 15 : 6;
            npc.damage = Terraria.Main.hardMode ? 60 : 30;
            npc.chaseable = true;
            npc.netUpdate = true;
        }
        if (!s.awake) {
            npc.damage = 0;
            npc.velocity = Vector2.new(Number(npc.velocity.X) * 0.8, Number(npc.velocity.Y));
            return false;
        }
        let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
        if (Math.abs(vy) < 0.01 && npc.collideY) {
            s.jumpTimer = Number(s.jumpTimer || 0) + 1;
            vx *= 0.9;
            if (s.jumpTimer > 16) {
                s.jumpTimer = 0;
                s.jumpCount = (Number(s.jumpCount || 0) + 1) % 2;
                const dir = Number(npc.direction || 1) || 1;
                vx = dir * (s.jumpCount === 0 ? 6 : 8);
                vy = s.jumpCount === 0 ? -8 : -4;
                npc.netUpdate = true;
            }
        } else {
            if (npc.direction === 1 && vx < 1)
                vx += 0.1;
            if (npc.direction === -1 && vx > -1)
                vx -= 0.1;
        }
        npc.velocity = Vector2.new(vx, vy);
        npc.spriteDirection = -Number(npc.direction || 1);
        return false;
    }

    FindFrame(npc, h) {
        const s = CalamityNPCState.Get(npc);
        const r = npc.frame;
        if (!s.awake) {
            r.Y = h * 4;
            npc.frame = r;
            return;
        }
        npc.frameCounter++;
        if (npc.frameCounter > 4) {
            npc.frameCounter = 0;
            r.Y += h;
            if (r.Y > h * 3)
                r.Y = 0;
        }
        npc.frame = r;
    }

    ModifyNPCLoot(loot) {
        const nav = Number(ModItem.getTypeByName('Navystone') || 0);
        if (nav > 0)
            loot.Add(ItemDropRule.Common(nav, 1, 8, 12));
        loot.Add(ItemDropRule.Common(4412, 8, 1, 1));
        loot.Add(ItemDropRule.Common(4413, 16, 1, 1));
        loot.Add(ItemDropRule.Common(4414, 40, 1, 1));
    }

    HitEffect(npc) {
        DustAt(npc, 37, npc.life <= 0 ? 40 : 5, npc.life <= 0 ? 1.05 : 0.8);
        if (npc.life <= 0)
            CalamityNPCState.Remove(npc);
    }
}
