import { Terraria } from './../../TL/ModImports.js';
import { ModMenu } from './../../TL/ModMenu.js';
import { ModSurfaceBackground } from './../../TL/ModBackgrounds.js';

export class CalamityPortMenu extends ModMenu {
    constructor() {
        super();
        this.Logo = 'Menus/CalamityLogo';
        this.SunTexture = 'Menus/BlankPixel';
        this.MoonTexture = 'Menus/BlankPixel';
        this.Music = Number(Terraria.ID.MusicID.MenuMusic || 50);
        this.Weight = 1.0;
    }

    SetStaticDefaults() {
        this.Background = ModSurfaceBackground.getByName('CalamityMenuBackground');
    }

    IsAvailable() {
        return true;
    }

    Update(isOnTitleScreen) {
        if (!isOnTitleScreen && Terraria.Main.gameMenu !== true) return;
        // Calamity's menu art is authored as a fixed daytime scene. Vanilla title-menu
        // time progression was tinting it toward night after sitting on the menu.
        try {
            Terraria.Main.dayTime = true;
            Terraria.Main.time = 27000;
        } catch (e) { }
    }
}
