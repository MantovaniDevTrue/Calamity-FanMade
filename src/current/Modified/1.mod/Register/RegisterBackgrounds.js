import { ModSurfaceBackground, ModUndergroundBackground } from './../TL/ModBackgrounds.js';
import { CalamityMenuBackground } from './../Content/Backgrounds/CalamityMenuBackground.js';
import { SunkenSeaPreviewBackground } from './../Content/Backgrounds/SunkenSeaPreviewBackground.js';
import { SulphurousSeaSurfaceBackground } from './../Content/Backgrounds/SulphurousSeaSurfaceBackground.js';
import { AbyssNeutralBackground } from './../Content/Backgrounds/AbyssNeutralBackground.js';

export function RegisterBackgrounds() {
    ModSurfaceBackground.register(CalamityMenuBackground);
    ModSurfaceBackground.register(SulphurousSeaSurfaceBackground);
    ModUndergroundBackground.register(SunkenSeaPreviewBackground);
    ModUndergroundBackground.register(AbyssNeutralBackground);
}
