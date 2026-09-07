import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { ModBuff } from './../../TL/ModBuff.js';

const { Vector2 } = Modules;
const MAX_PLAYERS = 256;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let CachedTeslaAuraType = 0;
let CachedStaticDischargeType = 0;
function TeslaAuraType(){ if(!(CachedTeslaAuraType>0)) CachedTeslaAuraType=Number(ModProjectile.getTypeByName('TeslaAura')||0); return CachedTeslaAuraType; }
function StaticDischargeType(){ if(!(CachedStaticDischargeType>0)) CachedStaticDischargeType=Number(ModBuff.getTypeByName('StaticDischarge')||0); return CachedStaticDischargeType; }
function GameTick(){ try{return Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(_){return 0;} }

function PlayerIndex(player) {
    try {
        const i = Math.floor(Number(Terraria.PlayerIndex(player)));
        if (i >= 0 && i < MAX_PLAYERS) return i;
    } catch (e) { }
    try {
        const i = Math.floor(Number(player.whoAmI));
        if (i >= 0 && i < MAX_PLAYERS) return i;
    } catch (e) { }
    return -1;
}

function ProjectileAt(i) {
    if (!(i >= 0)) return null;
    try { return Terraria.Main.projectile.get_Item(i); } catch (e) { }
    try { return Terraria.Main.projectile[i]; } catch (e) { }
    return null;
}

function NoneSource() {
    try { return null; } catch (e) { return null; }
}

function Center(player) {
    try { return Terraria.PlayerCenter(player); } catch (e) { }
    return Vector2.new(Number(player.position.X) + Number(player.width) * 0.5, Number(player.position.Y) + Number(player.height) * 0.5);
}

function BestClassMultiplier(player) {
    let best = 1;
    for (const key of ['meleeDamage', 'rangedDamage', 'magicDamage', 'minionDamage']) {
        const v = Number(player?.[key]);
        if (Number.isFinite(v)) best = Math.max(best, v);
    }
    try {
        const rogue = ModPlayer.getByName('CalamityPlayerState');
        if (rogue) best = Math.max(best, 1 + Math.max(0, Number(rogue.RogueDamageBonus) || 0));
    } catch (e) { }
    return best;
}

export class AerialiteAccessoryPlayer extends ModPlayer {
    constructor() {
        super();
        this.Harpy = new Array(MAX_PLAYERS).fill(false);
        this.Tesla = new Array(MAX_PLAYERS).fill(false);
        this.TeslaVisible = new Array(MAX_PLAYERS).fill(true);
        this.TeslaAuraIndex = new Array(MAX_PLAYERS).fill(-1);
        this.TeslaVerifyTick = new Array(MAX_PLAYERS).fill(-9999);
        this.TeslaDebuffTick = new Array(MAX_PLAYERS).fill(-9999);
        this.Crown = new Array(MAX_PLAYERS).fill(false);
        this.CrownVisible = new Array(MAX_PLAYERS).fill(true);
        this.CrownCount = new Array(MAX_PLAYERS).fill(0);
        this.CrownTimer = new Array(MAX_PLAYERS).fill(0);
    }

    ResetPlayer(player) {
        const i = PlayerIndex(player); if (i < 0) return;
        this.Harpy[i] = false;
        this.Tesla[i] = false;
        this.TeslaVisible[i] = true;
        this.KillTeslaAura(i);
        this.TeslaVerifyTick[i] = -9999;
        this.TeslaDebuffTick[i] = -9999;
        this.Crown[i] = false;
        this.CrownVisible[i] = true;
        this.CrownCount[i] = 0;
        this.CrownTimer[i] = 0;
    }
    OnEnterWorld(player) { this.ResetPlayer(player); }
    OnRespawn(player) { this.ResetPlayer(player); }
    UpdateDead(player) { this.ResetPlayer(player); }

    ResetEffects(player) {
        const i = PlayerIndex(player); if (i < 0) return;
        this.Harpy[i] = false;
        this.Tesla[i] = false;
        this.TeslaVisible[i] = true;
        this.Crown[i] = false;
        this.CrownVisible[i] = true;
    }

    EnableHarpy(player) { const i = PlayerIndex(player); if (i >= 0) this.Harpy[i] = true; }
    EnableTesla(player, visible) { const i = PlayerIndex(player); if (i >= 0) { this.Tesla[i] = true; this.TeslaVisible[i] = visible === true; } }
    EnableCrown(player, visible) { const i = PlayerIndex(player); if (i >= 0) { this.Crown[i] = true; this.CrownVisible[i] = visible === true; } }

    IsTeslaEquipped(player) { const i = PlayerIndex(player); return i >= 0 && this.Tesla[i] === true; }
    IsTeslaVisible(player) { const i = PlayerIndex(player); return i >= 0 && this.TeslaVisible[i] === true; }
    IsCrownEquipped(player) { const i = PlayerIndex(player); return i >= 0 && this.Crown[i] === true; }
    IsCrownVisible(player) { const i = PlayerIndex(player); return i >= 0 && this.CrownVisible[i] === true; }
    GetCrownCount(player) { const i = PlayerIndex(player); return i >= 0 ? Math.max(0, Math.min(5, Math.floor(Number(this.CrownCount[i]) || 0))) : 0; }

    UpdateEquips(player) {
        const i = PlayerIndex(player); if (i < 0) return;
        // Official Harpy Ring: +10% move speed and +20% wing flight time.
        if (this.Harpy[i]) {
            player.moveSpeed = Number(player.moveSpeed || 0) + 0.10;
            const wing = Math.max(0, Number(player.wingTimeMax) || 0);
            if (wing > 0) player.wingTimeMax = Math.max(1, Math.floor(wing * 1.20));
        }
        // Official Feather Crown bonuses are based on currently accumulated feathers.
        if (this.Crown[i]) {
            const count = this.GetCrownCount(player);
            player.magicDamage = Number(player.magicDamage || 1) + 0.02 * count;
            player.manaCost = Math.max(0, Number(player.manaCost || 1) - 0.01 * count);
            if (count >= 5) player.magicCrit = Number(player.magicCrit || 0) + 5;
        }
    }

    KillTeslaAura(i) {
        const index = Math.floor(Number(this.TeslaAuraIndex[i]));
        this.TeslaAuraIndex[i] = -1;
        const p = ProjectileAt(index);
        if (p && p.active && Number(p.type) === Number(TeslaAuraType())) {
            try { p.Kill(); } catch (e) { p.active = false; }
        }
    }

    EnsureTeslaAura(player, i) {
        const type = Number(TeslaAuraType() || 0);
        if (!(type > 0)) return;
        let p = ProjectileAt(Math.floor(Number(this.TeslaAuraIndex[i])));
        if (p && p.active && Number(p.type) === type && Number(p.owner) === i) {
            p.timeLeft = Math.max(2, Number(p.timeLeft) || 0);
            return;
        }
        const damage = Math.max(1, Math.floor(12 * BestClassMultiplier(player)));
        const idx = NewProjectile(NoneSource(), Center(player), Vector2.Zero, type, damage, 0, i, 0, 0, 0, null);
        this.TeslaAuraIndex[i] = Math.floor(Number(idx));
    }

    ShortenStaticDischarge(player, amount = 1) {
        const type = Number(StaticDischargeType() || 0);
        if (!(type > 0)) return;
        let bi = -1;
        try { bi = Number(player['int FindBuffIndex(int type)'](type)); } catch (e) { try { bi = Number(player.FindBuffIndex(type)); } catch (_) { } }
        if (!(bi >= 0)) return;
        try {
            const t = Number(player.buffTime[bi]) || 0;
            if (t > 2) player.buffTime[bi] = Math.max(2, t - Math.max(1, Math.floor(Number(amount) || 1)));
        } catch (e) { }
    }

    ResetCrown(player, cooldown = 0) {
        const i = PlayerIndex(player); if (i < 0) return;
        this.CrownCount[i] = 0;
        this.CrownTimer[i] = Math.max(0, Math.floor(Number(cooldown) || 0));
    }

    SpawnCrownFeather(player, i, featherIndex) {
        const type = Number(ModProjectile.getTypeByName('SpectralFeather') || 0);
        if (!(type > 0)) return;
        NewProjectile(NoneSource(), Center(player), Vector2.Zero, type, 0, 0, i, 0, featherIndex, 0, null);
    }

    PostUpdate(player) {
        const i = PlayerIndex(player); if (i < 0) return;
        if (this.Tesla[i]) {
            const tick = GameTick();
            // The aura now has the official long lifetime. Validate the cached projectile
            // only twice per second instead of crossing Main.projectile every player tick.
            if (this.TeslaAuraIndex[i] < 0 || tick - Number(this.TeslaVerifyTick[i] || -9999) >= 30) {
                this.TeslaVerifyTick[i] = tick;
                this.EnsureTeslaAura(player, i);
            }
            // Official effect removes one Static Discharge tick per game tick. Batch five
            // decrements into one native FindBuffIndex call to preserve the same total rate.
            if (tick - Number(this.TeslaDebuffTick[i] || -9999) >= 5) {
                this.TeslaDebuffTick[i] = tick;
                this.ShortenStaticDischarge(player, 5);
            }
        } else if (this.TeslaAuraIndex[i] >= 0) {
            this.KillTeslaAura(i);
        }

        if (!this.Crown[i]) {
            if (this.CrownCount[i] !== 0 || this.CrownTimer[i] !== 0) this.ResetCrown(player, 0);
            return;
        }
        let timer = Math.max(0, Math.floor(Number(this.CrownTimer[i]) || 0));
        if (timer > 0) {
            this.CrownTimer[i] = timer - 1;
            return;
        }
        const count = this.GetCrownCount(player);
        if (count < 5) {
            const next = count + 1;
            this.CrownCount[i] = next;
            this.CrownTimer[i] = 120;
            this.SpawnCrownFeather(player, i, next);
        }
    }

    OnMissingMana(player, item, neededMana) {
        const i = PlayerIndex(player);
        if (i >= 0 && this.Crown[i]) this.ResetCrown(player, 300);
    }

    OnConsumeItem(player, item) {
        const i = PlayerIndex(player);
        if (i < 0 || !this.Crown[i]) return;
        if (Number(item?.healMana) > 0) this.ResetCrown(player, 300);
    }

    ApplyCrownDebuff(player, npc, magic) {
        if (!magic || this.GetCrownCount(player) < 5 || !this.IsCrownEquipped(player)) return;
        const type = Number(StaticDischargeType() || 0);
        if (type > 0) { try { npc.AddBuff(type, 120, false); } catch (e) { } }
    }
    OnHitNPC(player, item, npc) { this.ApplyCrownDebuff(player, npc, item?.magic === true); }
    OnHitNPCWithProj(player, npc, projectile) { this.ApplyCrownDebuff(player, npc, projectile?.magic === true); }
}
