import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';
import {
    RegisterFungalClump,
    UnregisterFungalClump,
    RegisterPendingFungalHeal,
    IsFungalClumpVanity
} from './../../../Core/FungalClumpRuntime.js';
const { Color, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const BaseDamage = 10;
const LocalHitCooldown = 10;
const TargetRefreshInterval = 30;
const LifeStealCost = 3;
const LifeStealCapClassic = 80;
const LifeStealCapExpert = 70;
const LifeStealRecoveryClassic = 0.15;
const LifeStealRecoveryExpert = 0.10;
function StableNPCIndex(knownIndex = -1) {
    const value = Math.floor(Number(knownIndex));
    return Number.isFinite(value) && value >= 0 && value < 200 ? value : -1;
}

function NPCRect(npc) {
    if (!npc)
        return null;
    try {
        const rect = npc['Rectangle getRect()']();
        if (rect)
            return rect;
    } catch (e) { }
    return null;
}

function NPCCenter(npc) {
    const rect = NPCRect(npc);
    if (!rect)
        return null;
    return Vector2.new(Number(rect.X) + Number(rect.Width) * 0.5, Number(rect.Y) + Number(rect.Height) * 0.5);
}

function DistanceSquared(a, b) {
    const dx = Number(a.X) - Number(b.X);
    const dy = Number(a.Y) - Number(b.Y);
    return dx * dx + dy * dy;
}

function IsValidTarget(npc, proj, maxRange, requireLineOfSight = false) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.lifeMax) <= 5 || Number(npc.life) <= 0)
        return false;
    try {
        if (!npc['bool CanBeChasedBy(object attacker, bool ignoreDontTakeDamage)'](proj, false))
            return false;
    } catch (e) { }
    const npcRect = NPCRect(npc);
    if (!npcRect)
        return false;
    const npcCenter = Vector2.new(Number(npcRect.X) + Number(npcRect.Width) * 0.5, Number(npcRect.Y) + Number(npcRect.Height) * 0.5);
    if (DistanceSquared(proj.Center, npcCenter) > maxRange * maxRange)
        return false;
    if (requireLineOfSight) {
        try {
            if (!Terraria.Collision.CanHitLine(proj.position, proj.width, proj.height, Vector2.new(Number(npcRect.X), Number(npcRect.Y)), Number(npcRect.Width), Number(npcRect.Height)))
                return false;
        } catch (e) { }
    }
    return true;
}

function AcquireTarget(proj, player, maxRange) {
    try {
        if (player.HasMinionAttackTargetNPC) {
            const selectedIndex = Math.floor(Number(player.MinionAttackTargetNPC));
            const selected = Terraria.Main.npc[selectedIndex];
            if (IsValidTarget(selected, proj, maxRange, true))
                return { npc: selected, index: selectedIndex };
        }
    } catch (e) { }
    const candidates = [];
    const maxDistanceSquared = maxRange * maxRange;
    ScanFrozenCubeNPCs(2);
    for (const i of FrozenCubeTrackedIndices()) {
        const npc = FrozenCubeNPC(i);
        if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.lifeMax) <= 5 || Number(npc.life) <= 0)
            continue;
        try {
            if (!npc['bool CanBeChasedBy(object attacker, bool ignoreDontTakeDamage)'](proj, false))
                continue;
        } catch (e) { }
        const npcCenter = NPCCenter(npc);
        if (!npcCenter)
            continue;
        const distanceSquared = DistanceSquared(proj.Center, npcCenter);
        if (distanceSquared > maxDistanceSquared)
            continue;
        candidates.push({ npc, index: i, distanceSquared });
        candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);
        if (candidates.length > 4)
            candidates.pop();
    }

    for (const candidate of candidates) {
        if (IsValidTarget(candidate.npc, proj, maxRange, true))
            return { npc: candidate.npc, index: candidate.index };
    }
    return null;
}

function DesiredVelocity(from, to, speed, fallbackX = 0, fallbackY = -1) {
    const x = Number(to.X) - Number(from.X);
    const y = Number(to.Y) - Number(from.Y);
    const length = Math.sqrt(x * x + y * y);
    if (!(length > 0.001))
        return Vector2.new(fallbackX * speed, fallbackY * speed);
    return Vector2.new(x / length * speed, y / length * speed);
}

function SpawnDust(proj, count, burst = false) {
    const dustType = 59;
    for (let i = 0; i < count; i++) {
        try {
            const angle = Math.random() * Math.PI * 2;
            const speed = burst ? 1.4 + Math.random() * 3.4 : 0.3 + Math.random() * 1.1;
            const index = NewDust(proj.position, proj.width, proj.height, dustType, Math.cos(angle) * speed, Math.sin(angle) * speed, burst ? 70 : 100, Color.White, burst ? 1.15 : 0.85);
            const dust = Terraria.Main.dust[index];
            if (dust) {
                dust.noGravity = true;
                if (burst)
                    dust.noLight = true;
            }
        } catch (e) { }
    }
}

export class FungalClumpMinion extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/FungalClumpMinion';
        this.ReturnStates = new Map();
        this.AnimationCounters = new Map();
        this.LocalHitCooldowns = new Map();
        this.TargetStates = new Map();
        this.LifeStealBanks = new Map();
        this.ProjectileInstances = new Map();
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 6;
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.Projectile.width = 50;
        this.Projectile.height = 50;
        this.Projectile.aiStyle = -1;
        this.Projectile.netImportant = true;
        this.Projectile.friendly = false;
        this.Projectile.hostile = false;
        this.Projectile.minion = false;
        this.Projectile.minionSlots = 0;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 90000;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = LocalHitCooldown;
    }

    OnSpawn(proj) {
        RegisterFungalClump(proj);
        const slot = Math.floor(Number(proj.whoAmI));
        const identity = Math.floor(Number(proj.identity));
        const owner = Math.floor(Number(proj.owner));
        const type = Math.floor(Number(proj.type));
        const previous = this.ProjectileInstances.get(slot);
        if (previous &&
            Number(previous.identity) === identity &&
            Number(previous.owner) === owner &&
            Number(previous.type) === type) {
            return;
        }
        this.ProjectileInstances.set(slot, { identity, owner, type });
        this.ReturnStates.set(slot, false);
        this.AnimationCounters.set(slot, 0);
        this.LocalHitCooldowns.set(slot, new Map());
        this.TargetStates.set(slot, { index: -1, refresh: 0 });
        if (!this.LifeStealBanks.has(owner))
            this.LifeStealBanks.set(owner, this.GetLifeStealCap());
        SpawnDust(proj, 36, true);
    }

    Animate(proj) {
        let counter = Number(this.AnimationCounters.get(proj.whoAmI) || 0) + 1;
        if (counter > 6) {
            counter = 0;
            proj.frame = (Number(proj.frame) + 1) % 6;
        }
        this.AnimationCounters.set(proj.whoAmI, counter);
    }

    GetTarget(proj, player, maxRange, vanityOnly) {
        if (vanityOnly) {
            this.TargetStates.set(proj.whoAmI, { index: -1, refresh: 0 });
            return null;
        }
        try {
            if (player.HasMinionAttackTargetNPC) {
                const selectedIndex = Math.floor(Number(player.MinionAttackTargetNPC));
                const selected = Terraria.Main.npc[selectedIndex];
                if (IsValidTarget(selected, proj, maxRange, true)) {
                    this.TargetStates.set(proj.whoAmI, { index: selectedIndex, refresh: TargetRefreshInterval });
                    return selected;
                }
            }
        } catch (e) { }
        let state = this.TargetStates.get(proj.whoAmI);
        if (!state)
            state = { index: -1, refresh: 0 };
        let current = null;
        if (Number(state.index) >= 0) {
            try {
                current = Terraria.Main.npc[Math.floor(Number(state.index))];
            } catch (e) { }
        }
        if (Number(state.refresh) > 0 && IsValidTarget(current, proj, maxRange, true)) {
            state.refresh = Number(state.refresh) - 1;
            this.TargetStates.set(proj.whoAmI, state);
            return current;
        }
        const acquired = AcquireTarget(proj, player, maxRange);
        state.index = acquired ? Math.floor(Number(acquired.index)) : -1;
        state.refresh = TargetRefreshInterval;
        this.TargetStates.set(proj.whoAmI, state);
        return acquired ? acquired.npc : null;
    }

    IsTouching(proj, target) {
        const rect = NPCRect(target);
        if (!rect)
            return false;
        const centerX = Number(rect.X) + Number(rect.Width) * 0.5;
        const centerY = Number(rect.Y) + Number(rect.Height) * 0.5;
        const halfWidth = (Number(proj.width) + Number(rect.Width)) * 0.5;
        const halfHeight = (Number(proj.height) + Number(rect.Height)) * 0.5;
        return Math.abs(Number(proj.Center.X) - centerX) <= halfWidth &&
            Math.abs(Number(proj.Center.Y) - centerY) <= halfHeight;
    }

    TickLocalCooldowns(proj) {
        let cooldowns = this.LocalHitCooldowns.get(proj.whoAmI);
        if (!cooldowns) {
            cooldowns = new Map();
            this.LocalHitCooldowns.set(proj.whoAmI, cooldowns);
        }
        for (const [npcId, remaining] of cooldowns.entries()) {
            const next = Number(remaining) - 1;
            if (next <= 0)
                cooldowns.delete(npcId);
            else
                cooldowns.set(npcId, next);
        }
        return cooldowns;
    }

    GetLifeStealCap() {
        return Terraria.Main.expertMode === true || Terraria.Main.masterMode === true
            ? LifeStealCapExpert
            : LifeStealCapClassic;
    }

    GetLifeStealRecovery() {
        return Terraria.Main.expertMode === true || Terraria.Main.masterMode === true
            ? LifeStealRecoveryExpert
            : LifeStealRecoveryClassic;
    }

    RecoverLifeStealBank(player) {
        const owner = Number(Terraria.PlayerIndex(player));
        const cap = this.GetLifeStealCap();
        let bank = Number(this.LifeStealBanks.get(owner));
        if (!Number.isFinite(bank))
            bank = cap;
        if (bank < cap)
            bank = Math.min(cap, bank + this.GetLifeStealRecovery());
        this.LifeStealBanks.set(owner, bank);
        return bank;
    }

    CanSpendLifeSteal(player) {
        const owner = Number(Terraria.PlayerIndex(player));
        let bank = Number(this.LifeStealBanks.get(owner));
        if (!Number.isFinite(bank)) {
            bank = this.GetLifeStealCap();
            this.LifeStealBanks.set(owner, bank);
        }
        return bank > 0;
    }

    SpendLifeSteal(player) {
        const owner = Number(Terraria.PlayerIndex(player));
        let bank = Number(this.LifeStealBanks.get(owner));
        if (!Number.isFinite(bank))
            bank = this.GetLifeStealCap();
        this.LifeStealBanks.set(owner, bank - LifeStealCost);
    }

    ApplyDirectDamage(proj, target) {
        if (!target || !target.active || target.friendly || target.dontTakeDamage || Number(target.life) <= 0)
            return 0;
        if (Number(proj.owner) !== Number(Terraria.Main.myPlayer))
            return 0;
        const requestedDamage = Math.max(1, Math.floor(Number(proj.damage) || BaseDamage));
        const targetCenter = NPCCenter(target);
        if (!targetCenter)
            return 0;
        const hitDirection = Number(targetCenter.X) >= Number(proj.Center.X) ? 1 : -1;
        const beforeLife = Math.max(0, Number(target.life) || 0);
        let reportedDamage = 0;
        try {
            reportedDamage = Number(target['double StrikeNPC(int Damage, float knockBack, int hitDirection, bool crit, bool noEffect, bool fromNet, int owner)'](requestedDamage, Number(proj.knockBack) || 1, hitDirection, false, false, false, Number(proj.owner))) || 0;
        } catch (e) { }
        const afterNativeLife = Math.max(0, Number(target.life) || 0);
        if (reportedDamage > 0 || afterNativeLife < beforeLife || !target.active) {
            try {
                target.netUpdate = true;
            } catch (e) { }
            return Math.max(1, reportedDamage || (beforeLife - afterNativeLife));
        }
        const defense = Math.max(0, Number(target.defense) || 0);
        const dealt = Math.max(1, Math.floor(requestedDamage - defense * 0.5));
        try {
            target.life = Math.max(0, beforeLife - dealt);
            target.justHit = true;
            target.netUpdate = true;
        } catch (e) {
            return 0;
        }
        try {
            target['void HitEffect(int hitDirection, double dmg)'](hitDirection, dealt);
        } catch (e) { }
        if (Number(target.life) <= 0) {
            try {
                target['void checkDead()']();
            } catch (e) {
                target.active = false;
            }
        }
        return dealt;
    }

    SpawnLifeStealOrb(proj, target, player) {
        if (!player || !player.active || player.dead || Number(proj.owner) !== Number(Terraria.Main.myPlayer))
            return false;
        try {
            if (player.moonLeech)
                return false;
        } catch (e) { }
        const missing = Math.max(0, Number(player.statLifeMax2) - Number(player.statLife));
        if (missing <= 0 || !this.CanSpendLifeSteal(player))
            return false;
        const healType = Number(ModProjectile.getTypeByName('FungalHeal') || 0);
        if (!(healType > 0))
            return false;
        let source = null;
        try {
            source = proj.GetProjectileSource_FromThis();
        } catch (e) { }
        if (!source) {
            try {
                source = player.GetProjectileSource_Item(player.HeldItem);
            } catch (e) { }
        }
        try {
            const index = NewProjectile(source, proj.Center, Vector2.Zero, healType, 0, 0, proj.owner, Terraria.PlayerIndex(player), 1, 0, null);
            if (Number(index) >= 0) {
                RegisterPendingFungalHeal(index, Terraria.PlayerIndex(player), 1);
                this.SpendLifeSteal(player);
                return true;
            }
        } catch (e) { }
        return false;
    }

    TryContactDamage(proj, target, player, cooldowns, knownTargetIndex = -1) {
        if (!target || !target.active || Number(proj.damage) <= 0 || !this.IsTouching(proj, target))
            return false;
        const npcIndex = StableNPCIndex(knownTargetIndex);
        const cooldownKey = npcIndex >= 0 ? npcIndex : -1;
        if (Number(cooldowns.get(cooldownKey) || 0) > 0)
            return false;
        const dealt = this.ApplyDirectDamage(proj, target);
        if (!(dealt > 0))
            return false;
        cooldowns.set(cooldownKey, LocalHitCooldown);
        this.SpawnLifeStealOrb(proj, target, player);
        return true;
    }

    AI(proj) {
        const player = Terraria.Main.player[proj.owner];
        if (!player || !player.active || player.dead) {
            const buffType = Number(ModBuff.getTypeByName('FungalClumpBuff') || 0);
            try {
                if (player && buffType > 0)
                    player.ClearBuff(buffType);
            } catch (e) { }
            proj.timeLeft = 0;
            return;
        }
        const ai = new ProjAI(proj);
        const vanityOnly = IsFungalClumpVanity(proj, Number(ai[0]) >= 0.5);
        if (vanityOnly) {
            proj.damage = 0;
            proj.friendly = false;
        }
        this.Animate(proj);
        if (!vanityOnly && Math.random() < 1 / 16)
            SpawnDust(proj, 1, false);
        let cooldowns = null;
        if (!vanityOnly) {
            cooldowns = this.TickLocalCooldowns(proj);
            this.RecoverLifeStealBank(player);
        }
        let returning = this.ReturnStates.get(proj.whoAmI) === true;
        let target = (!returning && !vanityOnly) ? this.GetTarget(proj, player, 900, false) : null;
        const playerRange = target ? 1400 : 500;
        const manhattan = Math.abs(Number(proj.Center.X) - Number(Terraria.PlayerCenterX(player))) + Math.abs(Number(proj.Center.Y) - Number(Terraria.PlayerCenterY(player)));
        if (manhattan > playerRange) {
            returning = true;
            target = null;
        }
        proj.tileCollide = !returning;
        if (!target) {
            const idle = Vector2.new(Number(Terraria.PlayerCenterX(player)), Number(Terraria.PlayerCenterY(player)) - 60);
            const distance = Math.sqrt(DistanceSquared(proj.Center, idle));
            if (returning && distance < 100) {
                let solid = false;
                try {
                    solid = Terraria.Collision.SolidCollision(proj.position, proj.width, proj.height);
                } catch (e) { }
                if (!solid)
                    returning = false;
            }
            if (distance > 2000 && Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
                proj.position = Vector2.new(Number(Terraria.PlayerCenterX(player)) - Number(proj.width) * 0.5, Number(Terraria.PlayerCenterY(player)) - Number(proj.height) * 0.5);
                proj.netUpdate = true;
                returning = false;
            } else if (distance > 70) {
                const speed = returning ? 12 : 8;
                const desired = DesiredVelocity(proj.Center, idle, speed);
                const inertia = 20;
                proj.velocity = Vector2.Divide(Vector2.Add(Vector2.Multiply(proj.velocity, inertia), desired), inertia + 1);
            } else {
                if (Math.abs(Number(proj.velocity.X)) + Math.abs(Number(proj.velocity.Y)) < 0.001)
                    proj.velocity = Vector2.new(-0.15, -0.05);
                else
                    proj.velocity = Vector2.Multiply(proj.velocity, 1.01);
            }
        } else {
            if (Number(ai[1]) === -1)
                ai[1] = 17;
            if (Number(ai[1]) > 0)
                ai[1] = Number(ai[1]) - 1;
            if (Number(ai[1]) === 0) {
                const targetCenter = NPCCenter(target);
                if (!targetCenter) {
                    this.TargetStates.set(proj.whoAmI, { index: -1, refresh: 0 });
                    target = null;
                } else {
                    const distance = Math.sqrt(DistanceSquared(proj.Center, targetCenter));
                    const speed = distance < 100 ? 10 : 8;
                    const desired = DesiredVelocity(proj.Center, targetCenter, speed);
                    const inertia = 14;
                    proj.velocity = Vector2.Divide(Vector2.Add(Vector2.Multiply(proj.velocity, inertia), desired), inertia + 1);
                    const state = this.TargetStates.get(proj.whoAmI);
                    const targetIndex = state ? Math.floor(Number(state.index)) : -1;
                    this.TryContactDamage(proj, target, player, cooldowns, targetIndex);
                }
            } else if (Math.abs(Number(proj.velocity.X)) + Math.abs(Number(proj.velocity.Y)) < 10) {
                proj.velocity = Vector2.Multiply(proj.velocity, 1.05);
            }
        }
        this.ReturnStates.set(proj.whoAmI, returning);
        proj.rotation = Number(proj.velocity.X) * 0.05;
        if (Math.abs(Number(proj.velocity.X)) > 0.2) {
            proj.direction = Number(proj.velocity.X) < 0 ? -1 : 1;
            proj.spriteDirection = -proj.direction;
        }
    }

    OnTileCollide() {
        return false;
    }

    CanCutTiles() {
        return false;
    }

    CanDamage() {
        return false;
    }

    OnKill(proj) {
        UnregisterFungalClump(proj);
        this.ReturnStates.delete(proj.whoAmI);
        this.AnimationCounters.delete(proj.whoAmI);
        this.LocalHitCooldowns.delete(proj.whoAmI);
        this.TargetStates.delete(proj.whoAmI);
        this.ProjectileInstances.delete(proj.whoAmI);
    }
}
