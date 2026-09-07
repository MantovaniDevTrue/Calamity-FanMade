import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';
import { ProjectileSource, SpawnProjectile } from './../../../Core/SeaKingArsenalRuntime.js';

const { Vector2 } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const states = new Array(1000);
const MAX_WHIRLPOOLS = 3;

function slot(projectile) {
    const value = Number(projectile && projectile.whoAmI);
    return Number.isFinite(value) ? value | 0 : -1;
}

function stateFor(projectile) {
    const index = slot(projectile);
    if (index < 0 || index >= states.length)
        return null;

    let state = states[index];
    if (!state) {
        state = {
            timer: 0,
            extension: 0,
            dx: 1,
            dy: 0,
            speed: 6,
            spawned: false
        };
        states[index] = state;
    }
    return state;
}

export class AmidiasTridentProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/AmidiasTridentProj';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 28;
        projectile.height = 28;
        projectile.melee = true;
        projectile.timeLeft = 90;
        projectile.friendly = true;
        projectile.hostile = false;
        projectile.tileCollide = false;
        projectile.ignoreWater = true;
        projectile.penetrate = -1;
        projectile.ownerHitCheck = true;
        projectile.hide = true;
        projectile.aiStyle = -1;
        projectile.usesIDStaticNPCImmunity = true;
        projectile.idStaticNPCHitCooldown = 10;
        projectile.drawLayer = 7;
        projectile.usesOwnerLight = false;
    }

    OnSpawn(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = null;

        const owner = Terraria.Main.player[projectile.owner];
        let vx = Number(projectile.velocity.X);
        let vy = Number(projectile.velocity.Y);
        let speed = Math.sqrt(vx * vx + vy * vy);
        if (!(speed > .001)) {
            speed = 6;
            vx = (Number(Terraria.PlayerDirection(owner)) || 1) * speed;
            vy = 0;
            projectile.velocity = Vector2.new(vx, vy);
        }

        const state = stateFor(projectile);
        if (!state)
            return;
        state.timer = 0;
        state.extension = 0;
        state.dx = vx / speed;
        state.dy = vy / speed;
        state.speed = speed;
        state.spawned = false;
    }

    AI(projectile) {
        const owner = Terraria.Main.player[projectile.owner];
        if (!owner || !owner.active || owner.dead) {
            projectile.Kill();
            return;
        }

        const state = stateFor(projectile);
        if (!state)
            return;
        state.timer++;

        const speed = Math.max(.001, Number(state.speed) || 6);
        const vx = Number(state.dx || 1) * speed;
        const vy = Number(state.dy || 0) * speed;
        projectile.velocity = Vector2.new(vx, vy);

        const direction = Number(state.dx) < 0 ? -1 : 1;
        projectile.direction = direction;
        projectile.spriteDirection = 1; // manual BaseSpear draw is never texture-flipped
        try {
            owner.ChangeDir(direction);
        } catch (e) {
            Terraria.SetPlayerDirection(owner, direction);
        }

        try {
            owner.heldProj = projectile.whoAmI;
            owner.itemTime = owner.itemAnimation;
        } catch (e) { }

        const maxAnimation = Math.max(1, Number(owner.itemAnimationMax) || 17);
        let animation = Number(owner.itemAnimation);
        if (!(animation > 0))
            animation = Math.max(0, maxAnimation - state.timer + 1);

        let center = Terraria.PlayerCenter(owner);
        try {
            center = owner.RotatedRelativePoint(owner.MountedCenter, false, true);
        } catch (e) { }

        let extension = Number(state.extension || 0);
        projectile.Center = Vector2.new(Number(center.X) + vx * extension, Number(center.Y) + vy * extension);
        if (extension === 0)
            extension = 3;

        const retracting = animation < maxAnimation / 3;
        extension += retracting ? -1 : .75;
        state.extension = extension;

        if (!state.spawned && retracting && Number(projectile.owner) === Number(Terraria.Main.myPlayer)) {
            state.spawned = true;
            const type = Number(ModProjectile.getTypeByName('AmidiasWhirlpool') || 0);
            if (type > 0 && CountOwned(owner, type) < MAX_WHIRLPOOLS) {
                const source = ProjectileSource(projectile, owner);
                SpawnProjectile(
                    source,
                    projectile.Center,
                    Vector2.new(vx * .8, vy * .8),
                    type,
                    projectile.damage,
                    Number(projectile.knockBack) * .85,
                    projectile.owner
                );
            }
        }

        projectile.rotation = Math.atan2(vy, vx) + Math.PI * .75;

        if (animation <= 1 || state.timer > maxAnimation + 6)
            projectile.Kill();
    }

    PreDraw(projectile, lightColor) {
        // BaseSpearProjectile on PC draws from the projectile Center with a zero
        // texture origin. TLPro's default projectile draw centers the texture,
        // which displaced these spears by roughly half their sprite size.
        try {
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            if (!texture) return true;
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            if (!draw) return true;
            const screen = Terraria.Main.screenPosition;
            const pos = Vector2.new(Number(projectile.Center.X) - Number(screen.X), Number(projectile.Center.Y) - Number(screen.Y) + Number(projectile.gfxOffY || 0));
            let color = lightColor;
            try { color = projectile.GetAlpha(lightColor); } catch (_) { }
            draw(texture, pos, null, color, Number(projectile.rotation), Vector2.Zero, Number(projectile.scale || 1), SpriteEffects.None, 0);
            return false;
        } catch (_) { return true; }
    }

    OnKill(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = null;
    }
}
