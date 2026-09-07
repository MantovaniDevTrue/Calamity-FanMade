import { Terraria, Modules } from './../ModImports.js';
import { MenuLoader } from './MenuLoader.js';
import { BiomeLoader } from './BiomeLoader.js';
import { SceneEffectPriority } from './../SceneEffectPriority.js';

const { Color } = Modules;

function nativeGet(collection, index) {
    if (!collection) return null;
    const i = Math.floor(Number(index));
    if (!Number.isFinite(i) || i < 0) return null;
    try { if (typeof collection.get_Item === 'function') return collection.get_Item(i); } catch (e) { }
    try {
        const getter = collection['Asset`1 get_Item(int index)'];
        if (typeof getter === 'function') return getter(i);
    } catch (e) { }
    try { return collection[i] ?? null; } catch (e) { return null; }
}
function nativeSet(collection, index, value) {
    if (!collection || value == null) return false;
    const i = Math.floor(Number(index));
    if (!Number.isFinite(i) || i < 0) return false;
    try { if (typeof collection.set_Item === 'function') { collection.set_Item(i, value); return true; } } catch (e) { }
    try { collection[i] = value; return true; } catch (e) { return false; }
}

function getTextureArray(style) {
    let array = new Array(4);
    
    switch (style) {
        case 0:
            array[0] = 1;
            array[1] = 2;
            array[2] = 4;
            array[3] = 3;
            break;
        case 1:
            if (Terraria.Main.iceBackStyle == 0) {
                array[1] = 33;
                array[3] = 32;
                array[0] = 40;
                array[2] = 34;
            } else if (Terraria.Main.iceBackStyle == 1) {
                array[1] = 118;
                array[3] = 117;
                array[0] = 160;
                array[2] = 161;
            } else if (Terraria.Main.iceBackStyle == 2) {
                array[1] = 165;
                array[3] = 167;
                array[0] = 164;
                array[2] = 166;
            } else {
                array[1] = 120;
                array[3] = 119;
                array[0] = 162;
                array[2] = 163;
            }
            break;
        case 2:
            array[0] = 62;
            array[1] = 63;
            array[2] = 64;
            array[3] = 65;
            break;
        case 3:
            array[0] = 66;
            array[1] = 67;
            array[2] = 68;
            array[3] = 69;
            break;
        case 4:
            array[0] = 70;
            array[1] = 71;
            array[2] = 68;
            array[3] = 72;
            break;
        case 5:
            array[0] = 73;
            array[1] = 74;
            array[2] = 75;
            array[3] = 76;
            break;
        case 6:
            array[0] = 77;
            array[1] = 78;
            array[2] = 79;
            array[3] = 80;
            break;
        case 7:
            array[0] = 77;
            array[1] = 81;
            array[2] = 79;
            array[3] = 82;
            break;
        case 8:
            array[0] = 83;
            array[1] = 84;
            array[2] = 85;
            array[3] = 86;
            break;
        case 9:
            array[0] = 83;
            array[1] = 87;
            array[2] = 88;
            array[3] = 89;
            break;
        case 10:
            array[0] = 121;
            array[1] = 122;
            array[2] = 123;
            array[3] = 124;
            break;
        case 11:
            if (Terraria.Main.jungleBackStyle == 0) {
                array[0] = 153;
                array[1] = 147;
                array[2] = 148;
                array[3] = 149;
            } else {
                array[0] = 146;
                array[1] = 154;
                array[2] = 155;
                array[3] = 156;
            }
            break;
        case 12:
        case 13:
        case 14:
            array[0] = 66;
            array[1] = 67;
            array[2] = 68;
            switch (style) {
                case 12:
                    array[3] = 193 + Terraria.Main.worldID % 4;
                    break;
                case 13:
                    array[3] = 188 + Terraria.Main.worldID % 5;
                    break;
                case 14:
                    array[3] = 197 + Terraria.Main.worldID % 3;
                    break;
            }
            break;
        case 15:
        case 16:
        case 17:
            array[0] = 40;
            array[1] = 33;
            array[2] = 34;
            switch (style) {
                case 15:
                    array[3] = 200;
                    break;
                case 16:
                    array[3] = 201 + Terraria.Main.worldID % 2;
                    break;
                case 17:
                    array[3] = 203 + Terraria.Main.worldID % 4;
                    break;
            }
            break;
        default: {
            switch (style) {
                case 18:
                    array[0] = 290;
                    array[1] = 291;
                    break;
                case 19:
                    array[0] = 292;
                    array[1] = 293;
                    break;
                case 20:
                    array[0] = 294;
                    array[1] = 295;
                    break;
                case 21:
                    array[0] = 296;
                    array[1] = 297;
                    break;
            }
            array[2] = -1;
            array[3] = -1;
            break;
        }
    }
    
    return array;
}

export class SceneEffectLoader {
    static AnySceneActive = false;
    static OldAnySceneActive = false;
    static CurrentScene = null;
    static CurrentSkyColor = null;
    static VanillaPriority = 0;
    // Keep a short visual handoff after leaving a Calamity scene, then return
    // completely to Terraria's native sky path. This avoids native Color/Lerp
    // bridge work every surface frame while no Calamity scene/menu is active.
    static SkyTransitionTicks = 0;
    
    static OldMapBGs = [];
    static OldRain = null;
    static OldDroplet = null;
    static OldWater1 = null;
    static OldWater2 = null;
    static OldWater3 = null;
    
    static oldUndergroundBgStyle = -1;
    static oldIceStyle = -1;
    static oldJungleStyle = -1;
    static oldBgTextures = new Array(4);
    static oldBgTextureIndexes = [-1, -1, -1, -1];
    
    static TextureNeedsUpdate = false;
    static AppliedScene = null;
    static oldUndergroundScene = null;
    
    static FindPriorityScene() {
        if (this.CurrentScene?.IsActive)
            return this.CurrentScene;
        if (BiomeLoader.ActiveBiomes.length > 0)
            return BiomeLoader.ActiveBiomes?.reduce((a, b) => a.Priority >= b.Priority ? a : b);
        return null;
    }
    
    static Update() {
        // Apply a pending texture swap only while the exact scene that requested it
        // is still active. This prevents a rapid enter/exit from swapping then
        // restoring every native array in the same update.
        if (this.TextureNeedsUpdate && this.AnySceneActive && this.CurrentScene) {
            this.ChangeTextures();
            this.TextureNeedsUpdate = false;
        } else if (this.TextureNeedsUpdate && !this.AnySceneActive) {
            this.TextureNeedsUpdate = false;
        }

        this.CalculateVanillaPriority();
        this.OldScene = this.CurrentScene;
        this.CurrentScene = this.FindPriorityScene();
        this.OldAnySceneActive = this.AnySceneActive;

        if ((this.CurrentScene?.Priority ?? -1) >= this.VanillaPriority) {
            this.AnySceneActive = true;
            if (Terraria.Main.debugWords !== tl.mod.uuid) Terraria.Main.debugWords = tl.mod.uuid;
        } else {
            this.AnySceneActive = false;
            if (Terraria.Main.debugWords === tl.mod.uuid) Terraria.Main.debugWords = '';
        }

        const activeChanged = this.OldAnySceneActive !== this.AnySceneActive;
        const sceneChanged = this.OldScene !== this.CurrentScene;

        if (activeChanged || (this.AnySceneActive && sceneChanged)) {
            // Entering from no custom scene has nothing to restore. Exiting or
            // replacing an active scene must restore the old arrays exactly once.
            if (this.OldAnySceneActive || this.AppliedScene) this.ResetTextures();
            if (this.AnySceneActive) this.TextureNeedsUpdate = true;
        }
    }
    
    static UpdateUndergroundScene() {
        if (!this.AnySceneActive) return;
        if (this.CurrentScene.UndergroundBackground) {
            if (this.oldUndergroundScene !== this.CurrentScene
            || this.oldUndergroundBgStyle !== Terraria.Main.undergroundBackground
            || (this.oldUndergroundBgStyle === 1 && this.oldIceStyle !== Terraria.Main.iceBackStyle)
            || (this.oldUndergroundBgStyle === 11 && this.oldJungleStyle !== Terraria.Main.jungleBackStyle)
            ) {
                this.oldUndergroundScene = this.CurrentScene;
                this.oldUndergroundBgStyle = Terraria.Main.undergroundBackground;
                if (this.oldUndergroundBgStyle === 1) {
                    this.oldIceStyle = Terraria.Main.iceBackStyle;
                }
                if (this.oldUndergroundBgStyle === 11) {
                    this.oldJungleStyle = Terraria.Main.jungleBackStyle;
                }
                
                for (let i = 0; i < 4; i++) {
                    if (this.oldBgTextureIndexes[i] !== -1)
                        Terraria.GameContent.TextureAssets.Background[this.oldBgTextureIndexes[i]] = this.oldBgTextures[i];
                }
                
                const arr = getTextureArray(Terraria.Main.undergroundBackground);
                
                for (let i = 0; i < 4; i++) {
                    this.oldBgTextureIndexes[i] = arr[i];
                    this.oldBgTextures[i] = Terraria.GameContent.TextureAssets.Background[arr[i]];
                }
                
                this.CurrentScene.UndergroundBackground.FillTextureArray(arr);
                
                for (let i = 0; i < 4; i++) {
                    if (this.oldBgTextureIndexes[i] === arr[i]) continue;
                    Terraria.GameContent.TextureAssets.Background[this.oldBgTextureIndexes[i]] = Terraria.GameContent.TextureAssets.Background[arr[i]];
                }
            }
        }
    }
    
    static ChangeTextures() {
        if (!this.CurrentScene || this.AppliedScene === this.CurrentScene) return;
        if (this.CurrentScene.MapBackground) {
            for (let i = 0; i < Terraria.GameContent.TextureAssets.MapBGs.length; i++) {
                this.OldMapBGs.push(Terraria.GameContent.TextureAssets.MapBGs[i]);
                Terraria.GameContent.TextureAssets.MapBGs[i] = Terraria.GameContent.TextureAssets.MapBGs[this.CurrentScene.MapBackground];
            }
        }
        
        if (this.CurrentScene.Rain) {
            this.OldRain = Terraria.GameContent.TextureAssets.Rain;
            Terraria.GameContent.TextureAssets.Rain = this.CurrentScene.Rain;
        }
        
        if (this.CurrentScene.Droplet) {
            this.OldDroplet = Terraria.GameContent.TextureAssets.Gore[706];
            Terraria.GameContent.TextureAssets.Gore[706] = this.CurrentScene.Droplet;
        }
        
        if (this.CurrentScene.WaterTexture2D) {
            const slot = this.CurrentScene.WaterStyle;
            const s = 0;
            
            this.OldWater1 = Terraria.GameContent.Liquid.LiquidRenderer.Instance._liquidTextures[s];
            Terraria.GameContent.Liquid.LiquidRenderer.Instance._liquidTextures[s] = this.CurrentScene.WaterTexture2D;//Terraria.GameContent.Liquid.LiquidRenderer.Instance._liquidTextures[slot];
            
            // Custom TLPro biomes may provide only the main liquid texture. In that case
            // TextureAssets.Liquid/LiquidSlope are not resized for the custom slot and direct
            // reads return undefined. Assigning undefined to Asset<Texture2D> crashes IL2CPP.
            // Keep vanilla block/slope assets unless the custom slot actually exists.
            const sourceLiquid = nativeGet(Terraria.GameContent.TextureAssets.Liquid, slot);
            const sourceSlope = nativeGet(Terraria.GameContent.TextureAssets.LiquidSlope, slot);
            if (sourceLiquid != null) {
                this.OldWater2 = nativeGet(Terraria.GameContent.TextureAssets.Liquid, s);
                if (!nativeSet(Terraria.GameContent.TextureAssets.Liquid, s, sourceLiquid)) this.OldWater2 = null;
            } else this.OldWater2 = null;
            if (sourceSlope != null) {
                this.OldWater3 = nativeGet(Terraria.GameContent.TextureAssets.LiquidSlope, s);
                if (!nativeSet(Terraria.GameContent.TextureAssets.LiquidSlope, s, sourceSlope)) this.OldWater3 = null;
            } else this.OldWater3 = null;
        }
        this.AppliedScene = this.CurrentScene;
    }
    
    static ResetTextures() {
        if (this.OldMapBGs.length > 0) {
            for (let i = 0; i < 42; i++) {
                Terraria.GameContent.TextureAssets.MapBGs[i] = this.OldMapBGs[i];
            }
            this.OldMapBGs = [];
        }
        
        if (this.OldRain) {
            Terraria.GameContent.TextureAssets.Rain = this.OldRain;
            this.OldRain = null;
        }
        
        if (this.OldDroplet) {
            Terraria.GameContent.TextureAssets.Gore[706] = this.OldDroplet;
            this.OldDroplet = null;
        }
        
        if (this.OldWater1) {
            const s = 0;
            Terraria.GameContent.Liquid.LiquidRenderer.Instance._liquidTextures[s] = this.OldWater1;
            if (this.OldWater2 != null) nativeSet(Terraria.GameContent.TextureAssets.Liquid, s, this.OldWater2);
            if (this.OldWater3 != null) nativeSet(Terraria.GameContent.TextureAssets.LiquidSlope, s, this.OldWater3);
            this.OldWater1 = null;
            this.OldWater2 = null;
            this.OldWater3 = null;
        }
        
        let flag = false;
        for (let i = 0; i < 4; i++) {
            if (this.oldBgTextureIndexes[i] !== -1) {
                flag = true;
                Terraria.GameContent.TextureAssets.Background[this.oldBgTextureIndexes[i]] = this.oldBgTextures[i];
            }
        }
        if (flag) {
            this.oldUndergroundBgStyle = -1;
            this.oldIceStyle = -1;
            this.oldJungleStyle = -1;
            this.oldBgTextures = new Array(4);
            this.oldBgTextureIndexes = [-1, -1, -1, -1];
        }
        this.oldUndergroundScene = null;
        this.AppliedScene = null;
    }
    
    static CalculateVanillaPriority() {
        let player = null;
        try { player = Terraria.Main.LocalPlayer; } catch (e) { }
        if (!player) try { player = Terraria.Main.player.get_Item(Math.floor(Number(Terraria.Main.myPlayer) || 0)); } catch (e) { }
        if (!player) return;
        
        const isOtherSceneActive = Terraria.Main.debugWords ? (Terraria.Main.debugWords !== tl.mod.uuid) : false;
        if (isOtherSceneActive) {
            this.VanillaPriority = Number.MAX_VALUE;
            return;
        }
        
        if (player.ZoneTowerSolar || player.ZoneTowerVortex || player.ZoneTowerNebula || player.ZoneTowerStardust)
            this.VanillaPriority = 4;
        else if (player.ZoneDungeon || player.ZoneLihzhardTemple || player.ZoneGlowshroom || player.ZoneCorrupt || player.ZoneCrimson || player.ZoneShimmer)
            this.VanillaPriority = 3;
        else if (player.ZoneMeteor || player.ZoneJungle || player.ZoneGraveyard || player.ZoneSnow)
            this.VanillaPriority = 2;
        else if (player.ZoneHallow || player.ZoneBeach || player.ZoneDesert)
            this.VanillaPriority = 1;
        else
            this.VanillaPriority = 0;
    }
    
    static GetLightFactor() {
        const t = Terraria.Main.time, n = 0.08;
        if (!Terraria.Main.dayTime) return n;
        return t < 27000 ? n + (t/27000)*(1-n) :
        t < 40500 ? 1 : 1 - ((t-40500)/16200)*(1-n);
    }
    
    static ModifySunLightColor(skyColor) {
        const menuActive = !!MenuLoader.CurrentMenu;
        const sceneActive = this.AnySceneActive === true && !!this.CurrentScene;

        // Normal vanilla surface: do absolutely nothing. Previously this hook
        // performed multiple native Color operations and a ColorOfTheSkies write
        // every frame even with no Calamity biome active.
        if (!sceneActive && !menuActive) {
            if (this.SkyTransitionTicks <= 0 || !this._skyColor) {
                this.SkyTransitionTicks = 0;
                this._skyColor = null;
                return false;
            }
            this.SkyTransitionTicks--;
        } else {
            // Preserve a short fade when leaving a custom scene instead of snapping.
            this.SkyTransitionTicks = 24;
        }

        if (!this._skyColor) this._skyColor = skyColor;

        const base = sceneActive ? this.CurrentScene?.GetBiomeBaseColor() : null;
        const light = sceneActive ? this.GetLightFactor() : 1;
        const target = base
            ? Color.Lerp(skyColor, Color.Multiply(base, light), 0.7)
            : skyColor;
        const t = sceneActive ? 0.1 : 0.12;

        this._skyColor = Color.Lerp(this._skyColor, target, t);
        this._skyColor.A = skyColor.A;

        if (menuActive) MenuLoader.CurrentMenu.ModifySkyColor(this._skyColor);
        Terraria.Main.ColorOfTheSkies = this._skyColor;
        return true;
    }
    
    static SpecialVisuals(player, skyColor) {
        const touchedSky = this.ModifySunLightColor(skyColor);
        if (!touchedSky && !this.AnySceneActive) return;
        if (this.AnySceneActive && this.CurrentScene) {
            this.CurrentScene.SpecialVisuals(player, Terraria.Main.ColorOfTheSkies);
        }
    }
    
    static PreSaveAndQuit() {
        this.ResetTextures();
        BiomeLoader.ActiveBiomes = [];
        this.CurrentScene = null;
        this.AnySceneActive = false;
        this.OldAnySceneActive = false;
        this.CurrentScene = null;
        this.VanillaPriority = 0;
        this.SkyTransitionTicks = 0;
        this._skyColor = null;
        Terraria.Main.debugWords = '';
    }
}