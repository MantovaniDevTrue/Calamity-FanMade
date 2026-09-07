import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { SetBabySlimeOwnerActive, MarkBabySlimeAlive, HasBabySlimeAlive, ClearBabySlimeAlive } from './../Projectiles/Summon/BabySlimeGodMinions.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

const NativeJumpSlots = [
    { key: 'cloud', has: 'hasJumpOption_Cloud', can: 'canJumpAgain_Cloud', active: 'isPerformingJump_Cloud' },
    { key: 'sandstorm', has: 'hasJumpOption_Sandstorm', can: 'canJumpAgain_Sandstorm', active: 'isPerformingJump_Sandstorm' },
    { key: 'blizzard', has: 'hasJumpOption_Blizzard', can: 'canJumpAgain_Blizzard', active: 'isPerformingJump_Blizzard' },
    { key: 'fart', has: 'hasJumpOption_Fart', can: 'canJumpAgain_Fart', active: 'isPerformingJump_Fart' },
    { key: 'sail', has: 'hasJumpOption_Sail', can: 'canJumpAgain_Sail', active: 'isPerformingJump_Sail' },
    { key: 'unicorn', has: 'hasJumpOption_Unicorn', can: 'canJumpAgain_Unicorn', active: 'isPerformingJump_Unicorn' }
];

function N(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function Local(player) { try { return Math.floor(N(Terraria.PlayerIndex(player), -1)) === Math.floor(N(Terraria.Main.myPlayer, -2)); } catch (e) { return false; } }
function Source() {
    try { return null; } catch (e) { return null; }
}

function Rotate(x, y, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: x * c - y * s, y: x * s + y * c };
}

function JumpBurst(player) {
    if (typeof NewDust !== 'function') return;
    const center = Terraria.PlayerCenter(player);
    const velocity = Terraria.PlayerVelocity(player);
    const grav = N(player.gravDir, 1) < 0 ? -1 : 1;
    const baseX = -N(velocity?.X);
    const baseY = 15 * grav;
    for (let i = 0; i < 18; i++) {
        const angle = (Math.random() - 0.5) * (100 * Math.PI / 180);
        const factor = 0.1 + Math.random() * 0.7;
        const v = Rotate(baseX, baseY, angle);
        const dustType = i % 4 === 0 ? 242 : (i % 4 === 1 ? 135 : (i % 2 === 0 ? 243 : 56));
        try { NewDust(Vector2.new(N(center.X) - 3, N(center.Y) + (grav > 0 ? Terraria.PlayerHeight(player) * 0.45 : -Terraria.PlayerHeight(player) * 0.45)), 6, 6, dustType, v.x * factor, v.y * factor, 100, null, 1.15 + Math.random() * 0.55); } catch (e) { }
    }
    try { Terraria.Lighting['void AddLight(Vector2 position, float r, float g, float b)'](center, 0.18, 0.55, 0.62); } catch (e) { }
}

function JumpTrail(player, tick) {
    if (typeof NewDust !== 'function' || tick % 3 !== 0) return;
    const center = Terraria.PlayerCenter(player);
    const velocity = Terraria.PlayerVelocity(player);
    for (let i = 0; i < 2; i++) {
        const dustType = (tick + i) % 2 === 0 ? 243 : 56;
        try { NewDust(Vector2.new(N(center.X) - 2 + (Math.random() - 0.5) * 8, N(center.Y) - 2 + (Math.random() - 0.5) * 8), 4, 4, dustType, -N(velocity?.X) * 0.35 + (Math.random() - 0.5), 3 + Math.random() * 3, 150, null, 0.8 + Math.random() * 0.35); } catch (e) { }
    }
}

function SummonDamage(player, baseDamage) {
    let mult = 1;
    try { mult = Math.max(mult, N(player.minionDamage, 1)); } catch (e) { }
    return Math.max(1, Math.floor(baseDamage * mult));
}

export class StatigelPlayer extends ModPlayer {
    constructor() {
        super();
        this.SetActive = false;
        this.ClassKey = '';
        this.WasSetActive = false;
        this.MovementSetActive = false;
        this.MovementClassKey = '';
        this.NormalJumpExtended = false;
        this.ActiveJumpTicks = 0;
        this.NativeJumpSlot = null;
        this.JumpSlotPrimed = false;
        this.PreJumpDoubleCount = 0;
        this.SummonIndex = -1;
        this.SummonRetryTicks = 0;
        this.SummonSpawnedThisEquip = false;
        this.BabyBuffType = 0;
        this.CrimsonBabyType = 0;
        this.CorruptionBabyType = 0;
        this.SummonSpawnLogged = false;
        this.SetActivationLogged = false;
        this.JumpActivationLogged = false;
        this.WasNativeJumpActive = false;
        this.SummonResolveLogged = false;
        this.SummonFailureLogged = false;
    }

    ResetEffects() {
        this.MovementSetActive = this.SetActive === true || this.WasSetActive === true;
        if (this.ClassKey) this.MovementClassKey = this.ClassKey;
        this.SetActive = false;
        this.ClassKey = '';
    }

    UpdateDead() {
        this.NormalJumpExtended = false;
        this.ActiveJumpTicks = 0;
        this.MovementSetActive = false;
        this.MovementClassKey = '';
        this.NativeJumpSlot = null;
        this.JumpSlotPrimed = false;
        this.WasNativeJumpActive = false;
        this.SummonIndex = -1;
        this.SummonRetryTicks = 0;
        this.SummonSpawnedThisEquip = false;
    }

    ActivateSet(player, classKey) {
        if (!Local(player)) return;
        this.SetActive = true;
        this.ClassKey = String(classKey || '');
        if (!this.SetActivationLogged) {
            this.SetActivationLogged = true;
            try { tl.log(`[CalamityPort Statigel] full set recognized; class=${this.ClassKey}; armor-stage jump runtime active.`); } catch (e) { }
        }

        const slot = this.PickNativeJumpSlot(player);
        if (slot) {
            try { player[slot.has] = true; } catch (e) { }
            if (!this.JumpSlotPrimed) {
                this.JumpSlotPrimed = true;
                try {
                    const refresh = player['void RefreshDoubleJumps()'];
                    if (typeof refresh === 'function') refresh();
                    else player[slot.can] = true;
                } catch (e) {
                    try { player[slot.can] = true; } catch (_) { }
                }
                try { tl.log(`[CalamityPort Statigel] jump option armed during armor update; slot=${slot.key}.`); } catch (e) { }
            }
        }

        player.jumpSpeedBoost = N(player.jumpSpeedBoost, 0) + 0.6;
        if (this.ActiveJumpTicks > 0) {
            player.runAcceleration = N(player.runAcceleration, 0.08) * 3;
            player.maxRunSpeed = N(player.maxRunSpeed, 3) * 1.75;
        }
    }

    PickNativeJumpSlot(player) {
        if (this.NativeJumpSlot) return this.NativeJumpSlot;
        for (const slot of NativeJumpSlots) {
            if (player[slot.has] !== true) {
                this.NativeJumpSlot = slot;
                return slot;
            }
        }
        this.NativeJumpSlot = NativeJumpSlots[0];
        return this.NativeJumpSlot;
    }

    BeforeJumpMovement(player) {
        if (!Local(player) || !(this.MovementSetActive || this.SetActive) || player.dead) return;
        let mounted = false;
        try { mounted = !!(player.mount && player.mount.Active === true); } catch (e) { }
        if (mounted) return;
        const slot = this.NativeJumpSlot;
        if (slot) { try { player[slot.has] = true; } catch (e) { } }
        this.PreJumpDoubleCount = Math.floor(N(player.doubleJumpsPerformed, 0));
    }

    AfterJumpMovement(player) {
        if (!Local(player) || !(this.MovementSetActive || this.SetActive) || player.dead) return;
        let mounted = false;
        try { mounted = !!(player.mount && player.mount.Active === true); } catch (e) { }
        if (mounted) return;

        const slot = this.NativeJumpSlot;
        let statigelStarted = false;
        if (slot) {
            try { statigelStarted = player[slot.active] === true; } catch (e) { }
        }
        const statigelJustStarted = statigelStarted && !this.WasNativeJumpActive;
        this.WasNativeJumpActive = statigelStarted;

        if (statigelJustStarted) {
            try { player.jump = Math.max(Math.floor(N(player.jump, 0)), 25); } catch (e) { }
            this.ActiveJumpTicks = 25;
            this.NormalJumpExtended = true;
            JumpBurst(player);
            if (!this.JumpActivationLogged) {
                this.JumpActivationLogged = true;
                try { tl.log(`[CalamityPort Statigel] extra jump fired; slot=${slot.key}; duration=25t.`); } catch (e) { }
            }
        } else if (player.justJumped === true && !this.NormalJumpExtended && Math.floor(N(player.doubleJumpsPerformed, 0)) === this.PreJumpDoubleCount) {
            try { player.jump = Math.max(0, Math.floor(N(player.jump, 0))) + 5; } catch (e) { }
            this.NormalJumpExtended = true;
        }

        if (this.ActiveJumpTicks > 0) {
            JumpTrail(player, this.ActiveJumpTicks);
            this.ActiveJumpTicks--;
            if (player.controlJump !== true && Math.max(0, Math.floor(N(player.jump, 0))) <= 0) this.ActiveJumpTicks = 0;
        }
    }

    EnsureSummon(player) {
        if (this.ClassKey !== 'summon' || !Local(player)) return;
        if (!(this.BabyBuffType > 0)) this.BabyBuffType = N(ModBuff.getTypeByName('BabySlimeGodBuff'));
        if (!(this.CrimsonBabyType > 0)) this.CrimsonBabyType = N(ModProjectile.getTypeByName('CrimsonSlimeGodMinion'));
        if (!(this.CorruptionBabyType > 0)) this.CorruptionBabyType = N(ModProjectile.getTypeByName('CorruptionSlimeGodMinion'));
        if (this.BabyBuffType > 0) {
            try { player.AddBuff(this.BabyBuffType, 3600, true); } catch (e) { }
        }

        const owner = Math.floor(N(Terraria.PlayerIndex(player), -1));
        const expectedType = Terraria.WorldGen.crimson === true ? this.CrimsonBabyType : this.CorruptionBabyType;
        try { SetBabySlimeOwnerActive(owner, true); } catch (e) { }
        if (!this.SummonResolveLogged) {
            this.SummonResolveLogged = true;
            try { tl.log(`[CalamityPort Statigel] summoner set resolved; buff=${this.BabyBuffType}; crimsonBaby=${this.CrimsonBabyType}; corruptionBaby=${this.CorruptionBabyType}; expected=${expectedType}.`); } catch (e) { }
        }

        if (HasBabySlimeAlive(owner, expectedType, 8)) return;
        if (this.SummonRetryTicks > 0) {
            this.SummonRetryTicks--;
            return;
        }
        if (!(expectedType > 0) || typeof NewProjectile !== 'function') {
            this.SummonRetryTicks = 60;
            return;
        }

        const source = Source();
        const center = Terraria.PlayerCenter(player);
        let spawnResult = -1;
        try {
            const index = NewProjectile(source, center, Vector2.new(0, -1), expectedType, SummonDamage(player, 18), 0, owner, 0, 0, 0, null);
            spawnResult = Math.floor(N(index, -1));
            if (spawnResult >= 0) {
                this.SummonIndex = spawnResult;
                this.SummonSpawnedThisEquip = true;
                MarkBabySlimeAlive(owner, expectedType);
                this.SummonRetryTicks = 0;
                if (!this.SummonSpawnLogged) {
                    this.SummonSpawnLogged = true;
                    try { tl.log(`[CalamityPort Statigel] Baby Slime God spawned once for this equip cycle; type=${expectedType}; no native projectile scan.`); } catch (e) { }
                }
                return;
            }
        } catch (e) { }
        if (!this.SummonFailureLogged) {
            this.SummonFailureLogged = true;
            try { tl.log(`[CalamityPort Statigel] Baby Slime God spawn failed; expectedType=${expectedType}; result=${spawnResult}; source=null; retry=60t.`); } catch (e) { }
        }
        this.SummonRetryTicks = 60;
    }

    PostUpdate(player) {
        if (!Local(player)) return;
        const owner = Math.floor(N(Terraria.PlayerIndex(player), -1));
        if (!this.SetActive || player.dead) {
            if (this.WasSetActive && this.BabyBuffType > 0) { try { player.ClearBuff(this.BabyBuffType); } catch (e) { } }
            try { SetBabySlimeOwnerActive(owner, false); } catch (e) { }
            try { ClearBabySlimeAlive(owner); } catch (e) { }
            this.WasSetActive = false;
            this.ActiveJumpTicks = 0;
            this.NativeJumpSlot = null;
            this.JumpSlotPrimed = false;
            this.WasNativeJumpActive = false;
            this.SummonIndex = -1;
            this.SummonRetryTicks = 0;
            this.SummonSpawnedThisEquip = false;
            return;
        }
        this.WasSetActive = true;
        if (this.ClassKey !== 'summon') {
            try { SetBabySlimeOwnerActive(owner, false); } catch (e) { }
            try { ClearBabySlimeAlive(owner); } catch (e) { }
            if (this.BabyBuffType > 0) { try { player.ClearBuff(this.BabyBuffType); } catch (e) { } }
            this.SummonIndex = -1;
            this.SummonRetryTicks = 0;
            this.SummonSpawnedThisEquip = false;
            return;
        }
        this.EnsureSummon(player);
    }

}
