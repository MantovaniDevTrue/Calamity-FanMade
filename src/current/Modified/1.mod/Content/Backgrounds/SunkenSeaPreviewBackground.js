import { ModUndergroundBackground } from './../../TL/ModBackgrounds.js';

export class SunkenSeaPreviewBackground extends ModUndergroundBackground {
    constructor() {
        super();
        this.CachedSlots = null;
    }

    ResolveSlots() {
        if (this.CachedSlots)
            return this.CachedSlots;
        this.CachedSlots = [
            ModUndergroundBackground.getBackgroundSlot('SunkenSeaBG0'),
            ModUndergroundBackground.getBackgroundSlot('SunkenSeaBG1'),
            ModUndergroundBackground.getBackgroundSlot('SunkenSeaBG2'),
            ModUndergroundBackground.getBackgroundSlot('SunkenSeaBG3')
        ];
        return this.CachedSlots;
    }

    FillTextureArray(textureSlots) {
        const slots = this.ResolveSlots();
        textureSlots[0] = slots[0];
        textureSlots[1] = slots[1];
        textureSlots[2] = slots[2];
        textureSlots[3] = slots[3];
    }
}
