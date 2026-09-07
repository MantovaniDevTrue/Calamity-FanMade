import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { BasherHoldoutActive, RegisterBasherAim } from './../../../Projectiles/Melee/PreHardmodeMeleeBatch6Projectiles.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;} function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
function aim(p,v){try{const m=Terraria.Main.MouseWorld,c=p.MountedCenter,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),l=Math.sqrt(dx*dx+dy*dy);if(l>1)return Vector2.new(dx/l,dy/l);}catch(_){}const x=N(v&&v.X,1),y=N(v&&v.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l,y/l);}
export class Basher extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/Basher';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=56;i.height=60;i.damage=65;i.melee=true;i.useAnimation=30;i.useTime=30;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.knockBack=7;i.autoReuse=true;i.channel=true;i.noUseGraphic=true;i.noMelee=true;i.value=Terraria.Item.buyPrice(0,1,50,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.shoot=ModProjectile.getTypeByName('BasherHoldout');i.shootSpeed=1;this.MenuCategories.push('melee');}
 CanUseItem(item,player){return !BasherHoldoutActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('BasherHoldout')||0);if(!(t>0))return false;const a=aim(player,velocity),o=Terraria.PlayerIndex(player);RegisterBasherAim(o,a);NewProjectile(src(player,item),player.MountedCenter,a,t,Math.max(1,Math.floor(N(damage)>0?N(damage):N(item.damage,65))),N(kb,7),o,0,0,0,null);return false;}
 AddRecipes(){const acid=Number(ModItem.getTypeByName('Acidwood')||0),scale=Number(ModItem.getTypeByName('SulphuricScale')||0);if(acid>0&&scale>0)this.CreateRecipe().AddIngredient(acid,15).AddIngredient(scale,12).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
