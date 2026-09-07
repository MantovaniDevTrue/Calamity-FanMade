import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
function normalize(x, y, fallbackX = 1, fallbackY = 0) {
    const length = Math.sqrt(x * x + y * y);
    if (length < 0.001)
        return { x: fallbackX, y: fallbackY };
    return { x: x / length, y: y / length };
}

export class WulfrumDrillProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Tools/WulfrumDrill';
        this.AIType = Terraria.ID.ProjectileID.CobaltDrill;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ProjectileID.CobaltDrill);
        const proj = this.Projectile;
        proj.width = 22;
        proj.height = 22;
        proj.aiStyle = 20;
        proj.friendly = true;
        proj.melee = true;
        proj.penetrate = -1;
        proj.tileCollide = false;
        proj.ownerHitCheck = true;
        proj.scale = 0.93;
        proj.hide = false;
        proj.usesIDStaticNPCImmunity = true;
        proj.idStaticNPCHitCooldown = 10;
    }

    AI(proj) {
        const owner = Terraria.Main.player[proj.owner];
        if (!owner || !owner.active || owner.dead) {
            try {
                proj.Kill();
            } catch (e) {
                proj.active = false;
            }
            return;
        }
        const fallbackDirection = Number(Terraria.PlayerDirection(owner)) < 0 ? -1 : 1;
        const aim = normalize(Number(proj.velocity.X), Number(proj.velocity.Y), fallbackDirection, 0);
        proj.velocity = Vector2.new(aim.x, aim.y);
        proj.rotation = Math.atan2(aim.y, aim.x);
        proj.Center = Vector2.new(Number(owner.MountedCenter.X) + aim.x * 12, Number(owner.MountedCenter.Y) + aim.y * 12);
        proj.timeLeft = 2;
        proj.hide = false;
        proj.alpha = 0;
        const direction = Math.abs(aim.x) > 0.03 ? (aim.x < 0 ? -1 : 1) : fallbackDirection;
        Terraria.SetPlayerDirection(owner, direction);
        proj.direction = direction;
        proj.spriteDirection = direction;
        owner.heldProj = proj.whoAmI;
        owner.itemTime = Math.max(2, Number(owner.itemTime) || 0);
        owner.itemAnimation = Math.max(2, Number(owner.itemAnimation) || 0);
        owner.itemRotation = proj.rotation * direction;
        try {
            const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
            const gravDir = Number(owner.gravDir) || 1;
            const armRotation = (proj.rotation - Math.PI / 2) * gravDir + (gravDir < 0 ? Math.PI : 0);
            owner.SetCompositeArmFront(true, stretch, armRotation);
            owner.SetCompositeArmBack(true, stretch, armRotation - 0.3926990817 * direction);
        } catch (e) { }
    }

    PreDraw(proj, lightColor) {
        try {
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            if (!texture)
                return true;
            const owner = Terraria.Main.player[proj.owner];
            const position = Vector2.new(Number(proj.Center.X) - Number(Terraria.Main.screenPosition.X), Number(proj.Center.Y) - Number(Terraria.Main.screenPosition.Y) + Number(proj.gfxOffY || 0));
            const origin = Vector2.new(9, Number(texture.Height) / 2);
            let color = lightColor;
            try {
                color = proj.GetAlpha(lightColor);
            } catch (e) { }
            let effects = SpriteEffects.None;
            if (owner && Number(Terraria.PlayerDirection(owner)) * Number(owner.gravDir || 1) < 0) {
                effects = SpriteEffects.FlipVertically;
            }
            const spriteBatch = Terraria.Main.spriteBatch;
            if (!spriteBatch)
                return true;
            const draw = spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            draw(texture, position, null, color, Number(proj.rotation || 0), origin, Number(proj.scale || 1), effects, 0);
            return false;
        } catch (e) {
            return true;
        }
    }
}
