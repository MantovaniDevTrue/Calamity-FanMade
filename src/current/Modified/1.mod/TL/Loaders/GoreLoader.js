import { Terraria } from './../ModImports.js';
import { ModLoader } from './../Core/ModLoader.js';
import { ModTexture } from './../ModTexture.js';

function cloneResizedSetLastGore(array, newSize, value) {
    const resized = array.cloneResized(newSize);
    if (value != null) resized[newSize - 1] = value;
    return resized;
}

function resizeArrayProperty(propertyHolder, propertyName, newSize, value) {
    propertyHolder[propertyName] = cloneResizedSetLastGore(propertyHolder[propertyName], newSize, value);
}

export class GoreLoader {
    static goreDir = 'Textures/Gores/';
    
    static Gores = [];
    static MAX_VANILLA_ID = Terraria.ID.GoreID.Count;
    static ModTypes = new Set();
    static TypeToIndex = {};
    static GoreCount = this.MAX_VANILLA_ID;
    
    static isModGore(gore) { return this.isModType(gore.Type ?? gore.type); }
    static isModType(type) { return this.ModTypes.has(type); }
    static getByName(name) { return this.Gores.find(t => t.Name === name); }
    static getTypeByName(name) { return this.getByName(name)?.Type; }
    static getModGore(type) {
        if (this.ModTypes.has(type)) {
            return this.Gores[this.TypeToIndex[type]];
        }
        return undefined;
    }
    
    static SetupContent() {
        this.AutoLoadGores();
    }
    
    static PostSetupContent() {
        this.GoreCount = Terraria.GameContent.TextureAssets.Gore.length;
    }
    
    static AutoLoadGores() {
        let files = tl.directory.exists(this.goreDir) ? tl.directory.listFiles(this.goreDir) : [];
        if (!files || files.length === 0) return;
        files = files.filter(f => f.endsWith(".png")).map(f => f.replace(/^Textures\//, '').replace(/\.png$/i, ''));
        for (const file of files) {
            const Texture = `Textures/${file}`;
            const goreTexture = new ModTexture(Texture);
            if (!goreTexture?.exists) continue;
            
            const nextGore = Terraria.GameContent.TextureAssets.Gore.length + 1;
            const Type = nextGore - 1;
            
            this.ModTypes.add(Type);
            this.TypeToIndex[Type] = this.Gores.length;
            
            // Texture
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Gore', nextGore, goreTexture.asset.asset);
            
            // Sets
            resizeArrayProperty(Terraria.ID.GoreID.Sets, 'SpecialAI', nextGore);
            resizeArrayProperty(Terraria.ID.GoreID.Sets, 'DisappearSpeed', nextGore, 1);
            resizeArrayProperty(Terraria.ID.GoreID.Sets, 'DisappearSpeedAlpha', nextGore, 1);
            
            // Resize Arrays
            resizeArrayProperty(Terraria.GameContent.ChildSafety, 'SafeGore', nextGore, false);
            
            this.Gores.push({ Type, Texture, Name: file.replace('Gores/', '') });
        }
    }
}