import { Terraria } from './../ModImports.js';
import { ModTexture } from './../ModTexture.js';

function cloneResizedSetLastItem(array, newSize, value) {
    const resized = array.cloneResized(newSize);
    if (value != null) resized[newSize - 1] = value;
    return resized;
}

function resizeArrayProperty(propertyHolder, propertyName, newSize, value) {
    propertyHolder[propertyName] = cloneResizedSetLastItem(propertyHolder[propertyName], newSize, value);
}

export class HairLoader {
    static Hairs = [];
    
    static MAX_VANILLA_ID = Terraria.Main.numberOfHairstyles;
    static Count = 0;
    static HairCount = this.MAX_VANILLA_ID + this.Count;
    static ModTypes = new Set();
    
    static isModType(type) { return this.ModTypes.has(type); }
    static getByName(name) { return this.Hairs.find(t => t.constructor.name === name); }
    static getTypeByName(name) { return this.getByName(name)?.Type; }
    
    static LoadHairs() {
        for (const hair of this.Hairs) {
            this.LoadHair(hair);
        }
    }
    
    static LoadHair(hair) {
        this.Count++;
        const nextHair = this.MAX_VANILLA_ID + this.Count;
        hair.Type = nextHair - 1;
        this.ModTypes.add(hair.Type);
        
        resizeArrayProperty(Terraria.GameContent.TextureAssets, 'PlayerHair', nextHair);
        resizeArrayProperty(Terraria.GameContent.TextureAssets, 'PlayerHairAlt', nextHair);
        
        const hairTex = new ModTexture('Textures/Hairs/' + hair.constructor.name);
        if (hairTex?.exists) Terraria.GameContent.TextureAssets.PlayerHair[hair.Type] = hairTex.asset.asset;
        const hairAltTex = new ModTexture('Textures/Hairs/' + hair.constructor.name + '_Alt');
        if (hairAltTex?.exists) Terraria.GameContent.TextureAssets.PlayerHairAlt[hair.Type] = hairAltTex.asset.asset;
    }
    
    static SetupContent() {
        this.LoadHairs();
        this.HairCount = this.MAX_VANILLA_ID + this.Count;
    }
}