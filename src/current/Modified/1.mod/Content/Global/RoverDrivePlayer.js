import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { AndroidSound } from './../../Common/Snippets/AndroidSound.js';

const { Color, Vector2 } = Modules;
const MAX_PLAYERS = 256;
const SHIELD_MAX = 20;
const RECHARGE_DELAY = 10 * 60;
const TOTAL_RECHARGE_TIME = 5 * 60;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const PlayIntegerSound = Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'];

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function PlayerIndex(player) {
    try {
        const index = Number(Terraria.PlayerIndex(player));
        if (Number.isFinite(index) && index >= 0 && index < MAX_PLAYERS)
            return Math.floor(index);
    } catch (e) { }
    try {
        const index = Number(player.whoAmI);
        if (Number.isFinite(index) && index >= 0 && index < MAX_PLAYERS)
            return Math.floor(index);
    } catch (e) { }
    return -1;
}

function Center(player) {
    try { return Terraria.PlayerCenter(player); } catch (e) { }
    return Vector2.new(Number(player.position.X) + Number(player.width) * 0.5, Number(player.position.Y) + Number(player.height) * 0.5);
}

export class RoverDrivePlayer extends ModPlayer {
    constructor() {
        super();
        this.Equipped = new Array(MAX_PLAYERS).fill(false);
        this.Visible = new Array(MAX_PLAYERS).fill(false);
        this.WasEquipped = new Array(MAX_PLAYERS).fill(false);
        this.Durability = new Array(MAX_PLAYERS).fill(0);
        this.RechargeDelay = new Array(MAX_PLAYERS).fill(0);
        this.RechargeProgress = new Array(MAX_PLAYERS).fill(0);
        this.ActivationPlayed = new Array(MAX_PLAYERS).fill(false);
        this.BlockedTotal = new Array(MAX_PLAYERS).fill(0);
        this.FullBlocks = new Array(MAX_PLAYERS).fill(0);
        this.Breaks = new Array(MAX_PLAYERS).fill(0);
        this.DroidCharges = new Array(MAX_PLAYERS).fill(0);
        this.LastBlocked = new Array(MAX_PLAYERS).fill(0);
    }

    ResetPlayer(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.Equipped[index] = false;
        this.Visible[index] = false;
        this.WasEquipped[index] = false;
        this.Durability[index] = 0;
        this.RechargeDelay[index] = 0;
        this.RechargeProgress[index] = 0;
        this.ActivationPlayed[index] = false;
        this.BlockedTotal[index] = 0;
        this.FullBlocks[index] = 0;
        this.Breaks[index] = 0;
        this.DroidCharges[index] = 0;
        this.LastBlocked[index] = 0;
    }

    OnEnterWorld(player) {
        this.ResetPlayer(player);
    }

    OnRespawn(player) {
        this.ResetPlayer(player);
    }

    UpdateDead(player) {
        this.ResetPlayer(player);
    }

    ResetEffects(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.Equipped[index] = false;
        this.Visible[index] = false;
    }

    SetEquipped(player, visible = true) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.Equipped[index] = true;
        this.Visible[index] = visible === true;
    }

    IsEquipped(player) {
        const index = PlayerIndex(player);
        return index >= 0 && this.Equipped[index] === true;
    }

    IsVisible(player) {
        const index = PlayerIndex(player);
        return index >= 0 && this.Visible[index] === true;
    }

    GetDurability(player) {
        const index = PlayerIndex(player);
        return index >= 0 ? Math.max(0, Math.floor(Number(this.Durability[index]) || 0)) : 0;
    }

    GetRechargeDelay(player) {
        const index = PlayerIndex(player);
        return index >= 0 ? Math.max(0, Math.floor(Number(this.RechargeDelay[index]) || 0)) : 0;
    }

    GetRechargeProgress(player) {
        const index = PlayerIndex(player);
        return index >= 0 ? Math.max(0, Number(this.RechargeProgress[index]) || 0) : 0;
    }

    GetFramesUntilFull(player) {
        const index = PlayerIndex(player);
        if (index < 0 || !this.Equipped[index])
            return 0;
        const durability = this.GetDurability(player);
        if (durability >= SHIELD_MAX)
            return 0;
        const missingPoints = Math.max(0, SHIELD_MAX - durability - this.GetRechargeProgress(player));
        const rechargeFrames = Math.ceil(missingPoints * TOTAL_RECHARGE_TIME / SHIELD_MAX);
        return Math.max(0, this.GetRechargeDelay(player) + rechargeFrames);
    }

    PlayOfficialSound(player, kind) {
        const index = PlayerIndex(player);
        const center = Center(player);
        let file = 'Sounds/RoverDrive/RoverDriveHit.ogg';
        let volume = 0.6;
        let cooldown = 12;
        let fallbackStyle = 10;
        if (kind === 'activate') {
            file = 'Sounds/RoverDrive/RoverDriveActivate.ogg';
            volume = 0.85;
            cooldown = 30;
            fallbackStyle = 4;
        } else if (kind === 'break') {
            file = 'Sounds/RoverDrive/RoverDriveBreak.ogg';
            volume = 0.75;
            cooldown = 20;
            fallbackStyle = 14;
        }
        try {
            const result = AndroidSound.PlayExclusive(
                `rover-drive-${kind}-${index}`,
                file,
                volume,
                Number(center.X),
                Number(center.Y),
                1200,
                100,
                cooldown,
                false
            );
            if (result && (result.ok || result.skipped))
                return;
        } catch (e) { }
        try { PlayIntegerSound(2, center, fallbackStyle, 0); } catch (e) { }
    }

    SpawnShieldDust(player, hitDirection, broke) {
        const count = broke ? 10 : 4;
        const position = Terraria.PlayerTopLeft(player);
        const width = Math.max(1, Number(Terraria.PlayerWidth(player)) || 1);
        const height = Math.max(1, Number(Terraria.PlayerHeight(player)) || 1);
        for (let i = 0; i < count; i++) {
            try {
                const angle = Math.random() * Math.PI * 2;
                const speed = (broke ? 4 : 2) + Math.random() * (broke ? 7 : 3);
                const dustIndex = NewDust(
                    position,
                    width,
                    height,
                    Terraria.ID.DustID.Electric,
                    Math.cos(angle) * speed + Number(hitDirection || 0) * 2,
                    Math.sin(angle) * speed,
                    70,
                    Color.White,
                    0.9 + Math.random() * 0.8
                );
                if (dustIndex >= 0) {
                    const dust = Terraria.Main.dust[dustIndex];
                    if (dust) {
                        dust.noGravity = true;
                        dust.noLight = false;
                    }
                }
            } catch (e) { }
        }
    }

    ConsumeShield(player, amount, hitDirection, fullBlock) {
        const index = PlayerIndex(player);
        if (index < 0)
            return 0;
        const before = this.GetDurability(player);
        const blocked = Math.max(0, Math.min(before, Math.floor(Number(amount) || 0)));
        if (blocked <= 0)
            return 0;

        const after = before - blocked;
        this.Durability[index] = after;
        this.RechargeDelay[index] = RECHARGE_DELAY;
        this.RechargeProgress[index] = 0;
        this.ActivationPlayed[index] = false;
        this.BlockedTotal[index] += blocked;
        this.LastBlocked[index] = blocked;
        if (fullBlock)
            this.FullBlocks[index]++;

        const broke = after <= 0;
        if (broke) {
            this.Breaks[index]++;
            this.PlayOfficialSound(player, 'break');
        } else {
            this.PlayOfficialSound(player, 'hit');
        }
        this.SpawnShieldDust(player, hitDirection, broke);
        return blocked;
    }

    FreeDodge(player, damageSource, damage, hitDirection) {
        const index = PlayerIndex(player);
        const incoming = Math.max(0, Math.floor(Number(damage) || 0));
        if (index < 0 || !this.Equipped[index] || incoming <= 0)
            return false;
        const shield = this.GetDurability(player);
        if (shield < incoming)
            return false;

        this.ConsumeShield(player, incoming, hitDirection, true);
        try {
            player.immune = true;
            player.immuneTime = Math.max(20, Number(player.immuneTime) || 0);
        } catch (e) { }
        return true;
    }

    ModifyHurt(player, modifiers) {
        const index = PlayerIndex(player);
        if (index < 0 || !this.Equipped[index])
            return;
        const shield = this.GetDurability(player);
        const incoming = Math.max(0, Math.floor(Number(modifiers.damage) || 0));
        if (shield <= 0 || incoming <= 0 || shield >= incoming)
            return;

        const blocked = this.ConsumeShield(player, shield, modifiers.hitDirection, false);
        modifiers.damage = Math.max(0, incoming - blocked);
    }

    AddShieldPoint(player, amount = 1, source = 'recharge') {
        const index = PlayerIndex(player);
        if (index < 0 || !this.Equipped[index])
            return 0;
        const before = this.GetDurability(player);
        const after = Clamp(before + Math.max(0, Math.floor(Number(amount) || 0)), 0, SHIELD_MAX);
        const added = after - before;
        if (added <= 0)
            return 0;
        this.Durability[index] = after;
        if (before <= 0 && !this.ActivationPlayed[index]) {
            this.PlayOfficialSound(player, 'activate');
            this.ActivationPlayed[index] = true;
        }
        if (source === 'droid')
            this.DroidCharges[index] += added;
        return added;
    }

    SetShield(player, amount) {
        const index = PlayerIndex(player);
        if (index < 0)
            return 0;
        this.Durability[index] = Clamp(Math.floor(Number(amount) || 0), 0, SHIELD_MAX);
        this.RechargeDelay[index] = 0;
        this.RechargeProgress[index] = 0;
        this.ActivationPlayed[index] = this.Durability[index] > 0;
        return this.Durability[index];
    }

    BreakShield(player) {
        const shield = this.GetDurability(player);
        if (shield <= 0)
            return false;
        this.ConsumeShield(player, shield, 0, false);
        return true;
    }

    PostUpdate(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;

        if (!this.Equipped[index]) {
            if (this.WasEquipped[index]) {
                this.Durability[index] = 0;
                this.RechargeDelay[index] = 0;
                this.RechargeProgress[index] = 0;
                this.ActivationPlayed[index] = false;
            }
            this.WasEquipped[index] = false;
            return;
        }

        if (!this.WasEquipped[index]) {
            this.WasEquipped[index] = true;
            this.Durability[index] = 0;
            this.RechargeDelay[index] = RECHARGE_DELAY;
            this.RechargeProgress[index] = 0;
            this.ActivationPlayed[index] = false;
        }

        if (this.RechargeDelay[index] > 0) {
            this.RechargeDelay[index]--;
        } else if (this.Durability[index] < SHIELD_MAX) {
            this.RechargeProgress[index] += SHIELD_MAX / TOTAL_RECHARGE_TIME;
            const points = Math.floor(this.RechargeProgress[index]);
            if (points > 0) {
                this.RechargeProgress[index] -= points;
                this.AddShieldPoint(player, points, 'recharge');
            }
        }

        if (this.Durability[index] > 0 && (Math.floor(Number(Terraria.Main.GameUpdateCount) || 0) + index) % 3 === 0) {
            try { Terraria.Lighting.AddLight(Center(player), 0.10, 0.28, 0.42); } catch (e) { }
        }
    }

    GetSummary(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return 'player=invalid';
        return `equipped=${this.Equipped[index] === true} visible=${this.Visible[index] === true} shield=${this.GetDurability(player)}/${SHIELD_MAX} delay=${this.GetRechargeDelay(player)}/${RECHARGE_DELAY} blocked=${this.BlockedTotal[index]} full=${this.FullBlocks[index]} breaks=${this.Breaks[index]} droid=${this.DroidCharges[index]} last=${this.LastBlocked[index]}`;
    }
}

export const RoverDriveConstants = {
    ShieldMax: SHIELD_MAX,
    RechargeDelay: RECHARGE_DELAY,
    TotalRechargeTime: TOTAL_RECHARGE_TIME
};
