import { Terraria } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModBuff } from './../../TL/ModBuff.js';

const MAX_PLAYERS = 256;
const HIT_FREE_TIME = 600;

function PlayerIndex(player) {
    try {
        const index = Math.floor(Number(Terraria.PlayerIndex(player)));
        if (index >= 0 && index < MAX_PLAYERS)
            return index;
    } catch (e) { }
    const index = Math.floor(Number(player && player.whoAmI));
    return index >= 0 && index < MAX_PLAYERS ? index : -1;
}

export class SurfaceShrineAccessoryPlayer extends ModPlayer {
    constructor() {
        super();
        this.Trinket = new Array(MAX_PLAYERS).fill(false);
        this.ChiRegen = new Array(MAX_PLAYERS).fill(false);
        this.HitFreeTimer = new Array(MAX_PLAYERS).fill(0);
        this.ChiBuffType = 0;
    }

    Clear(player, timers) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.Trinket[index] = false;
        this.ChiRegen[index] = false;
        if (timers)
            this.HitFreeTimer[index] = 0;
    }

    OnEnterWorld(player) { this.Clear(player, true); }
    OnRespawn(player) { this.Clear(player, true); }
    UpdateDead(player) { this.Clear(player, true); }
    ResetEffects(player) { this.Clear(player, false); }

    EnableTrinket(player) {
        const index = PlayerIndex(player);
        if (index >= 0)
            this.Trinket[index] = true;
    }

    EnableChiRegen(player) {
        const index = PlayerIndex(player);
        if (index >= 0)
            this.ChiRegen[index] = true;
    }

    ResolveChiBuff() {
        if (!(this.ChiBuffType > 0))
            this.ChiBuffType = Number(ModBuff.getTypeByName('ChiBuff') || 0);
        return this.ChiBuffType;
    }

    PostUpdate(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        if (!this.Trinket[index]) {
            this.HitFreeTimer[index] = 0;
            return;
        }
        if (this.HitFreeTimer[index] < HIT_FREE_TIME)
            this.HitFreeTimer[index]++;
        else {
            const buff = this.ResolveChiBuff();
            if (buff > 0)
                player.AddBuff(buff, 6, true);
        }
    }

    UpdateLifeRegen(player) {
        const index = PlayerIndex(player);
        if (index >= 0 && (this.Trinket[index] || this.ChiRegen[index]))
            player.lifeRegen = Math.floor(Number(player.lifeRegen) || 0) + 1;
    }

    OnHurt(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        const index = PlayerIndex(player);
        if (index >= 0 && this.Trinket[index])
            this.HitFreeTimer[index] = 0;
    }
}
