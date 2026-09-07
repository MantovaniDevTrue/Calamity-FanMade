import { Terraria } from './../../TL/ModImports.js';
import { ModSurfaceBackground } from './../../TL/ModBackgrounds.js';

export class SulphurousSeaSurfaceBackground extends ModSurfaceBackground {
    constructor() {
        super();
        this.SourceWidth = 1024;
        this.SourceHeight = 600;
        this.ScaleMultiplier = 1.0;
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
        return ModSurfaceBackground.getBackgroundSlot('SulphurSeaSurfaceClose');
    }

    ModifyCloseTexture(drawInfo) {
        const screenW = Math.max(1, Number(Terraria.Main.screenWidth) || 1280);
        const screenH = Math.max(1, Number(Terraria.Main.screenHeight) || 720);
        const finalScale = Math.max(screenW / this.SourceWidth, screenH / this.SourceHeight);
        drawInfo.scale = finalScale / 2.0;
        drawInfo.parallax = 0.0;
        drawInfo.a = 0;
        drawInfo.b = 0;
        this.DrawOffsetX = screenW / 2.0;
        this.DrawOffsetY = (screenH - this.SourceHeight * finalScale) / 2.0;
        return drawInfo;
    }
}
