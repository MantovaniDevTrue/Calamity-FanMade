import { Terraria, Modules } from './../../TL/ModImports.js';
import { GlobalProjectile } from './../../TL/GlobalProjectile.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { FusionEntityData } from './../../Core/FusionEntityData.js';

const { Vector2 } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
let CachedRodType = 0;
let CachedVisualType = 0;
function getVisualState(proj) {
    return FusionEntityData.GetProjectileBag(proj, 'wulfrumRodBobberVisual', () => ({ active: false }));
}

export class WulfrumBobberVisualGlobalProjectile extends GlobalProjectile {
    AppliesToProjectileType(type) {
        try { return Number(type) === Number(Terraria.ID.ProjectileID.BobberWooden); }
        catch (e) { return false; }
    }

    OnSpawn(proj) {
        if (!proj || Number(proj.type) !== Number(Terraria.ID.ProjectileID.BobberWooden))
            return;
        let owner = null;
        try {
            owner = Terraria.Main.player[proj.owner];
        } catch (e) { }
        if (!owner || !owner.active)
            return;
        if (!(CachedRodType > 0))
            CachedRodType = Number(ModItem.getTypeByName('WulfrumRod') || 0);
        const rodType = CachedRodType;
        if (!(rodType > 0) || Number(owner.HeldItem?.type || 0) !== rodType)
            return;
        const state = getVisualState(proj);
        if (state)
            state.active = true;
    }

    PreDraw(proj, lightColor) {
        if (!proj || Number(proj.type) !== Number(Terraria.ID.ProjectileID.BobberWooden))
            return null;
        const state = getVisualState(proj);
        if (!state || state.active !== true)
            return null;
        try {
            if (!(CachedVisualType > 0))
                CachedVisualType = Number(ModProjectile.getTypeByName('WulfrumBobber') || 0);
            const visualType = CachedVisualType;
            if (!(visualType > 0))
                return null;
            const texture = Terraria.GameContent.TextureAssets.Projectile[visualType]?.Value;
            if (!texture)
                return null;
            const position = Vector2.new(Number(proj.Center.X) - Number(Terraria.Main.screenPosition.X), Number(proj.Center.Y) - Number(Terraria.Main.screenPosition.Y) + Number(proj.gfxOffY || 0));
            const origin = Vector2.new(Number(texture.Width) * 0.5, Number(texture.Height) * 0.5);
            let color = lightColor;
            try {
                color = proj.GetAlpha(lightColor);
            } catch (e) { }
            const effects = Number(proj.spriteDirection) < 0
                ? SpriteEffects.FlipHorizontally
                : SpriteEffects.None;
            const spriteBatch = Terraria.Main.spriteBatch;
            if (!spriteBatch)
                return null;
            const drawTexture = spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            if (!drawTexture)
                return null;
            drawTexture(texture, position, null, color, Number(proj.rotation || 0), origin, Number(proj.scale || 1), effects, 0);
            return false;
        } catch (e) {
            return null;
        }
    }
}
