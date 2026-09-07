import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
const {Vector2}=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function inventory(player){try{return Array.from(player.inventory||[]);}catch(e){return [];}}
function pickAmmo(player,ammoId){const inv=inventory(player);for(let i=54;i<58&&i<inv.length;i++){const a=inv[i];if(a&&Number(a.ammo)===Number(ammoId)&&Number(a.stack)>0)return a;}for(let i=0;i<54&&i<inv.length;i++){const a=inv[i];if(a&&Number(a.ammo)===Number(ammoId)&&Number(a.stack)>0)return a;}return null;}
function shouldConsume(player){try{if(player.ammoBox&&Math.random()<0.20)return false;}catch(e){}try{if(player.ammoPotion&&Math.random()<0.20)return false;}catch(e){}try{if(player.chloroAmmoCost80&&Math.random()<0.20)return false;}catch(e){}try{if(player.ammoCost80&&Math.random()<0.20)return false;}catch(e){}try{if(player.ammoCost75&&Math.random()<0.25)return false;}catch(e){}return true;}
function consumeAmmo(player,ammo){if(!ammo||ammo.consumable!==true||!shouldConsume(player))return;try{ammo.stack=Number(ammo.stack)-1;if(Number(ammo.stack)<=0)ammo.TurnToAir(true);}catch(e){}}
function sourceFor(player,item){try{return player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(e){}try{return null;}catch(e){}return null;}
export class GunkShot extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/Ranged/GunkShot';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=76;i.height=28;i.damage=22;i.ranged=true;i.useTime=35;i.useAnimation=35;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=3.5;i.value=Terraria.Item.buyPrice(0,10,0,0);i.rare=Terraria.ID.ItemRarityID.LightRed;i.UseSound=Terraria.ID.SoundID.Item36;i.autoReuse=true;i.shoot=10;i.shootSpeed=5;i.useAmmo=Terraria.ID.AmmoID.Bullet;this.MenuCategories.push('ranged');}
    HoldoutOffset(){return {X:-5,Y:0};}
    Shoot(item,player,position,velocity,type,damage,knockBack){
        const ammo=pickAmmo(player,item.useAmmo);if(!ammo)return false;
        const vx=Number(velocity.X)||0,vy=Number(velocity.Y)||0,baseLen=Math.sqrt(vx*vx+vy*vy);
        let dx=baseLen>0.001?vx/baseLen:Number(Terraria.PlayerDirection(player))||1;
        let dy=baseLen>0.001?vy/baseLen:0;
        const speed=Math.max(0.1,Number(item.shootSpeed)||5)+Math.max(0,Number(ammo.shootSpeed)||0);
        const projectileType=Number(ammo.shoot)>0?Number(ammo.shoot):Number(type);
        let rangedMult=1;try{rangedMult=Math.max(0,Number(player.rangedDamage)||1);}catch(e){}
        const shotDamage=Math.max(1,Math.floor(Number(damage)+(Number(ammo.damage)||0)*rangedMult));
        const shotKnockback=Number(knockBack)+(Number(ammo.knockBack)||0);
        const source=sourceFor(player,item),count=3+Math.floor(Math.random()*2),owner=Terraria.PlayerIndex(player);
        for(let n=0;n<count;n++){
            const spreadX=(Math.floor(Math.random()*51)-25)*0.05,spreadY=(Math.floor(Math.random()*51)-25)*0.05;
            NewProjectile(source,position,Vector2.new(dx*speed+spreadX,dy*speed+spreadY),projectileType,shotDamage,shotKnockback,owner,0,0,0,null);
        }
        consumeAmmo(player,ammo);
        return false;
    }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),18).AddIngredient(ModItem.getTypeByName('BlightedGel'),18).AddTile(220).Register();
    }
}
