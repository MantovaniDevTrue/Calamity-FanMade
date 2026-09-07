import { Terraria } from './ModImports.js';
import { ProjectileLoader } from './Loaders/ProjectileLoader.js';
import { ModTexturedType } from './ModTexturedType.js';
import { ModLocalization } from './ModLocalization.js';

export class ModProjectile extends ModTexturedType {
    Projectile = undefined;
    Type = undefined;
    
    AIType = 0;
    
    constructor() {
        super();
    }
    
    SetupContent() {
        let name = this.constructor.name;
        let originalName = name, i = 1;
        while (Terraria.ID.ProjectileID.Search.ContainsName(name)) name = originalName + i++;
        Terraria.ID.ProjectileID.Search.Add(name, this.Type);
    }
    
    SetStaticDefaults() { }
    
    SetDefaults(proj) { }
    
    PostStaticDefaults() { }
    
    // Used to ensure that all projectiles have been initialized
    PostSetupContent() {
        
    }
    
    CloneDefaults(Type) {
        if (Type > 0 && Type < ProjectileLoader.MAX_VANILLA_ID) {
            const obj = Terraria.Projectile.new();
            obj['void .ctor()']();
            obj['void SetDefaults(int Type)'](Type);
            for (const key of ProjectileLoader.ProjectileProperties) {
                if (obj[key] === null) continue;
                this.Projectile[key] = obj[key];
            }
        }
    }
    
    DefaultToSpear() {
        this.Projectile.aiStyle = 19;
        this.Projectile.friendly = true;
        this.Projectile.penetrate = -1;
        this.Projectile.tileCollide = false;
        this.Projectile.drawLayer = 7;
        this.Projectile.usesOwnerLight = true;
        this.Projectile.ownerHitCheck = true;
        this.Projectile.melee = true;
    }
    
    DefaultToYoyo() {
        this.Projectile.aiStyle = 99;
        this.Projectile.drawLayer = 7;
        this.Projectile.friendly = true;
        this.Projectile.penetrate = -1;
        this.Projectile.melee = true;
    }
    
    DefaultToDrillOrChainsaw() {
        this.Projectile.aiStyle = 20;
        this.Projectile.friendly = true;
        this.Projectile.penetrate = -1;
        this.Projectile.tileCollide = false;
        this.Projectile.drawLayer = 7;
        this.Projectile.usesOwnerLight = true;
        this.Projectile.ownerHitCheck = true;
        this.Projectile.melee = true;
    }
    
    DefaultToKite() {
        this.Projectile.width = 4;
        this.Projectile.height = 4;
        this.Projectile.aiStyle = 160;
        this.Projectile.penetrate = -1;
        this.Projectile.extraUpdates = 60;
    }
    
    DefaultToFlail() {
        this.Projectile.aiStyle = 15;
        this.Projectile.drawLayer = 7;
        this.Projectile.friendly = true;
        this.Projectile.penetrate = -1;
        this.Projectile.melee = true;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = 10;
    }
    
    DefaultToWhip() {
        this.Projectile.width = 18;
        this.Projectile.height = 18;
        this.Projectile.aiStyle = 165;
        this.Projectile.friendly = true;
        this.Projectile.penetrate = -1;
        this.Projectile.tileCollide = false;
        this.Projectile.scale = 1.0;
        this.Projectile.ownerHitCheck = true;
        this.Projectile.extraUpdates = 1;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = -1;
        this.Projectile.drawLayer = 7;
    }
    
    OnSpawn(proj) {
        
    }
    
    PreAI(proj) {
        return true;
    }
    
    AI(proj) {
        
    }
    
    PreKill(proj, timeLeft) {
        return true;
    }
    
    OnKill(proj, timeLeft) {
        
    }
    
    Colliding(proj, myRect, targetRect) {
        return null;
    }
    
    OnTileCollide(proj, hitDirection) {
        return true;
    }
    
    CanCutTiles(proj) {
        return null;
    }
    
    CutTiles(proj) {
        
    }
    
    OnHitNPC(proj, npc) {
        
    }
    
    OnHitPlayer(proj, player) {
        
    }
    
    ApplyShader(proj) {
        return null;
    }
    
    GetShaderIdFromItemId(itemId) {
        return Terraria.Graphics.Shaders.GameShaders.Armor.GetShaderIdFromItemId(itemId);
    }
    
    GetAlpha(proj, color) {
        return color;
    }
    
    PreDraw(proj, lightColor) {
        return true;
    }
    
    PostDraw(proj, lightColor) {
        
    }
    
    CanDamage(proj) {
        return true;
    }

    // Vanilla blocks contact damage from projectiles marked in Main.projPet
    // unless their numeric type is one of its hard-coded minion IDs. Modded
    // contact minions opt in through this hook.
    MinionContactDamage(proj) {
        return false;
    }
    
    ModifyDamageHitbox(proj, hitbox) {
        
    }
    
    static register(proj) {
        ProjectileLoader.register(new proj());
    }
    static isModType(type) { return ProjectileLoader.isModType(type); }
    static isModProjectile(proj) { return ProjectileLoader.isModProjectile(proj); }
    static getByName(name) { return ProjectileLoader.getByName(name); }
    static getTypeByName(name) { return ProjectileLoader.getTypeByName(name); }
    static getModProjectile(type) { return ProjectileLoader.getModProjectile(type); }
}