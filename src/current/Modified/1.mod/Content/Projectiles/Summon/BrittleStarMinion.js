import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { PlayNPCHitSound, PlayDigSound } from '../../../Common/Snippets/LegacySoundCompat.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const PlayNamedLegacySound = Terraria.Audio.SoundEngine['SoundEffectInstance PlaySound(LegacySoundStyle type, Vector2 position, float pitchOffset, float volumeScale)'];
let BrittleNamedLegacyLogged = false;
function PlayBreakSound(position) {
    try {
        if (!BrittleNamedLegacyLogged) {
            BrittleNamedLegacyLogged = true;
            try { tl.log('[CalamityPort AudioCompat] named legacy exception used: DD2_SkeletonHurt.'); } catch (_) { }
        }
        PlayNamedLegacySound(Terraria.ID.SoundID.DD2_SkeletonHurt, position, 0.5, 1);
        return;
    } catch (e) { }
    try {
        PlayNPCHitSound(4, position, 0.35, 0.9);
        return;
    } catch (e) { }
    try {
        PlayDigSound(position, 0.25, 0.8);
    } catch (e) { }
}

function PlayReformSound(position) {
    try {
        PlayDigSound(position, 0.1, 0.5);
    } catch (e) { }
}

function SpawnSandDust(position, width, height, count, speed = 2.5, scale = 1.15) {
    const dustType = 32;
    for (let i = 0; i < count; i++) {
        try {
            const angle = Math.random() * Math.PI * 2;
            const magnitude = 0.4 + Math.random() * speed;
            const index = NewDust(position, width, height, dustType, Math.cos(angle) * magnitude, Math.sin(angle) * magnitude, 40, Color.White, scale + Math.random() * 0.35);
            const dust = Terraria.Main.dust[index];
            if (dust)
                dust.noGravity = true;
        } catch (e) { }
    }
}

export class BrittleStarMinion extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/BrittleStarMinion';
        this.MinionBuff = 0;
        this.MaxTargetRange = 700;
        this.DashSpeed = 30;
    }

    SetStaticDefaults() {
        Terraria.Main.projPet[this.Type] = true;
        Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type] = true;
        Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
        Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type] = true;
    }

    SetDefaults() {
        this.Projectile.width = 30;
        this.Projectile.height = 28;
        this.Projectile.aiStyle = -1;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.minion = true;
        this.Projectile.minionSlots = 1;
        this.Projectile.penetrate = -1;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.timeLeft = 18000;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = 15;
    }

    CanCutTiles() {
        return false;
    }

    CheckActive(proj, player) {
        if (!player || player.dead || !player.active) {
            if (player && this.MinionBuff > 0)
                player.ClearBuff(this.MinionBuff);
            proj.timeLeft = 0;
            return false;
        }
        if (this.MinionBuff > 0 && player.FindBuffIndex(this.MinionBuff) >= 0) {
            proj.timeLeft = 2;
            return true;
        }
        return false;
    }

    IsValidTarget(target, proj, rangeMultiplier = 1) {
        if (!target || !target.active || target.friendly || target.townNPC || target.dontTakeDamage || target.lifeMax <= 5)
            return false;
        try {
            if (!target.CanBeChasedBy(proj, false))
                return false;
        } catch (e) { }
        return Vector2.Distance(proj.Center, target.Center) <= this.MaxTargetRange * rangeMultiplier;
    }

    GetTarget(proj, player, oldTarget) {
        if (player.HasMinionAttackTargetNPC) {
            const selected = Terraria.Main.npc[player.MinionAttackTargetNPC];
            if (this.IsValidTarget(selected, proj, 1.5))
                return selected;
        }
        if (oldTarget >= 0 && oldTarget < 200) {
            const old = Terraria.Main.npc[oldTarget];
            if (this.IsValidTarget(old, proj, 1.15))
                return old;
        }
        try {
            const found = proj.FindTargetWithinRange(this.MaxTargetRange, true);
            if (this.IsValidTarget(found, proj, 1))
                return found;
        } catch (e) { }
        let nearest = null;
        let nearestDistance = this.MaxTargetRange;
        ScanFrozenCubeNPCs(2);
        for (const i of FrozenCubeTrackedIndices()) {
            const npc = FrozenCubeNPC(i);
            if (!this.IsValidTarget(npc, proj, 1))
                continue;
            const distance = Vector2.Distance(proj.Center, npc.Center);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = npc;
            }
        }
        return nearest;
    }

    Reform(proj, player, ai) {
        ai[0] = Number(ai[0]) + 1;
        proj.alpha = 255;
        proj.friendly = false;
        proj.velocity = Vector2.Zero;
        if (Number(ai[0]) >= 0) {
            const index = Math.max(0, Number(ai[2]) || 0);
            const angle = index * 2.3999632297;
            proj.Center = Vector2.Add(Terraria.PlayerCenter(player), Vector2.new(Math.cos(angle) * 70, -45 + Math.sin(angle) * 35));
            proj.alpha = 0;
            proj.friendly = true;
            ai[0] = 0;
            ai[1] = -1;
            SpawnSandDust(proj.position, proj.width, proj.height, 12, 3.5, 1.2);
            PlayReformSound(proj.Center);
        }
    }

    Attack(proj, target) {
        const toTarget = Vector2.Subtract(target.Center, proj.Center);
        const distance = toTarget.Length();
        if (distance > 0.001)
            toTarget['void Normalize()']();
        const desired = Vector2.Multiply(toTarget, this.DashSpeed);
        if (distance > 160) {
            const inertia = 7;
            proj.velocity = Vector2.Divide(Vector2.Add(Vector2.Multiply(proj.velocity, inertia), desired), inertia + 1);
        } else if (proj.velocity.Length() < 25) {
            proj.velocity = desired;
        }
    }

    IdleMovement(proj, player, index) {
        const state = this.GetPlayerState();
        const count = Math.max(1, state ? state.CountBrittleStars(player) : 1);
        const time = Number(Terraria.Main.GameUpdateCount || 0);
        const angle = Math.PI * 2 * (index % count) / count + time * 0.025;
        const idlePosition = Vector2.Add(Terraria.PlayerCenter(player), Vector2.new(Math.cos(angle) * 75, -55 + Math.sin(angle) * 28));
        const toIdle = Vector2.Subtract(idlePosition, proj.Center);
        const distance = toIdle.Length();
        if (distance > 10) {
            toIdle['void Normalize()']();
            const desired = Vector2.Multiply(toIdle, Math.min(18, 7 + distance * 0.04));
            const inertia = 18;
            proj.velocity = Vector2.Divide(Vector2.Add(Vector2.Multiply(proj.velocity, inertia - 1), desired), inertia);
        } else {
            proj.velocity = Vector2.Multiply(proj.velocity, 0.88);
        }
    }

    GetPlayerState() {
        return ModPlayer.getByName('CalamityPlayerState');
    }

    SetDamageMode(proj, defenseMode) {
        const knockback = Number(proj.knockBack) || 0;
        if (defenseMode) {
            if (knockback < 4) {
                proj.damage = Math.max(1, Math.floor((Number(proj.damage) || 1) * 2));
                proj.knockBack = 5;
            }
        } else if (knockback >= 4) {
            proj.damage = Math.max(1, Math.floor((Number(proj.damage) || 2) / 2));
            proj.knockBack = 2;
        }
    }

    DefenseOrbit(proj, player, ai) {
        if (Number(ai[0]) < 0) {
            ai[0] = 0;
            ai[1] = -1;
        }
        this.SetDamageMode(proj, true);
        proj.alpha = 0;
        proj.friendly = true;
        proj.localNPCHitCooldown = 20;
        proj.velocity = Vector2.Zero;
        const state = this.GetPlayerState();
        const count = Math.max(1, state ? state.CountBrittleStars(player) : 1);
        const index = Math.max(0, Number(ai[2]) || 0);
        const time = Number(Terraria.Main.GameUpdateCount || 0);
        const angle = Math.PI * 2 * (index % count) / count + time * 0.025;
        const pulse = 1 + Math.sin(time * 0.045 + index * 1.7) * 0.25;
        const radius = 90 * pulse;
        const destination = Vector2.Add(Terraria.PlayerCenter(player), Vector2.new(Math.cos(angle) * radius, Math.sin(angle) * radius));
        const delta = Vector2.Subtract(destination, proj.Center);
        proj.Center = Vector2.Add(proj.Center, Vector2.Multiply(delta, 0.15));
        proj.rotation += pulse * 0.2;
        if (Vector2.Distance(proj.Center, Terraria.PlayerCenter(player)) > 1200) {
            proj.Center = Terraria.PlayerCenter(player);
        }
    }

    AI(proj) {
        if (!(this.MinionBuff > 0))
            this.MinionBuff = ModBuff.getTypeByName('BrittleStar');
        const player = Terraria.Main.player[proj.owner];
        if (!this.CheckActive(proj, player))
            return;
        const ai = new ProjAI(proj);
        if (Number(ai[1]) === 0 && Number(proj.timeLeft) > 2)
            ai[1] = -1;
        const state = this.GetPlayerState();
        const defenseMode = !!(state && state.IsLocalPlayer(player) && state.BrittleStarDefenseMode === true);
        if (defenseMode) {
            this.DefenseOrbit(proj, player, ai);
            return;
        }
        this.SetDamageMode(proj, false);
        proj.localNPCHitCooldown = 15;
        if (Number(ai[0]) < 0) {
            this.Reform(proj, player, ai);
            return;
        }
        proj.alpha = 0;
        proj.friendly = true;
        const oldTarget = Math.floor(Number(ai[1]) || -1);
        const target = this.GetTarget(proj, player, oldTarget);
        if (target) {
            ai[1] = target.whoAmI;
            this.Attack(proj, target);
        } else {
            ai[1] = -1;
            this.IdleMovement(proj, player, Math.max(0, Number(ai[2]) || 0));
        }
        if (Vector2.Distance(proj.Center, Terraria.PlayerCenter(player)) > 1200) {
            proj.Center = Terraria.PlayerCenter(player);
            proj.velocity = Vector2.Zero;
            ai[1] = -1;
        }
        proj.rotation += Math.max(-0.55, Math.min(0.55, Number(proj.velocity.X) * 0.06));
    }

    OnHitNPC(proj, npc) {
        const ai = new ProjAI(proj);
        if (Number(ai[0]) < 0)
            return;
        const state = this.GetPlayerState();
        const player = Terraria.Main.player[proj.owner];
        const defenseMode = !!(state && state.IsLocalPlayer(player) && state.BrittleStarDefenseMode === true);
        SpawnSandDust(proj.position, proj.width, proj.height, defenseMode ? 7 : 5, defenseMode ? 2.8 : 2.2, defenseMode ? 1.05 : 0.9);
        if (defenseMode) {
            ai[0] = 0;
            return;
        }
        ai[0] = Number(ai[0]) + 1;
        if (Number(ai[0]) >= 4) {
            PlayBreakSound(proj.Center);
            ai[0] = -25;
            ai[1] = -1;
            proj.alpha = 255;
            proj.friendly = false;
            proj.velocity = Vector2.Zero;
            SpawnSandDust(proj.position, proj.width, proj.height, 16, 4.5, 1.25);
        }
    }
}
