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

export class MountLoader {
    static Mounts = [];
    
    static MAX_VANILLA_ID = Terraria.ID.MountID.Count;
    static Count = 0;
    static MountCount = this.MAX_VANILLA_ID + this.Count;
    static ModTypes = new Set();
    
    static isModType(type) { return this.ModTypes.has(type); }
    static isModMount(mount) { return this.isModType(mount._type); }
    static getModMount(type) { return this.Mounts.find(t => t.Type === type); }
    static getByName(name) { return this.Mounts.find(t => t.constructor.name === name); }
    static getTypeByName(name) { return this.getByName(name)?.Type; }
    static toModMount(mount) { return this.getModMount(mount._type); }
    
    static LoadMounts() {
        for (const mount of this.Mounts) {
            this.LoadMount(mount);
        }
    }
    
    static LoadMount(mount) {
        this.Count++;
        const nextMount = Terraria.Mount.mounts.length + 1;// this.MAX_VANILLA_ID + this.Count;
        
        mount.Type = mount.Mount._type = nextMount - 1;
        this.ModTypes.add(mount.Type);
        
        mount.Data = Terraria.Mount.MountData.new();
        mount.Data['void .ctor()']();
        
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'CanUseHooks', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'CanDash', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'DoesNotOverrideBodyFrames', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'DoesNotOverrideLegFrames', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'DoesNotOverrideBackpackDraw', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'IsRollerSkates', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'Cart', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'PlayerIsHidden', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'DontHoldItems', nextMount);
        resizeArrayProperty(Terraria.ID.MountID.Sets, 'DontDismountWhenCCed', nextMount);
        
        resizeArrayProperty(Terraria.Mount, 'mounts', nextMount);
        
        this.SetupTextures(mount, mount.Data);
        mount.SetStaticDefaults();
        
        if (mount.Data.buff >= Terraria.ID.BuffID.Count) {
            Terraria.ID.BuffID.Sets.MountType[mount.Data.buff] = mount.Type;
            Terraria.Main.buffNoTimeDisplay[mount.Data.buff] = true;
            Terraria.Main.buffNoSave[mount.Data.buff] = true;
        }
        
        Terraria.Mount.mounts[mount.Type] = mount.Data;
    }
    
    static SetupTextures(mount, mountData) {
        let asset = null;
        
        // _Back
        asset = new ModTexture(mount.BackTexture);
        if (asset?.exists) {
            mountData.backTexture = asset.asset.asset;
        }
        
        // _Back_Glow
        asset = new ModTexture(mount.BackGlowTexture);
        if (asset?.exists) {
            mountData.backTextureGlow = asset.asset.asset;
        }
        
        // _Back_Extra
        asset = new ModTexture(mount.BackExtraTexture);
        if (asset?.exists) {
            mountData.backTextureExtra = asset.asset.asset;
        }
        
        // _Back_Extra_Glow
        asset = new ModTexture(mount.BackExtraGlowTexture);
        if (asset?.exists) {
            mountData.backTextureExtraGlow = asset.asset.asset;
        }
        
        // _Front
        asset = new ModTexture(mount.FrontTexture);
        if (asset?.exists) {
            mountData.frontTexture = asset.asset.asset;
        }
        
        // _Front_Glow
        asset = new ModTexture(mount.FrontGlowTexture);
        if (asset?.exists) {
            mountData.frontTextureGlow = asset.asset.asset;
        }
        
        // _Front_Extra
        asset = new ModTexture(mount.FrontExtraTexture);
        if (asset?.exists) {
            mountData.frontTextureExtra = asset.asset.asset;
        }
        
        // _Front_Extra_Glow
        asset = new ModTexture(mount.FrontExtraGlowTexture);
        if (asset?.exists) {
            mountData.frontTextureExtraGlow = asset.asset.asset;
        }
    }
    
    static PostSetupContent() {
        this.LoadMounts();
        this.MountCount = this.MAX_VANILLA_ID + this.Count;
    }
    
    static JumpHeight(mount, jumpHeight, xVelocity) {
        const modMount = this.toModMount(mount);
        if (modMount) jumpHeight = modMount.JumpHeight(mount, jumpHeight, xVelocity) ?? jumpHeight;
        return Math.floor(jumpHeight);
    }
    
    static JumpSpeed(mount, jumpSpeed, xVelocity) {
        const modMount = this.toModMount(mount);
        if (modMount) jumpSpeed = modMount.JumpSpeed(mount, jumpSpeed, xVelocity) ?? jumpSpeed;
        return jumpSpeed;
    }
    
    static UpdateEffects(mount, player) {
        const modMount = this.toModMount(mount);
        if (modMount) modMount.UpdateEffects(mount, player);
    }
    
    static UpdateFrame(mount, player, state, velocity) {
        let canUpdate = true;
        const modMount = this.toModMount(mount);
        if (modMount) canUpdate = modMount.UpdateFrame(mount, player, state, velocity) ?? true;
        return canUpdate;
    }
    
    static UseAbility(mount, player, mousePosition, toggleOn) {
        const modMount = this.toModMount(mount);
        if (modMount) modMount.UseAbility(mount, player, mousePosition, toggleOn);
    }
    
    static AimAbility(mount, player, mousePosition) {
        const modMount = this.toModMount(mount);
        if (modMount) modMount.AimAbility(mount, player, mousePosition);
    }
    
    static Draw(mount, playerDrawData, drawType, drawPlayer, position, drawColor, spriteEffects, shadow) {
        let skipDraw = false;
        const modMount = this.toModMount(mount);
        if (modMount) skipDraw = !(modMount.Draw(mount, playerDrawData, drawType, drawPlayer, position, drawColor, spriteEffects, shadow) ?? true);
        return !skipDraw;
    }
}