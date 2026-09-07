import { Terraria } from './../../TL/ModImports.js';
import { ModSurfaceBackground } from './../../TL/ModBackgrounds.js';

export class CalamityMenuBackground extends ModSurfaceBackground {
    constructor() {
        super();
        this.SourceWidth = 640;
        this.SourceHeight = 360;
        this.ScaleMultiplier = 1.0;
        // The official Calamity menu draws ModernMenuBackground with Color.White.
        // Never multiply this fixed artwork by Terraria's day/night sky color.
        this.TintWithSurfaceColor = false;
        this.DrawOffsetX = 0;
        this.DrawOffsetY = 0;
    }

    ModifyFarFades() {
        try {
            Terraria.Main.instance.DrawBG_ModifyBGFarBackLayerAlpha(this.Slot, null, null);
            Terraria.Main.instance.DrawBG_ModifyBGFarBackLayerAlpha(this.Slot, null, null);
        } catch (e) { }
    }

    ChooseFarTexture() {
        return -1;
    }

    ChooseMiddleTexture() {
        return -1;
    }

    ChooseCloseTexture() {
        return ModSurfaceBackground.getBackgroundSlot('CalamityMenuClose');
    }

    ModifyCloseTexture(drawInfo) {
        const screenW = Math.max(1, Number(Terraria.Main.screenWidth) || 1280);
        const screenH = Math.max(1, Number(Terraria.Main.screenHeight) || 720);
        // Overscan by two screen pixels on both axes. The generic TL background draw
        // path can round a perfect 16:9 cover scale one pixel short on the left edge.
        const finalScale = Math.max(
            (screenW + 2) / this.SourceWidth,
            (screenH + 2) / this.SourceHeight
        );
        drawInfo.scale = finalScale / 2.0;
        drawInfo.parallax = 0.0;
        drawInfo.a = 0;
        drawInfo.b = 0;
        this.DrawOffsetX = screenW / 2.0;
        this.DrawOffsetY = ((screenH - this.SourceHeight * finalScale) / 2.0) - 320.0;
        return drawInfo;
    }
}
