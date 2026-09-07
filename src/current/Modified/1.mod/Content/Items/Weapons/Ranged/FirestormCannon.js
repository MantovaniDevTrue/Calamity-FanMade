import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { FirestormHoldoutActive, RegisterFirestormAim } from './../../../Projectiles/Ranged/FirestormCannonHoldout.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function Aim(player,v){try{const m=Terraria.Main.MouseWorld,c=player.MountedCenter,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),d=Math.sqrt(dx*dx+dy*dy);if(d>8)return Vector2.new(dx/d,dy/d);}catch(_){}const x=N(v&&v.X),y=N(v&&v.Y),d=Math.sqrt(x*x+y*y);return d>.001?Vector2.new(x/d,y/d):Vector2.new(N(Terraria.PlayerDirection(player),1),0);}function Source(player,item){try{return player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(_){return null;}}
export class FirestormCannon extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/FirestormCannon';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=56;i.height=28;i.damage=15;i.ranged=true;i.useTime=11;i.useAnimation=11;i.knockBack=1.5;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.channel=true;i.noUseGraphic=true;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.shoot=ModProjectile.getTypeByName('FirestormCannonHoldout');i.shootSpeed=5.5;i.useAmmo=Terraria.ID.AmmoID.Flare;this.MenuCategories.push('ranged');}
 CanUseItem(item,player){return !FirestormHoldoutActive(Terraria.PlayerIndex(player));}
 ModifyShootStats(item,player,stats){const a=Aim(player,stats.velocity);stats.velocity=a;try{stats.position=player.MountedCenter;}catch(_){} }
 Shoot(item,player,position,velocity,type,damage,knockBack){const t=Number(ModProjectile.getTypeByName('FirestormCannonHoldout')||0);if(!(t>0))return false;const o=Terraria.PlayerIndex(player),a=Aim(player,velocity);RegisterFirestormAim(o,a);const dmg=Math.max(1,Math.floor(N(damage,N(item.damage,15))||N(item.damage,15)));NewProjectile(Source(player,item),player.MountedCenter,a,t,dmg,N(knockBack,1.5),o,0,0,0,null);return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.FlareGun,1).AddIngredient(Terraria.ID.ItemID.HellstoneBar,10).AddIngredient(Terraria.ID.ItemID.IllegalGunParts,1).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
