import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import {

    ResolvePendingFungalHeal,
    CompletePendingFungalHeal,
    ClearPendingFungalHeal
} from './../../../Core/FungalClumpRuntime.js';
import { PlayItemSound, PlayGrabSound } from '../../../Common/Snippets/LegacySoundCompat.js';
const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const PlayIntegerSound = Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'];
function PlayHealSound(position) {
    try {
        PlayIntegerSound(2, position, 139, 0);
        return;
    } catch (e) { }
    try {
        PlayItemSound(139, position, 0, 0.85);
        return;
    } catch (e) { }
    try {
        PlayGrabSound(position, 0.08, 0.9);
    } catch (e) { }
}

function DesiredVelocity(from, to, speed) {
    const x = Number(to.X) - Number(from.X);
    const y = Number(to.Y) - Number(from.Y);
    const length = Math.sqrt(x * x + y * y);
    if (!(length > 0.001))
        return Vector2.Zero;
    return Vector2.new(x / length * speed, y / length * speed);
}

function OverlapsPlayer(proj, player) {
    return Number(proj.position.X) < Number(Terraria.PlayerPositionX(player)) + Number(Terraria.PlayerWidth(player)) &&
        Number(proj.position.X) + Number(proj.width) > Number(Terraria.PlayerPositionX(player)) &&
        Number(proj.position.Y) < Number(Terraria.PlayerPositionY(player)) + Number(Terraria.PlayerHeight(player)) &&
        Number(proj.position.Y) + Number(proj.height) > Number(Terraria.PlayerPositionY(player));
}

function ApplyHeal(proj, player, amount, emergency = false) {
    let healed = 0;
    if (Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
        let moonLeech = false;
        try {
            moonLeech = player.moonLeech === true;
        } catch (e) { }
        if (!moonLeech) {
            const missing = Math.max(0, Number(player.statLifeMax2) - Number(player.statLife));
            healed = Math.min(Math.max(1, Math.floor(Number(amount) || 1)), missing);
            if (healed > 0) {
                player.statLife = Math.min(Number(player.statLifeMax2), Number(player.statLife) + healed);
                try {
                    player.HealEffect(healed, false);
                } catch (e) { }
                PlayHealSound(Terraria.PlayerCenter(player));
            }
        }
    }
    CompletePendingFungalHeal(proj, healed, emergency);
    return healed;
}

export class FungalHeal extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Healing/FungalHeal';
    }

    SetDefaults() {
        this.Projectile.width = 4;
        this.Projectile.height = 4;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.damage = 0;
        this.Projectile.penetrate = -1;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.extraUpdates = 3;
        this.Projectile.timeLeft = 480;
    }

    CanDamage() {
        return false;
    }

    AI(proj) {
        const ai = new ProjAI(proj);
        const pending = ResolvePendingFungalHeal(proj);
        const nativePlayerIndex = Number(ai[0]);
        const nativeAmount = Number(ai[1]);
        const playerIndex = pending
            ? Math.max(0, Math.floor(Number(pending.playerIndex)))
            : Math.max(0, Math.floor(Number.isFinite(nativePlayerIndex) ? nativePlayerIndex : Number(proj.owner)));
        const amount = pending
            ? Math.max(1, Math.floor(Number(pending.amount) || 1))
            : Math.max(1, Math.floor(Number.isFinite(nativeAmount) ? nativeAmount : 1));
        const player = Terraria.Main.player[playerIndex];
        if (!player || !player.active || player.dead) {
            ClearPendingFungalHeal(proj, true);
            proj.timeLeft = 0;
            return;
        }
        try {
            const dustType = 59; // Blue Fairy dust
            const index = NewDust(proj.position, proj.width, proj.height, dustType, 0, 0, 100, Color.White, 1);
            const dust = Terraria.Main.dust[index];
            if (dust) {
                dust.noGravity = true;
                dust.velocity = Vector2.Zero;
                const pos = dust.position;
                pos.X -= Number(proj.velocity.X) * 0.2;
                pos.Y += Number(proj.velocity.Y) * 0.2;
                dust.position = pos;
            }
        } catch (e) { }
        const distance = Vector2.Distance(proj.Center, Terraria.PlayerCenter(player));
        const sourceArrival = distance < 50 && OverlapsPlayer(proj, player);
        const compatibilityArrival = pending && Number(pending.age) >= 420;
        if (sourceArrival || compatibilityArrival) {
            ApplyHeal(proj, player, amount, compatibilityArrival && !sourceArrival);
            proj.Kill();
            return;
        }
        let homingSpeed = 4;
        try {
            if (player.lifeMagnet)
                homingSpeed *= 1.5;
        } catch (e) { }
        const desired = DesiredVelocity(proj.Center, Terraria.PlayerCenter(player), homingSpeed);
        const inertia = 15;
        proj.velocity = Vector2.Divide(Vector2.Add(Vector2.Multiply(proj.velocity, inertia), desired), inertia + 1);
    }

    OnKill(proj) {
        ClearPendingFungalHeal(proj, true);
    }
}
