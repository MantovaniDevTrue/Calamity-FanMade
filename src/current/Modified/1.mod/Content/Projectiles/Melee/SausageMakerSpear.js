import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { RegisterSausageSpear, ClearSausageSpear } from './../../../Core/SausageMakerRuntime.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function ProjectileSource(projectile, owner) {
    let source = null;
    try {
        source = projectile.GetProjectileSource_FromThis();
    } catch (e) { }
    if (!source && owner) {
        try {
            source = owner.GetProjectileSource_Item(owner.HeldItem);
        } catch (e) { }
    }
    return source;
}

export class SausageMakerSpear extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/SausageMakerSpear';
        this.BurningBloodType = 0;
        this.BloodType = 0;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 44;
        p.height = 44;
        p.aiStyle = -1;
        p.melee = true;
        p.timeLeft = 90;
        p.friendly = true;
        p.hostile = false;
        p.tileCollide = false;
        p.ignoreWater = true;
        p.penetrate = -1;
        p.ownerHitCheck = true;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
        p.drawLayer = 7;
        p.usesOwnerLight = true;
    }

    OnSpawn(p) {
        const owner = Terraria.Main.player[p.owner];
        let vx = Number(p.velocity.X), vy = Number(p.velocity.Y);
        let speed = Math.sqrt(vx * vx + vy * vy);
        if (!(speed > 0.001)) {
            speed = 6;
            vx = (Number(owner?.direction) || 1) * speed;
            vy = 0;
            p.velocity = Vector2.new(vx, vy);
        }
        const state = FusionEntityData.GetProjectileBag(p, 'sausage', () => ({
            timer: 0,
            extension: 0,
            dx: 1,
            dy: 0,
            speed: 6,
            dustTimer: 0
        }));
        state.timer = 0;
        state.extension = 0;
        state.dx = vx / speed;
        state.dy = vy / speed;
        state.speed = speed;
        state.dustTimer = 0;
        RegisterSausageSpear(p);
    }

    AI(p) {
        const owner = Terraria.Main.player[p.owner];
        if (!owner || !owner.active || owner.dead) {
            p.Kill();
            return;
        }
        const state = FusionEntityData.GetProjectileBag(p, 'sausage', () => ({
            timer: 0,
            extension: 3,
            dx: Number(Terraria.PlayerDirection(owner)) || 1,
            dy: 0,
            speed: 6,
            dustTimer: 0
        }));
        state.timer = Number(state.timer || 0) + 1;
        state.dustTimer = Number(state.dustTimer || 0) + 1;
        const speed = Math.max(0.001, Number(state.speed || 6));
        const velocity = Vector2.new(Number(state.dx || 1) * speed, Number(state.dy || 0) * speed);
        p.velocity = velocity;
        const direction = Number(state.dx) < 0 ? -1 : 1;
        p.direction = direction;
        p.spriteDirection = 1; // manual BaseSpear draw is never texture-flipped
        try {
            owner.ChangeDir(direction);
        } catch (e) {
            Terraria.SetPlayerDirection(owner, direction);
        }
        try {
            owner.heldProj = p.whoAmI;
        } catch (e) { }
        try {
            owner.itemTime = owner.itemAnimation;
        } catch (e) { }
        const itemAnimationMax = Math.max(1, Number(owner.itemAnimationMax) || 20);
        let itemAnimation = Number(owner.itemAnimation);
        if (!(itemAnimation > 0))
            itemAnimation = Math.max(0, itemAnimationMax - Number(state.timer) + 1);
        let mountedCenter = owner.MountedCenter;
        try {
            mountedCenter = owner.RotatedRelativePoint(owner.MountedCenter, false, true);
        } catch (e) { }
        let extension = Number(state.extension || 0);
        p.Center = Vector2.new(Number(mountedCenter.X) + Number(velocity.X) * extension, Number(mountedCenter.Y) + Number(velocity.Y) * extension);
        if (extension === 0)
            extension = 3;
        if (itemAnimation < itemAnimationMax / 3)
            extension -= 1.1;
        else
            extension += 0.9;
        state.extension = extension;
        p.rotation = Math.atan2(Number(velocity.Y), Number(velocity.X)) + Math.PI * 0.75;
        if (state.dustTimer >= 6) {
            state.dustTimer = 0;
            try {
                NewDust(Vector2.new(Number(p.position.X) + Number(p.velocity.X), Number(p.position.Y) + Number(p.velocity.Y)), p.width, p.height, 5, Number(p.velocity.X) * 0.5, Number(p.velocity.Y) * 0.5, 0, Color.White, 1);
            } catch (e) { }
        }
        if (itemAnimation <= 1 || Number(state.timer) > itemAnimationMax + 5)
            p.Kill();
    }

    PreDraw(p, lightColor) {
        try {
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            if (!texture)
                return true;
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            const screen = Terraria.Main.screenPosition;
            const drawPosition = Vector2.new(Number(p.Center.X) - Number(screen.X), Number(p.Center.Y) - Number(screen.Y) + Number(p.gfxOffY || 0));
            let color = lightColor;
            try {
                color = p.GetAlpha(lightColor);
            } catch (e) { }
            draw(texture, drawPosition, null, color, Number(p.rotation), Vector2.new(0, 0), Number(p.scale || 1), SpriteEffects.None, 0);
            return false;
        } catch (e) {
            return true;
        }
    }

    OnHitNPC(p, npc) {
        if (!(this.BurningBloodType > 0))
            this.BurningBloodType = Number(ModBuff.getTypeByName('BurningBlood') || 0);
        if (this.BurningBloodType > 0) {
            try {
                npc.AddBuff(this.BurningBloodType, 240, false);
            } catch (e) { }
        }
        if (Number(p.owner) !== Number(Terraria.Main.myPlayer))
            return;
        if (!(this.BloodType > 0))
            this.BloodType = Number(ModProjectile.getTypeByName('Blood2') || 0);
        if (!(this.BloodType > 0))
            return;
        const owner = Terraria.Main.player[p.owner];
        const source = ProjectileSource(p, owner);
        if (!source)
            return;
        const velocity = Vector2.new(Number(p.velocity.X) * 1.2, Number(p.velocity.Y) * 1.2);
        const targetSeed = Math.max(0, Number(npc?.whoAmI ?? -1) + 1);
        for (let i = 0; i < 2; i++) {
            NewProjectile(source, p.Center, velocity, this.BloodType, Math.max(1, Math.floor(Number(p.damage) / 2)), Number(p.knockBack) * 0.5, p.owner, targetSeed, 0, 0, null);
        }
    }

    OnKill(p) {
        ClearSausageSpear(p);
    }
}
