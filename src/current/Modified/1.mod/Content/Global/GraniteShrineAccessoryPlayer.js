import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { GraniteShrineAccessoryRuntime } from './../../Core/GraniteShrineAccessoryRuntime.js';

const { Vector2 } = Modules;
const MAX_PLAYERS = 256;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function PlayerIndex(player) {
    try {
        const value = Math.floor(Number(Terraria.PlayerIndex(player)));
        if (value >= 0 && value < MAX_PLAYERS)
            return value;
    } catch (e) { }
    try {
        const value = Math.floor(Number(player && player.whoAmI));
        if (value >= 0 && value < MAX_PLAYERS)
            return value;
    } catch (e) { }
    return -1;
}
function Clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); }
function LerpValue(from, to, value) {
    if (from === to)
        return value >= to ? 1 : 0;
    return Clamp((Number(value) - Number(from)) / (Number(to) - Number(from)), 0, 1);
}
function GetSource(player) {
    // Even explicit Player source signatures enumerate the entire native type
    // on this TLPro build. Projectile.NewProjectile accepts a null source, so
    // avoid the reflection bridge entirely.
    return null;
}

function IsLocal(player) {
    const index = PlayerIndex(player);
    return index >= 0 && index === Math.floor(Number(Terraria.Main.myPlayer));
}

export class GraniteShrineAccessoryPlayer extends ModPlayer {
    constructor() {
        super();
        this.UnstableCore = new Array(MAX_PLAYERS).fill(false);
        this.GladiatorLocket = new Array(MAX_PLAYERS).fill(false);
        this.GladiatorPower = new Array(MAX_PLAYERS).fill(0);
        this.ZapActivity = new Array(MAX_PLAYERS).fill(0);
        this.GladiatorTimer = new Array(MAX_PLAYERS).fill(0);
        this.ArcZapType = 0;
        this.HealOrbType = 0;
        this.ProjectilePopulationBenchLogged = false;
    }

    ClearPlayer(player, clearTimers = false) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.UnstableCore[index] = false;
        this.GladiatorLocket[index] = false;
        this.GladiatorPower[index] = 0;
        if (clearTimers) {
            this.ZapActivity[index] = 0;
            this.GladiatorTimer[index] = 0;
        }
    }

    OnEnterWorld(player) { this.ClearPlayer(player, true); }
    OnRespawn(player) { this.ClearPlayer(player, true); }
    UpdateDead(player) { this.ClearPlayer(player, true); }
    ResetEffects(player) { this.ClearPlayer(player, false); }

    EnableUnstableCore(player) {
        const index = PlayerIndex(player);
        if (index >= 0)
            this.UnstableCore[index] = true;
    }

    EnableGladiatorLocket(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return 0;
        const maxLife = Math.max(1, Number(player.statLifeMax2) || 1);
        const lifeRatio = Clamp((Number(player.statLife) || 0) / maxLife, 0, 1);
        const statPower = Math.round((0.2 * LerpValue(1, 0.5, lifeRatio)) * 100) / 100;
        this.GladiatorLocket[index] = true;
        this.GladiatorPower[index] = Math.max(this.GladiatorPower[index], statPower);
        player.moveSpeed = Number(player.moveSpeed || 0) + statPower;
        return statPower;
    }

    ModifyWeaponDamage(player, item, damage) {
        const index = PlayerIndex(player);
        const power = index >= 0 && this.GladiatorLocket[index] ? Number(this.GladiatorPower[index]) || 0 : 0;
        this.WeaponDamage = Number(damage) * (1 + power);
    }

    ResolveTypes() {
        if (!(this.ArcZapType > 0))
            this.ArcZapType = Number(ModProjectile.getTypeByName('ArcZap') || 0);
        if (!(this.HealOrbType > 0))
            this.HealOrbType = Number(ModProjectile.getTypeByName('GladiatorHealOrb') || 0);
    }

    TrySpawnArcZap(player, index) {
        if (!IsLocal(player) || player.dead || !player.active)
            return false;
        this.ResolveTypes();
        if (!(this.ArcZapType > 0))
            return false;
        const center = Terraria.PlayerCenter(player);
        const targetIndex = GraniteShrineAccessoryRuntime.FindNearestTarget(center, 300);
        // NPC slot 0 is valid. The original `target > 0` check silently
        // discarded the first active NPC, which is commonly the only target
        // in mobile tests and single-enemy encounters.
        if (!(targetIndex >= 0))
            return false;
        const target = Terraria.Main.npc[targetIndex];
        if (!GraniteShrineAccessoryRuntime.CanChase(target))
            return false;
        GraniteShrineAccessoryRuntime.SetArcCooldown(target, 25);
        const calamityState = ModPlayer.getByName('CalamityPlayerState');
        const damage = calamityState && typeof calamityState.BestClassDamage === 'function'
            ? calamityState.BestClassDamage(player, 15)
            : 15;
        const spawn = Vector2.new(Number(center.X), Number(center.Y) - 20);
        const projectileIndex = NewProjectile(GetSource(player), spawn, Vector2.Zero, this.ArcZapType, Math.max(1, Math.floor(Number(damage) || 15)), 0, index, targetIndex, 2, 0, null);
        return Number(projectileIndex) >= 0;
    }

    PostUpdate(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        if (this.GladiatorTimer[index] > 0)
            this.GladiatorTimer[index]--;
        if (!this.UnstableCore[index])
            return;
        this.ZapActivity[index]++;
        if (!this.ProjectilePopulationBenchLogged) {
            this.ProjectilePopulationBenchLogged = true;
            try { tl.log('[CalamityPort ProjectilePopulationBench] active; ArcZap roots=90t, chain=2, FrozenCube mistRate=1/3; projectile visuals unchanged.'); } catch (e) { }
        }
        if (this.ZapActivity[index] <= 300 && this.ZapActivity[index] % 90 === 0)
            this.TrySpawnArcZap(player, index);
        else if (this.ZapActivity[index] > 600)
            this.ZapActivity[index] = 0;
    }

    TryGladiatorHeal(player, npc) {
        const index = PlayerIndex(player);
        if (index < 0 || !this.GladiatorLocket[index] || !IsLocal(player) || !npc || Number(npc.life) > 0)
            return false;
        if (!GraniteShrineAccessoryRuntime.ConsumeGladiatorOnKill(npc))
            return false;
        const healPower = 10 * LerpValue(300, 0, this.GladiatorTimer[index]);
        if (healPower < 1)
            return false;
        this.ResolveTypes();
        if (!(this.HealOrbType > 0))
            return false;
        const velocity = Vector2.new(Number(npc.velocity.X) * 0.5, Number(npc.velocity.Y) * 0.5);
        const projectileIndex = NewProjectile(GetSource(player), npc.Center, velocity, this.HealOrbType, 0, 0, -1, Math.floor(healPower), 0, 0, null);
        if (Number(projectileIndex) >= 0) {
            this.GladiatorTimer[index] = 300;
            return true;
        }
        return false;
    }

    OnHitNPC(player, item, npc, damageDone, knockBack) {
        this.TryGladiatorHeal(player, npc);
    }

    OnHitNPCWithProj(player, npc, projectile) {
        this.TryGladiatorHeal(player, npc);
    }
}
