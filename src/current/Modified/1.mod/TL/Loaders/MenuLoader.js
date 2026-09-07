import { Terraria } from './../ModImports.js';
import { ModTexture } from './../ModTexture.js';

export class MenuLoader {
    static Menus = [];
    static CurrentMenu = null;
    
    static oldLogo1 = null;
    static oldLogo2 = null;
    static oldLogo3 = null;
    static oldLogo4 = null;
    static oldLogo5 = null;
    static oldLogo6 = null;
    static oldSun = null;
    static oldMoon = null;
    
    static ChangeTextures() {
        const assets = Terraria.GameContent.TextureAssets;
        
        const logoTexture = new ModTexture('Textures/' + this.CurrentMenu.Logo);
        if (logoTexture?.exists) {
            this.oldLogo1 = assets.Logo;
            this.oldLogo2 = assets.Logo2;
            this.oldLogo3 = assets.Logo3;
            this.oldLogo4 = assets.Logo4;
            this.oldLogo5 = assets.Logo5;
            this.oldLogo6 = assets.Logo6;
            
            assets.Logo = logoTexture.asset.asset;
            assets.Logo2 = logoTexture.asset.asset;
            assets.Logo3 = logoTexture.asset.asset;
            assets.Logo4 = logoTexture.asset.asset;
            assets.Logo5 = logoTexture.asset.asset;
            assets.Logo6 = logoTexture.asset.asset;
        }
        
        const sunTexture = new ModTexture('Textures/' + this.CurrentMenu.SunTexture);
        if (sunTexture?.exists) {
            this.oldSun = assets.Sun;
            assets.Sun = sunTexture.asset.asset;
        }
        
        const moonTexture = new ModTexture('Textures/' + this.CurrentMenu.MoonTexture);
        if (moonTexture?.exists) {
            this.oldMoon = assets.Moon[0];
            assets.Moon[0] = moonTexture.asset.asset;
        }
    }
    
    static ResetTextures() {
        const assets = Terraria.GameContent.TextureAssets;
        
        if (this.oldLogo1) {
            assets.Logo = this.oldLogo1;
            assets.Logo2 = this.oldLogo2;
            assets.Logo3 = this.oldLogo3;
            assets.Logo4 = this.oldLogo4;
            assets.Logo5 = this.oldLogo5;
            assets.Logo6 = this.oldLogo6;
            
            this.oldLogo1 = this.oldLogo2 = this.oldLogo3 = this.oldLogo4 = this.oldLogo5 = this.oldLogo6 = null;
        }
        
        if (this.oldSun) {
            assets.Sun = this.oldSun;
            this.oldSun = null;
        }
        
        if (this.oldMoon) {
            assets.Moon[0] = this.oldMoon;
            this.oldMoon = null;
        }
    }
    
    static SetStaticDefaults() {
        for (const m of this.Menus) {
            m.SetStaticDefaults();
        }
    }
    
    static OnEnter() {
        this.CurrentMenu = this.ChooseMenu();
        if (this.CurrentMenu) {
            this.CurrentMenu.OnSelected();
            this.ChangeTextures();
        }
    }
    
    static OnLeave() {
        if (this.CurrentMenu) {
            this.CurrentMenu.OnDeselected();
            this.CurrentMenu = null;
        }
        this.ResetTextures();
    }
    
    static ChooseMenu() {
        const arr = this.Menus.length > 0 ? this.Menus.filter(m => m.IsAvailable()) : [];
        if (arr.length === 0) return null;
        let total = arr.reduce((a, b) => a + b.Weight, 0);
        let r = Math.random() * total;
        for (let o of arr) {
            if ((r -= o.Weight) <= 0) return o;
        }
        return null;
    }
    
    static Update() {
        // World creation/loading can fire OnWorldLoad while Terraria is still drawing the
        // game-menu screen.  If another lifecycle path cleared CurrentMenu in that window,
        // immediately restore the selected menu instead of dropping to vanilla background
        // and music for the remainder of the loading screen.
        if (Terraria.Main.gameMenu === true && !this.CurrentMenu) {
            this.OnEnter();
        }
        if (!this.CurrentMenu) return;
        if (this.CurrentMenu.MoonTexture) {
            Terraria.Main.moonType = 0;
        }

        // Keep the selected ModMenu active for every game-menu state, not only menuMode 0.
        // World creation/loading screens still draw the menu background and otherwise let
        // vanilla time advance behind it.
        this.CurrentMenu.Update(Terraria.Main.gameMenu === true);

        // Music selection normally happens in UpdateAudio_DecideOnNewMusic.  Reassert it
        // here as well so a menu that was restored during a long loading screen recovers
        // its soundtrack on the same menu tick.
        if (Terraria.Main.gameMenu === true) {
            const musicType = this.CurrentMenu.Music ?? -1;
            if (musicType !== -1) Terraria.Main.newMusic = musicType;
        }
    }
}