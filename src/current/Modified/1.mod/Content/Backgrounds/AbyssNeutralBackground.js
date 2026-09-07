import { ModUndergroundBackground } from './../../TL/ModBackgrounds.js';

export class AbyssNeutralBackground extends ModUndergroundBackground {
    constructor() {
        super();
        this.CachedSlots = null;
    }

    ResolveSlots() {
        if (this.CachedSlots) return this.CachedSlots;
        this.CachedSlots = [
            ModUndergroundBackground.getBackgroundSlot('AbyssNeutralBG0'),
            ModUndergroundBackground.getBackgroundSlot('AbyssNeutralBG1'),
            ModUndergroundBackground.getBackgroundSlot('AbyssNeutralBG2'),
            ModUndergroundBackground.getBackgroundSlot('AbyssNeutralBG3')
        ];
        return this.CachedSlots;
    }

    FillTextureArray(textureSlots) {
        const s = this.ResolveSlots();
        textureSlots[0] = s[0];
        textureSlots[1] = s[1];
        textureSlots[2] = s[2];
        textureSlots[3] = s[3];
    }
}
