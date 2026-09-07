import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Vector2, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const FRAME_COUNT = 6;
function StabilizeVisuals(p) {
    let frame = Math.floor(Number(p.frame) || 0);
    frame = ((frame % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    p.frame = frame;
    let alpha = Number(p.alpha);
    if (!Number.isFinite(alpha))
        alpha = 0;
    p.alpha = Math.max(0, Math.min(75, alpha));
    p.hide = false;
}

export class CorroslimeMinion extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/CorroslimeMinion';
        this.AIType = 266;
        this.BuffType = 0;
        this.BabyBuffType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = FRAME_COUNT;
        Terraria.Main.projPet[this.Type] = true;
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 26;
        p.height = 26;
        p.netImportant = true;
        p.friendly = true;
        p.hostile = false;
        p.minionSlots = 1;
        p.alpha = 75;
        p.aiStyle = 26;
        p.timeLeft = 90000;
        p.penetrate = -1;
        p.minion = true;
        p.tileCollide = false;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 23;
    }

    PostSetupContent() {
        this.BuffType = Number(ModBuff.getTypeByName('Corroslime') || 0);
        this.BabyBuffType = Number(ModBuff.getTypeByName('BabySlimeGodBuff') || 0);
    }

    AI(p) {
        let owner = null;
        try {
            owner = Terraria.Main.player.get_Item(Math.floor(Number(p.owner)));
        } catch (e) { }
        if (!owner || !owner.active || owner.dead) {
            p.Kill();
            return;
        }
        if (!(this.BuffType > 0))
            this.BuffType = Number(ModBuff.getTypeByName('Corroslime') || 0);
        if (!(this.BabyBuffType > 0))
            this.BabyBuffType = Number(ModBuff.getTypeByName('BabySlimeGodBuff') || 0);
        let hasBuff = false;
        try {
            const statigelMinion = Number(p.minionSlots || 0) <= 0.001;
            const requiredBuff = statigelMinion ? this.BabyBuffType : this.BuffType;
            hasBuff = requiredBuff > 0 && owner.FindBuffIndex(requiredBuff) >= 0;
        } catch (e) { }
        if (!hasBuff) {
            p.Kill();
            return;
        }
        p.timeLeft = 2;
        StabilizeVisuals(p);
    }

    PreDraw(p, lightColor) {
        try {
            StabilizeVisuals(p);
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            if (!texture)
                return true;
            const frameHeight = Math.floor(Number(texture.Height) / FRAME_COUNT);
            if (!(frameHeight > 0))
                return true;
            const source = Rectangle.new(0, Number(p.frame) * frameHeight, Number(texture.Width), frameHeight);
            const position = Vector2.new(Number(p.Center.X) - Number(Terraria.Main.screenPosition.X), Number(p.Center.Y) - Number(Terraria.Main.screenPosition.Y) + Number(p.gfxOffY || 0));
            const origin = Vector2.new(Number(texture.Width) / 2, frameHeight / 2);
            let color = lightColor;
            try {
                color = p.GetAlpha(lightColor);
            } catch (e) { }
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            draw(texture, position, source, color, Number(p.rotation || 0), origin, Number(p.scale || 1), SpriteEffects.None, 0);
            return false;
        } catch (e) {
            return true;
        }
    }

    MinionContactDamage() {
        return true;
    }

    OnTileCollide() {
        return false;
    }
}
