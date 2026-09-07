import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModProjectile } from './../../TL/ModProjectile.js';

const { Color } = Modules;

const MAX_PLAYERS = 256;
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

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

function Tick() {
    try {
        return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
    } catch (e) {
        return 0;
    }
}

export class WulfrumControllerPlayer extends ModPlayer {
    constructor() {
        super();
        this.SupportMode = new Array(MAX_PLAYERS).fill(false);
        this.SupportCount = new Array(MAX_PLAYERS).fill(0);
        this.SupportStamp = new Array(MAX_PLAYERS).fill(-100000);
        this.ToggleStamp = new Array(MAX_PLAYERS).fill(-100000);
        this.DroidType = 0;
    }

    ResetPlayer(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.SupportMode[index] = false;
        this.SupportCount[index] = 0;
        this.SupportStamp[index] = -100000;
        this.ToggleStamp[index] = -100000;
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

    GetMode(player) {
        const index = PlayerIndex(player);
        return index >= 0 && this.SupportMode[index] === true;
    }

    SetMode(player, support, announce = false) {
        const index = PlayerIndex(player);
        if (index < 0)
            return false;
        const next = support === true;
        const changed = this.SupportMode[index] !== next;
        this.SupportMode[index] = next;
        this.ToggleStamp[index] = Tick();
        if (announce && changed) {
            try {
                if (next)
                    NewText('Wulfrum Droid: modo de suporte.', 100, 235, 255);
                else
                    NewText('Wulfrum Droid: modo de ataque.', 180, 255, 90);
            } catch (e) { }
        }
        return changed;
    }

    ToggleMode(player, announce = true) {
        return this.SetMode(player, !this.GetMode(player), announce);
    }

    MarkSupport(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        const tick = Tick();
        if (this.SupportStamp[index] !== tick) {
            this.SupportStamp[index] = tick;
            this.SupportCount[index] = 0;
        }
        this.SupportCount[index]++;
    }

    GetSupportCount(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return 0;
        const age = Tick() - Number(this.SupportStamp[index]);
        if (age < 0 || age > 1)
            return 0;
        return Math.max(0, Math.floor(Number(this.SupportCount[index]) || 0));
    }

    CountOwnedDroids(player) {
        if (!(this.DroidType > 0))
            this.DroidType = Number(ModProjectile.getTypeByName('WulfrumDroid') || 0);
        if (!(this.DroidType > 0))
            return 0;
        const owner = PlayerIndex(player);
        if (owner < 0)
            return 0;
        try {
            const nativeCount = Number(player.ownedProjectileCounts[this.DroidType]);
            if (Number.isFinite(nativeCount) && nativeCount >= 0)
                return Math.floor(nativeCount);
        } catch (e) { }

        let count = 0;
        for (let i = 0; i < 1000; i++) {
            const projectile = Terraria.Main.projectile[i];
            if (projectile && projectile.active && Number(projectile.type) === this.DroidType && Number(projectile.owner) === owner)
                count++;
        }
        return count;
    }

    PostUpdateBuffs(player) {
        const count = this.GetSupportCount(player);
        if (count <= 0)
            return;

        player.statDefense += count * 2;
        player.lifeRegen += count;

        const index = PlayerIndex(player);
        if (index < 0 || (Tick() + index) % 6 !== 0)
            return;

        try {
            const position = Terraria.PlayerTopLeft(player);
            const width = Math.max(1, Number(Terraria.PlayerWidth(player)) || 1);
            const height = Math.max(1, Number(Terraria.PlayerHeight(player)) || 1);
            const dustIndex = NewDust(
                position,
                width,
                height,
                274,
                Number(player.velocity.X) * 0.35,
                -1.4 - Math.random() * 4.5,
                100,
                Color.White,
                1.2 + Math.random() * 0.6
            );
            if (dustIndex >= 0) {
                const dust = Terraria.Main.dust[dustIndex];
                if (dust) {
                    dust.noGravity = true;
                    dust.noLight = true;
                }
            }
        } catch (e) { }
    }
}
