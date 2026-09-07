import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { InSulphurSpawn, WaterAtSpawn, CountNPC, N, SpawnAquaticNPC, SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const CHARGE_RATE = 120;
const SLOWDOWN_TIME = 45;

function rotate(x, y, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: x * c - y * s, y: x * s + y * c };
}

export class MicrobialCluster extends ModNPC {
    constructor() { super(); this.Texture = 'NPCs/SulphurousSea/MicrobialCluster'; }

    SetDefaults() {
        const n = this.NPC;
        n.noGravity = true;
        n.damage = 0;
        n.width = 24;
        n.height = 24;
        n.lifeMax = 5;
        n.aiStyle = -1;
        n.noTileCollide = false;
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        n.knockBackResist = 0;
        n.npcSlots = .15;
    }

    OnSpawn(n) {
        const s = CalamityNPCState.Reset(n);
        s.timer = 0;
        const a = Math.random() * Math.PI * 2;
        SetNPCVelocity(n, s, Math.cos(a) * 1.25, Math.sin(a) * 1.25);
    }

    SpawnChance(info) {
        if (!InSulphurSpawn(info, 6) || !WaterAtSpawn(info)) return 0;
        return .4;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 24, 24);
    }

    PreAI(n) {
        const s = CalamityNPCState.Get(n);
        let vx = N(n.velocity?.X), vy = N(n.velocity?.Y);
        if (n.collideX) { vx *= -1; n.netUpdate = true; }
        if (n.collideY) { vy *= -1; n.netUpdate = true; }

        const cX = N(n.position?.X) + N(n.width) * .5;
        const cY = N(n.position?.Y) + N(n.height) * .5;
        try { Terraria.Lighting.AddLight(Math.floor(cX / 16), Math.floor(cY / 16), 1.35, 2, .37); } catch (_) { }

        s.timer = (Number(s.timer || 0) + 1) % CHARGE_RATE;
        const local = Number(s.timer) % SLOWDOWN_TIME;
        if (local > 0) { vx *= .98; vy *= .98; }
        if (local === SLOWDOWN_TIME - 1) {
            let len = Math.sqrt(vx * vx + vy * vy);
            if (len < .001) { vx = 0; vy = -1; len = 1; }
            const r = rotate(vx / len, vy / len, (Math.random() - .5) * (Math.PI / 2));
            vx = r.x * 4; vy = r.y * 4;
        }
        SetNPCVelocity(n, s, vx, vy);

        if ((Number(s.timer) & 31) === 31) {
            try {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random();
                NewDust(Vector2.new(cX - 2, cY - 2), 4, 4, 75, Math.cos(angle) * speed, Math.sin(angle) * speed, 0, Color.White, 1.6);
            } catch (_) { }
        }
        return false;
    }

    HitEffect(n, hitDirection) {
        if (Number(n.life) > 0) return;
        const cX = N(n.position?.X) + N(n.width) * .5;
        const cY = N(n.position?.Y) + N(n.height) * .5;
        for (let i = 0; i < 6; i++) {
            const a = Math.random() * Math.PI * 2, speed = 1 + Math.random();
            try { NewDust(Vector2.new(cX - 2, cY - 2), 4, 4, 75, Math.cos(a) * speed, Math.sin(a) * speed, 0, Color.White, 1.2); } catch (_) { }
        }
        CalamityNPCState.Remove(n);
    }

    OnKill(n) { CalamityNPCState.Remove(n); }
}
