import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const {Vector2}=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function rotate(v,a,s=1){const c=Math.cos(a),n=Math.sin(a),x=Number(v.X)||0,y=Number(v.Y)||0;return Vector2.new((x*c-y*n)*s,(x*n+y*c)*s);}
function norm(v){const x=Number(v.X)||0,y=Number(v.Y)||0,l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l,y/l);}
export class Goobow extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/Ranged/Goobow';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=32;i.height=96;i.damage=33;i.ranged=true;i.useTime=31;i.useAnimation=31;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=3;i.value=Terraria.Item.buyPrice(0,10,0,0);i.rare=Terraria.ID.ItemRarityID.LightRed;i.UseSound=Terraria.ID.SoundID.Item5;i.autoReuse=true;i.shoot=1;i.shootSpeed=12;i.useAmmo=Terraria.ID.AmmoID.Arrow;this.MenuCategories.push('ranged');}
    Shoot(item,player,position,velocity,type,damage,knockBack){const stream=Number(ModProjectile.getTypeByName('SlimeStream')||0);if(!(stream>0))return true;let source=null;try{source=player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(e){}const center=Terraria.PlayerCenter(player);const base=rotate(norm(velocity),0,20);for(let k=0;k<2;k++){const off=k-0.5;const shifted=rotate(base,Math.PI/10*off,1);const spawn=Vector2.new(Number(center.X)+Number(shifted.X),Number(center.Y)+Number(shifted.Y));const sv=Vector2.new(Number(base.X)*0.6,Number(base.Y)*0.6);NewProjectile(source,spawn,sv,stream,Math.max(1,Math.floor(Number(damage)*0.25)),0,Terraria.PlayerIndex(player),k,0,0,null);}return true;}

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),18).AddIngredient(ModItem.getTypeByName('BlightedGel'),18).AddTile(220).Register();
    }
}
