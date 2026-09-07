import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModSystem } from './../../../../TL/ModSystem.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../../Core/FrozenCubeTargetRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
const CrabulonDustType = 56;
let CachedWorldState = null;
function GetWorldState() {
    if (!CachedWorldState)
        CachedWorldState = ModSystem.getByName('CalamityWorldState');
    return CachedWorldState;
}

function ClosestActivePlayer(npc) {
    // Deixo a busca de jogador no código nativo em vez de atravessar até 255 slots JS.
    try { npc.TargetClosest(false); } catch (e) { }
    const index = Math.floor(Number(npc && npc.target));
    if (index >= 0 && index < 255) {
        try {
            const player = Terraria.Main.player[index];
            if (player && player.active && !player.dead) return player;
        } catch (e) { }
    }
    try {
        const local = Terraria.Main.LocalPlayer;
        return local && local.active && !local.dead ? local : null;
    } catch (e) { return null; }
}

export class CrabShroom extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/Crabulon/CrabShroom';
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 4;
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = 14;
        this.NPC.height = 14;
        this.NPC.damage = 18;
        this.NPC.defense = 0;
        this.NPC.lifeMax = 15;
        this.NPC.knockBackResist = 0.5;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.npcSlots = 1;
        try {
            if (Terraria.Main.getGoodWorld === true)
                this.NPC.scale = 2;
        } catch (e) { }
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit1;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        this.hideFromBestiary = true;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.despawnTimer = 0;
        npc.TargetClosest(false);
    }

    PreAI(npc) {
        if (npc.target < 0 || npc.target >= 255)
            npc.TargetClosest(true);
        let player = Terraria.Main.player[npc.target];
        if (!player || !player.active || player.dead) {
            npc.TargetClosest(true);
            player = Terraria.Main.player[npc.target];
        }
        if (!player || !player.active || player.dead) {
            const state = CalamityNPCState.Get(npc);
            state.despawnTimer = Number(state.despawnTimer || 0) + 1;
            npc.damage = 0;
            npc.dontTakeDamage = true;
            npc.timeLeft = Math.min(Number(npc.timeLeft), 60);
            const velocity = npc.velocity;
            velocity.X *= 0.98;
            velocity.Y = Math.min(6, Number(velocity.Y) + 0.08);
            npc.velocity = velocity;
            if (state.despawnTimer >= 60) {
                try {
                    npc.active = false;
                    npc.netUpdate = true;
                    npc.timeLeft = 0;
                } catch (e) { }
                CalamityNPCState.Remove(npc);
            }
            return false;
        }
        const state = CalamityNPCState.Get(npc);
        state.despawnTimer = 0;
        npc.dontTakeDamage = false;
        npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 18;
        if (Number(npc.timeLeft) < 750)
            npc.timeLeft = 750;
        const world = GetWorldState();
        const death = !!(world && world.DeathMode === true);
        const revenge = death || !!(world && world.RevengeanceMode === true);
        let goodWorld = false;
        try {
            goodWorld = Terraria.Main.getGoodWorld === true;
        } catch (e) { }
        const xVelocityLimit = death ? 8 : (revenge ? 6 : 5);
        const yVelocityLimit = goodWorld ? 0.25 : (death ? 0.75 : (revenge ? 0.9 : 1));
        const velocity = npc.velocity;
        velocity.Y = Number(velocity.Y) + 0.02;
        if (Number(velocity.Y) > yVelocityLimit)
            velocity.Y = yVelocityLimit;
        if (Number(npc.position.X) + Number(npc.width) < Number(Terraria.PlayerPositionX(player))) {
            if (Number(velocity.X) < 0)
                velocity.X *= 0.98;
            velocity.X = Number(velocity.X) + 0.1;
        } else if (Number(npc.position.X) > Number(Terraria.PlayerPositionX(player)) + Number(Terraria.PlayerWidth(player))) {
            if (Number(velocity.X) > 0)
                velocity.X *= 0.98;
            velocity.X = Number(velocity.X) - 0.1;
        }
        if (Number(velocity.X) > xVelocityLimit || Number(velocity.X) < -xVelocityLimit)
            velocity.X *= 0.97;
        if (goodWorld) {
            const push = 0.5;
            const separation = 30 * Math.max(0.01, Number(npc.scale) || 1);
            const slots = FrozenCubeTrackedIndices();
            for (let k = 0; k < slots.length; k++) {
                const other = FrozenCubeNPC(slots[k]);
                if (!other || other.whoAmI === npc.whoAmI || other.type !== npc.type)
                    continue;
                const dx = Number(npc.Center.X) - Number(other.Center.X);
                const dy = Number(npc.Center.Y) - Number(other.Center.Y);
                if (Math.sqrt(dx * dx + dy * dy) >= separation)
                    continue;
                velocity.X += Number(npc.position.X) < Number(other.position.X) ? -push : push;
                velocity.Y += Number(npc.position.Y) < Number(other.position.Y) ? -push : push;
            }
        }
        npc.velocity = velocity;
        npc.rotation = Number(velocity.X) * 0.1;
        if (state.age % 5 === 0) {
            try {
                Terraria.Lighting.AddLight(npc.Center, 0, 0.2, 0.4);
            } catch (e) { }
        }
        return false;
    }

    FindFrame(npc, frameHeight) {
        npc.frameCounter += 0.75;
        const frame = Math.floor(Number(npc.frameCounter) / 5) % 4;
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
    }

    OnKill(npc) {
        const player = ClosestActivePlayer(npc);
        if (player && Number(player.statLife) < Number(player.statLifeMax2) && Math.random() < 0.125 && Terraria.Main.netMode !== 1) {
            try {
                NewItem(Math.floor(Number(npc.position.X)), Math.floor(Number(npc.position.Y)), Math.max(1, Number(npc.width)), Math.max(1, Number(npc.height)), Number(Terraria.ID.ItemID.Heart || 58), 1, false, 0, false);
            } catch (e) { }
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const count = npc.life <= 0 ? 8 : 2;
        for (let i = 0; i < count; i++) {
            const dust = NewDust(npc.position, npc.width, npc.height, CrabulonDustType, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 80, Color.White, 0.8);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
    }
}
