import { MountLoader } from './Loaders/MountLoader.js';

export class ModMount {
    Type = -1;
    Texture = '';
    Data = null;
    Mount = {};
    
    hideEntirePlayer = false;
    
    constructor() {}
    
    get BackTexture() { return 'Textures/' + this.Texture + '_Back'; }
    get BackGlowTexture() { return 'Textures/' + this.Texture + '_Back_Glow'; }
    get BackExtraTexture() { return 'Textures/' + this.Texture + '_Back_Extra'; }
    get BackExtraGlowTexture() { return 'Textures/' + this.Texture + '_Back_Extra_Glow'; }
    get FrontTexture() { return 'Textures/' + this.Texture + '_Front'; }
    get FrontGlowTexture() { return 'Textures/' + this.Texture + '_Front_Glow'; }
    get FrontExtraTexture() { return 'Textures/' + this.Texture + '_Front_Extra'; }
    get FrontExtraGlowTexture() { return 'Textures/' + this.Texture + '_Front_Extra_Glow'; }
    
    SetStaticDefaults() {
        
    }
    
    SetMount(mount, player) {
        // Return false to prevent dust from spawning
        return true;
    }
    
    Dismount(mount, player) {
        // Return false to prevent dust from spawning
        return true;
    }
    
    JumpHeight(mount, jumpHeight, xVelocity) {
        return jumpHeight;
    }
    
    JumpSpeed(mount, jumpSpeed, xVelocity) {
        return jumpSpeed;
    }
    
    UpdateEffects(mount, player) {
        
    }
    
    /**
     * Allows for manual updating of mount frame. Return false to stop the default frame behavior. Returns true by default.
     * Possible values for @param {int} state - include:
     * 0. Standing still on the ground or sliding
     * 1. Moving on the ground
     * 2. In the air, not flying. Hovering counts as this as well.
     * 3. In the air, flying
     * 4. Flying in water
     * @param {Mount} mount
     * @param {Player} player
     * @param {Vector2} velocity
     * @returns {bool}
     */
    UpdateFrame(mount, player, state, velocity) {
        return true;
    }
    
    UseAbility(mount, player, mousePosition, toggleOn) {
        
    }
    
    AimAbility(mount, player, mousePosition) {
        
    }
    
    // drawType corresponds to the following: 0: backTexture, 1: backTextureExtra, 2: frontTexture. 3: frontTextureExtra
    // obs: this method doesn't work as expected.
    Draw(mount, playerDrawData, drawType, drawPlayer, position, drawColor, spriteEffects, shadow) {
        return true;
    }
    
    static isModType(type) { return MountLoader.isModType(type); }
    static getModMount(type) { return MountLoader.getModMount(type); }
    static getByName(name) { return MountLoader.getByName(name); }
    static getTypeByName(name) { return MountLoader.getTypeByName(name); }
    
    static register(mount) {
        MountLoader.Mounts.push(new mount());
    }
}