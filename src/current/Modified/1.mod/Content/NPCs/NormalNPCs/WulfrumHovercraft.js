import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';

const { Vector2, Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function len(x, y) {
    return Math.sqrt(x * x + y * y);
}

function normalize(x, y, fallbackX = 0, fallbackY = 1) {
    const l = len(x, y);
    return l > 0.001 ? [x / l, y / l] : [fallbackX, fallbackY];
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export class WulfrumHovercraft extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/NormalNPCs/WulfrumHovercraft';
        this.BestiaryRarityStars = 1;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 12;
    }

    SetDefaults() {
        const n = this.NPC;
        n.aiStyle = -1;
        n.width = 40;
        n.height = 38;
        n.damage = 15;
        n.defense = 4;
        n.lifeMax = 25;
        n.value = Terraria.Item.buyPrice(0, 0, 1, 0);
        n.HitSound = Terraria.ID.SoundID.NPCHit4;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath14;
        n.noGravity = true;
        n.noTileCollide = true;
        n.knockBackResist = 0.1;
        n.npcSlots = 0.8;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        s.phase = 0;
        s.subphaseTimer = 0;
        s.approachTimer = 0;
        s.searchDirection = 0;
        s.stunTime = 0;
        s.flyAwayTimer = 0;
        s.swoopAimX = 0;
        s.swoopAimY = 0;
        s.swoopLocked = 0;
        s.swoopLockVx = 0;
        s.swoopLockVy = 0;
        s.swoopRecoveryTimer = 0;
        npc.TargetClosest(false);
    }

    SetBestiary(database, entry) {
        entry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.Surface);
        entry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Times.DayTime);
        const f = FlavorTextBestiaryInfoElement.new();
        f._key = ModLocalization.Translate('Bestiary.WulfrumHovercraft');
        entry.Info.Add(f);
    }

    SpawnChance(info) {
        if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe || !info.Day || !info.AboveSurface)
            return 0;
        if (info.PlayerInTown || info.Dungeon || info.Underworld || SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))
            return 0;
        const amp = Number(ModNPC.getTypeByName('WulfrumAmplifier') || 0);
        const boosted = amp > 0 && Terraria.NPC.AnyNPCs(amp);
        return (info.HardMode ? 0.025 : 0.065) * (boosted ? 5.5 : 1);
    }

    PreAI(npc) {
        const s = CalamityNPCState.Get(npc);
        let target = Number(npc.target);
        let player = (target >= 0 && target < 255) ? Terraria.Main.player[target] : null;
        let px = player ? Number(Terraria.PlayerCenterX(player)) : 0, py = player ? Number(Terraria.PlayerCenterY(player)) : 0;
        let far = !player || len(px - Number(npc.Center.X), py - Number(npc.Center.Y)) > 960;
        if (!player || !player.active || player.dead || far) {
            npc.TargetClosest(false);
            target = Number(npc.target);
            player = (target >= 0 && target < 255) ? Terraria.Main.player[target] : null;
            px = player ? Number(Terraria.PlayerCenterX(player)) : 0;
            py = player ? Number(Terraria.PlayerCenterY(player)) : 0;
            far = !player || len(px - Number(npc.Center.X), py - Number(npc.Center.Y)) > 960;
        }
        const supercharged = Number(s.superchargeTimer) > 0;
        npc.defense = supercharged ? 10 : 4;
        if (!player || !player.active || player.dead || far) {
            s.flyAwayTimer++;
            const v = npc.velocity;
            const vx = Number(v.X) * 0.96, vy = lerp(Number(v.Y), -8, 0.08);
            npc.velocity = Vector2.new(vx, vy);
            npc.damage = 0;
            npc.rotation *= 0.8;
            return false;
        }
        s.flyAwayTimer = Math.max(0, Number(s.flyAwayTimer) - 3);
        if (Number(s.stunTime) > 0) {
            s.stunTime--;
            npc.damage = 0;
            const v = npc.velocity;
            npc.velocity = Vector2.new(Number(v.X) * 0.86, Number(v.Y) * 0.86);
            npc.rotation *= 0.8;
            return false;
        }
        if (!s.searchDirection) {
            const left = Math.abs(px - 345 - Number(npc.Center.X));
            const right = Math.abs(px + 345 - Number(npc.Center.X));
            s.searchDirection = right < left ? 1 : -1;
            s.approachTimer = 0;
            npc.netUpdate = true;
        }
        const dir = Number(s.searchDirection) || 1;
        let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
        if (s.phase === 0 || s.phase === 1) {
            s.approachTimer = Number(s.approachTimer || 0) + 1;
            const opposite = s.phase === 1 ? -1 : 1;
            const desiredOffsetX = 345 * dir * opposite;
            const tx = px + desiredOffsetX, ty = py - 160;
            const dx = tx - Number(npc.Center.X), dy = ty - Number(npc.Center.Y);
            const d = normalize(dx, dy);
            const playerVX = Math.abs(Number(Terraria.PlayerVelocity(player).X));
            const baseSpeed = supercharged ? (s.phase === 0 ? 7 : 5.5) : (s.phase === 0 ? 5 : 4);
            const catchup = Math.min(supercharged ? 11 : 8.5, playerVX + (supercharged ? 3 : 2.25));
            const speed = Math.max(baseSpeed, catchup);
            vx = d[0] * speed;
            vy = d[1] * speed;
            npc.damage = 0;
            const relX = Number(npc.Center.X) - px, relY = Number(npc.Center.Y) - py;
            const sideSign = desiredOffsetX < 0 ? -1 : 1;
            const sideReached = relX * sideSign >= Math.abs(desiredOffsetX) - 55;
            const aligned = Math.abs(relY + 160) < 95;
            const close = len(dx, dy) < 70;
            const timedAlignment = Number(s.approachTimer) > (s.phase === 0 ? 150 : 190) && relX * sideSign > 190 && Math.abs(relY + 160) < 145;
            if (close || (sideReached && aligned) || timedAlignment) {
                if (s.phase === 0) {
                    s.phase = 2;
                    s.subphaseTimer = 0;
                    s.approachTimer = 0;
                } else {
                    s.phase = 3;
                    s.subphaseTimer = 0;
                    s.approachTimer = 0;
                    s.swoopAimX = px;
                    s.swoopAimY = py;
                    s.swoopLocked = 0;
                    s.swoopLockVx = 0;
                    s.swoopLockVy = 0;
                    s.swoopRecoveryTimer = 0;
                }
                npc.netUpdate = true;
            }
        } else if (s.phase === 2) {
            s.subphaseTimer++;
            vx *= 0.96;
            vy *= 0.96;
            npc.damage = 0;
            if (s.subphaseTimer >= 30) {
                s.phase = 1;
                s.subphaseTimer = 0;
                s.approachTimer = 0;
                npc.netUpdate = true;
            }
        } else {
            npc.damage = 15;
            s.subphaseTimer++;
            const total = supercharged ? 72 : 96;
            const speed = supercharged ? 12.5 : 9.75;
            const diveTimeout = supercharged ? 38 : 52;
            const cx = Number(npc.Center.X), cy = Number(npc.Center.Y);
            if (!Number(s.swoopLocked || 0)) {
                const lead = supercharged ? 4 : 6;
                const aimX = px + Number(Terraria.PlayerVelocity(player).X) * lead;
                const aimY = py + Number(Terraria.PlayerVelocity(player).Y) * 2;
                s.swoopAimX = lerp(Number(s.swoopAimX || aimX), aimX, 0.32);
                s.swoopAimY = lerp(Number(s.swoopAimY || aimY), aimY, 0.32);
                const dx = Number(s.swoopAimX) - cx, dy = Number(s.swoopAimY) - cy;
                const distance = len(dx, dy);
                const aim = normalize(dx, dy, dir, 0.25);
                const steering = supercharged ? 0.46 : 0.40;
                vx = lerp(vx, aim[0] * speed, steering);
                vy = lerp(vy, aim[1] * speed, steering);
                if (distance <= 54 || Number(s.subphaseTimer) >= diveTimeout) {
                    const direct = normalize(dx, dy, aim[0], aim[1]);
                    s.swoopLockVx = direct[0] * speed;
                    s.swoopLockVy = direct[1] * speed;
                    s.swoopLocked = 1;
                    s.swoopRecoveryTimer = 0;
                    npc.netUpdate = true;
                }
            } else {
                s.swoopRecoveryTimer = Number(s.swoopRecoveryTimer || 0) + 1;
                const recoveryTime = Number(s.swoopRecoveryTimer);
                if (recoveryTime <= 12) {
                    vx = lerp(vx, Number(s.swoopLockVx || vx), 0.62);
                    vy = lerp(vy, Number(s.swoopLockVy || vy), 0.62);
                } else {
                    const exitX = px + 345 * dir;
                    const exitY = py - 160;
                    const exit = normalize(exitX - cx, exitY - cy, dir, -0.5);
                    const recoverySpeed = supercharged ? 10.5 : 7.75;
                    const turn = Math.min(0.34, 0.14 + (recoveryTime - 12) * 0.012);
                    vx = lerp(vx, exit[0] * recoverySpeed, turn);
                    vy = lerp(vy, exit[1] * recoverySpeed, turn);
                }
            }
            if (s.subphaseTimer >= total) {
                s.phase = 0;
                s.searchDirection = -dir;
                s.subphaseTimer = 0;
                s.approachTimer = 0;
                s.swoopAimX = 0;
                s.swoopAimY = 0;
                s.swoopLocked = 0;
                s.swoopLockVx = 0;
                s.swoopLockVy = 0;
                s.swoopRecoveryTimer = 0;
                npc.netUpdate = true;
            }
        }
        npc.velocity = Vector2.new(vx, vy);
        npc.rotation = vx / (s.phase === 3 ? 12 : 16);
        npc.spriteDirection = vx < 0 ? 1 : -1;
        if (supercharged && s.age % 12 === 0 && Terraria.Main.netMode !== 2) {
            const d = NewDust(npc.position, npc.width, npc.height, Terraria.ID.DustID.Electric, 0, 0, 80, Color.White, 0.65);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
        return false;
    }

    FindFrame(npc, h) {
        npc.frameCounter++;
        let f = Math.floor(Number(npc.frameCounter) / 5) % 6;
        if (CalamityNPCState.Get(npc).superchargeTimer > 0)
            f += 6;
        const r = npc.frame;
        r.Y = f * h;
        npc.frame = r;
    }

    ModifyNPCLoot(loot) {
        const scrap = ModItem.getTypeByName('WulfrumMetalScrap'), battery = ModItem.getTypeByName('WulfrumBattery');
        if (scrap > 0)
            loot.Add(ItemDropRule.Common(scrap, 1, 2, 3));
        if (battery > 0)
            loot.Add(ItemDropRule.Common(battery, 14, 1, 1));
    }

    OnKill(npc) {
        const s = CalamityNPCState.Get(npc);
        if (s.superchargeTimer > 0) {
            const core = ModItem.getTypeByName('EnergyCore');
            if (core > 0)
                NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), npc.width, npc.height, core, 1, false, -1, false);
        }
        const ws = ModSystem.getByName('CalamityWorldState');
        if (ws && typeof ws.RecordWulfrumHovercraftKill === 'function')
            ws.RecordWulfrumHovercraftKill();
        CalamityNPCState.Remove(npc);
    }

    OnHitByPlayer(npc, player, item, damageDone, knockBack) {
        const s = CalamityNPCState.Get(npc);
        s.stunTime = 45;
        npc.netUpdate = true;
    }

    HitEffect(npc, dir, damage) {
        const dead = npc.life <= 0, c = dead ? 18 : 4;
        for (let i = 0; i < c; i++)
            NewDust(npc.position, npc.width, npc.height, Terraria.ID.DustID.GrassBlades, (Math.random() - .5) * (dead ? 3 : 1) + dir * .2, (Math.random() - .5) * (dead ? 3 : 1), 0, Color.White, dead ? 1.05 : .75);
    }
}
