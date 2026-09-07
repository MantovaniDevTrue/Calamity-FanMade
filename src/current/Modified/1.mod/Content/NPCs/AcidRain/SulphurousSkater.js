import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { WorldDB } from './../../../TL/WorldDB.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './../../../Core/SulphurousSeaTerrainRuntime.js';
import { AcidRainTier1Runtime } from './../../../Core/AcidRainTier1Runtime.js';

const { Vector2, Color } = Modules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const CanHit = Terraria.Collision['bool CanHit(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const BUBBLE_SEARCH_INTERVAL = 18;
const BUBBLE_SEARCH_RANGE = 2400;
const JUMP_DELAY = 64;
const CATCH_PADDING = 7;
const MAX_PROJECTILES = 1000;
function centerX(entity) {
    return Number(entity.position.X) + Number(entity.width) * 0.5;
}

function centerY(entity) {
    return Number(entity.position.Y) + Number(entity.height) * 0.5;
}

function distanceBetween(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
}

function intersects(a, b) {
    return Number(a.position.X) < Number(b.position.X) + Number(b.width)
        && Number(a.position.X) + Number(a.width) > Number(b.position.X)
        && Number(a.position.Y) < Number(b.position.Y) + Number(b.height)
        && Number(a.position.Y) + Number(a.height) > Number(b.position.Y);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function crossesBox(x0, y0, x1, y1, halfWidth, halfHeight) {
    let from = 0;
    let to = 1;
    const dx = x1 - x0;
    const dy = y1 - y0;

    function clip(start, delta, size) {
        if (Math.abs(delta) < 0.0001)
            return Math.abs(start) <= size;

        let enter = (-size - start) / delta;
        let exit = (size - start) / delta;
        if (enter > exit) {
            const swap = enter;
            enter = exit;
            exit = swap;
        }
        from = Math.max(from, enter);
        to = Math.min(to, exit);
        return from <= to;
    }

    return clip(x0, dx, halfWidth) && clip(y0, dy, halfHeight);
}

function catchesOnThisStep(npc, bubble, speedX, speedY) {
    if (intersects(npc, bubble))
        return true;

    const dx = centerX(bubble) - centerX(npc);
    const dy = centerY(bubble) - centerY(npc);
    const bubbleVX = Number(bubble.velocity.X) || 0;
    const bubbleVY = Number(bubble.velocity.Y) || 0;
    const nextDX = dx + bubbleVX - speedX;
    const nextDY = dy + bubbleVY - speedY;
    const bubbleWidth = Math.max(22, Number(bubble.width) || 1);
    const bubbleHeight = Math.max(22, Number(bubble.height) || 1);
    const halfWidth = (Number(npc.width) + bubbleWidth) * 0.5 + CATCH_PADDING;
    const halfHeight = (Number(npc.height) + bubbleHeight) * 0.5 + CATCH_PADDING;
    return crossesBox(dx, dy, nextDX, nextDY, halfWidth, halfHeight);
}

function addBestiaryText(entry, key) {
    try {
        const text = FlavorTextBestiaryInfoElement.new();
        text._key = ModLocalization.Translate(key);
        entry.Info.Add(text);
    } catch (e) { }
}

function validPlayer(player) {
    return !!player && player.active && !player.dead;
}

function playerSize(player) {
    const width = Number(player.width) || 20;
    const height = Number(player.height) || 42;
    return Math.sqrt(width * width + height * height);
}

function canSpawn(info) {
    if (WorldDB.get('calamity:boss:aquaticScourge:downed') !== true)
        return false;
    if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe)
        return false;
    if (!AcidRainTier1Runtime.Active || SulphurousSeaTerrainRuntime.Generated !== true)
        return false;
    if (!SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))
        return false;
    if (!SulphurousSeaPreviewRuntime.ContainsTile(info.SpawnTileX, info.SpawnTileY, 4))
        return false;
    let surface = 250;
    try {
        surface = Number(Terraria.Main.worldSurface) || surface;
    } catch (e) { }
    return Number(info.SpawnTileY) <= surface + 70;
}

export class SulphurousSkater extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/AcidRain/SulphurousSkater';
        this.BestiaryRarityStars = 1;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 5;
    }

    SetDefaults() {
        const npc = this.NPC;
        npc.width = 48;
        npc.height = 48;
        npc.damage = 48;
        npc.lifeMax = 280;
        npc.defense = 3;
        npc.knockBackResist = 0.8;
        npc.value = Terraria.Item.buyPrice(0, 0, 4, 0);
        npc.lavaImmune = false;
        npc.noGravity = true;
        npc.noTileCollide = false;
        npc.aiStyle = -1;
        npc.npcSlots = 1;
        npc.HitSound = Terraria.ID.SoundID.NPCHit1;
        npc.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.flying = false;
        state.jumpTimer = 0;
        state.bubbleIndex = -1;
        state.bubbleSearchTimer = 0;
        state.absorbedBubbles = 0;
        state.flightEntries = 0;
        state.bubbleMisses = 0;
        state.lastBubbleDistance = 0;
        state.jumpDelay = JUMP_DELAY;
        state.lastCatch = 'none';
    }

    SetBestiary(database, entry) {
        addBestiaryText(entry, 'Bestiary.SulphurousSkater');
    }

    SpawnChance(info) {
        return canSpawn(info) ? 0.12 : 0;
    }

    GetBubble(state, type) {
        const index = Math.floor(Number(state.bubbleIndex));
        if (index < 0 || index >= MAX_PROJECTILES)
            return null;
        const bubble = (()=>{try{return Terraria.Main.projectile.get_Item(index);}catch(e){return null;}})();
        if (!bubble || !bubble.active || Number(bubble.type) !== type)
            return null;
        return bubble;
    }

    FindBubble(npc, state) {
        const type = Number(ModProjectile.getTypeByName('SulphuricAcidBubble') || 0);
        if (type <= 0)
            return { bubble: null, distance: BUBBLE_SEARCH_RANGE };
        state.bubbleSearchTimer = Number(state.bubbleSearchTimer || 0) - 1;
        const cached = this.GetBubble(state, type);
        if (cached && state.bubbleSearchTimer > 0 && centerY(cached) > Number(npc.position.Y) - 28) {
            return {
                bubble: cached,
                distance: distanceBetween(centerX(npc), centerY(npc), centerX(cached), centerY(cached))
            };
        }
        state.bubbleSearchTimer = BUBBLE_SEARCH_INTERVAL;
        state.bubbleIndex = -1;
        const x = centerX(npc);
        const y = centerY(npc);
        const position = Vector2.new(Number(npc.position.X), Number(npc.position.Y));
        let closest = null;
        let closestDistance = BUBBLE_SEARCH_RANGE;
        for (let i = 0; i < MAX_PROJECTILES; i++) {
            const bubble = (()=>{try{return Terraria.Main.projectile.get_Item(i);}catch(e){return null;}})();
            if (!bubble || !bubble.active || Number(bubble.type) !== type)
                continue;
            const bubbleX = centerX(bubble);
            const bubbleY = centerY(bubble);
            if (Math.abs(x - bubbleX) >= closestDistance || bubbleY <= Number(npc.position.Y) - 28)
                continue;
            let visible = true;
            try {
                visible = CanHit(position, Number(npc.width), Number(npc.height), Vector2.new(Number(bubble.position.X), Number(bubble.position.Y)), Number(bubble.width), Number(bubble.height));
            } catch (e) { }
            if (!visible)
                continue;
            closest = bubble;
            closestDistance = distanceBetween(x, y, bubbleX, bubbleY);
            state.bubbleIndex = i;
        }
        return { bubble: closest, distance: closestDistance };
    }

    AbsorbBubble(npc, bubble, state, catchType, speedX, speedY) {
        state.flying = true;
        state.absorbedBubbles = Number(state.absorbedBubbles || 0) + 1;
        state.flightEntries = Number(state.flightEntries || 0) + 1;
        state.bubbleIndex = -1;
        state.bubbleSearchTimer = 0;
        state.lastBubbleDistance = 0;
        state.lastCatch = catchType;
        npc.noGravity = true;
        npc.velocity = Vector2.new(speedX, speedY);
        npc.netUpdate = true;
        try {
            bubble.Kill();
        } catch (e) {
            bubble.active = false;
        }
    }

    Jump(npc, player, state) {
        npc.knockBackResist = 0.8;
        npc.noGravity = false;

        const target = this.FindBubble(npc, state);
        const bubble = target.bubble;
        const npcX = centerX(npc);
        const targetX = bubble ? centerX(bubble) : Terraria.PlayerCenterX(player);
        const xDistance = targetX - npcX;
        let speedX = Number(npc.velocity.X);
        let speedY = Number(npc.velocity.Y);

        if (npc.wet && speedY >= 0)
            speedY = -3;

        if (bubble) {
            if (target.distance < 200)
                speedY += 0.2;

            if (npc.wet) {
                if (Math.abs(xDistance) < 34)
                    speedX *= 0.72;
                else
                    speedX += clamp(xDistance * 0.018, -0.45, 0.45);
            }

            const previous = Number(state.lastBubbleDistance) || 0;
            if (previous > 0 && previous < 90 && target.distance > previous + 14) {
                state.bubbleMisses = Number(state.bubbleMisses || 0) + 1;
                state.jumpTimer = Math.max(Number(state.jumpTimer) || 0, 36);
            }
            state.lastBubbleDistance = target.distance;

            if (catchesOnThisStep(npc, bubble, speedX, speedY)) {
                const catchType = intersects(npc, bubble) ? 'overlap' : 'sweep';
                this.AbsorbBubble(npc, bubble, state, catchType, speedX, speedY);
                return;
            }
        } else {
            state.lastBubbleDistance = 0;
        }

        if (speedY !== 0 && !npc.wet) {
            npc.knockBackResist = 0;
            npc.velocity = Vector2.new(speedX, speedY);
            return;
        }

        npc.TargetClosest(false);
        speedX *= 0.85;
        state.jumpTimer = Number(state.jumpTimer || 0) + 1;

        let delay = JUMP_DELAY;
        if (bubble) {
            delay = clamp(26 + Math.abs(xDistance) * 0.16, 28, 52);
            if (target.distance < 120)
                delay = Math.min(delay, 30);
        }
        state.jumpDelay = Math.round(delay);

        if (state.jumpTimer >= delay) {
            state.jumpTimer = 0;
            speedY -= 4;
            const direction = xDistance < 0 ? -1 : 1;

            if (bubble) {
                const distanceX = Math.abs(xDistance);
                if (distanceX < 18)
                    speedX *= 0.35;
                else
                    speedX = clamp(distanceX * 0.15, 4, 11.5) * direction;
            } else {
                let jumpSpeed = 12;
                try {
                    if (CanHit(Vector2.new(Number(npc.position.X), Number(npc.position.Y)), Number(npc.width), Number(npc.height), Vector2.new(Number(player.position.X), Number(player.position.Y)), Number(player.width), Number(player.height)))
                        jumpSpeed *= 1.2;
                } catch (e) { }
                speedX = jumpSpeed * direction;
            }

            npc.spriteDirection = direction > 0 ? -1 : 1;
            npc.netUpdate = true;
        }

        if (bubble && catchesOnThisStep(npc, bubble, speedX, speedY)) {
            this.AbsorbBubble(npc, bubble, state, 'sweep', speedX, speedY);
            return;
        }

        npc.velocity = Vector2.new(speedX, speedY);
    }

    Fly(npc, player, state) {
        npc.knockBackResist = 0.5;
        npc.noGravity = true;
        const dx = Terraria.PlayerCenterX(player) - centerX(npc);
        const dy = Terraria.PlayerCenterY(player) - centerY(npc);
        const distance = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
        let inertia = 24.5;
        if (distance < 200)
            inertia *= 0.667;
        const speedX = (Number(npc.velocity.X) * inertia + dx / distance * 14) / (inertia + 1);
        const speedY = (Number(npc.velocity.Y) * inertia + dy / distance * 14) / (inertia + 1);
        npc.velocity = Vector2.new(speedX, speedY);
        npc.spriteDirection = speedX < 0 ? 1 : -1;
        if (distance >= playerSize(player))
            return;
        state.flying = false;
        state.jumpTimer = 0;
        npc.noGravity = false;
        npc.netUpdate = true;
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        npc.TargetClosest(false);
        const target = Math.max(0, Math.min(254, Math.floor(Number(npc.target) || 0)));
        const player = (()=>{try{return Terraria.Main.player.get_Item(target);}catch(e){return null;}})();
        if (!validPlayer(player))
            return false;
        if (state.flying)
            this.Fly(npc, player, state);
        else
            this.Jump(npc, player, state);
        return false;
    }

    FindFrame(npc, frameHeight) {
        const state = CalamityNPCState.Get(npc);
        if (!state.flying) {
            const frame = npc.frame;
            frame.Y = 0;
            npc.frame = frame;
            npc.frameCounter = 0;
            return;
        }
        npc.frameCounter = Number(npc.frameCounter) + 1;
        if (Number(npc.frameCounter) < 4)
            return;
        npc.frameCounter = 0;
        const frame = npc.frame;
        let index = Math.floor(Number(frame.Y) / Math.max(1, frameHeight)) + 1;
        if (index < 1 || index > 4)
            index = 1;
        frame.Y = index * frameHeight;
        npc.frame = frame;
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) <= 0)
            return;
        const buff = Number(ModBuff.getTypeByName('Irradiated') || 0);
        if (buff <= 0)
            return;
        try {
            player.AddBuff(buff, 120, true);
        } catch (e) {
            try {
                player.AddBuff(buff, 120, false);
            } catch (ignored) { }
        }
    }

    HitEffect(npc, hitDirection, damage) {
        const dead = Number(npc.life) <= 0;
        const amount = dead ? 18 : 5;
        for (let i = 0; i < amount; i++) {
            NewDust(Vector2.new(Number(npc.position.X), Number(npc.position.Y)), Number(npc.width), Number(npc.height), 75, Number(hitDirection || 0), -1, 0, Color.White, dead ? 1.1 : 1);
        }
        if (dead)
            CalamityNPCState.Remove(npc);
    }

    OnKill(npc) {
        CalamityNPCState.Remove(npc);
    }
}
