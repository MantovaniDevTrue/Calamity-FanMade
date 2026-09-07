import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { OpalHoldoutActive, RegisterOpalAim } from './../../../Projectiles/Ranged/PreHardmodeRangedBatch5Projectiles.js';
const { Vector2 }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}function aim(p,v){try{const m=Terraria.Main.MouseWorld,c=p.MountedCenter,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),d=Math.sqrt(dx*dx+dy*dy);if(d>1)return Vector2.new(dx/d,dy/d);}catch(_){}const x=N(v.X),y=N(v.Y),d=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/d,y/d);}
export class OpalStriker extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/OpalStriker';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=48;i.height=24;i.damage=30;i.ranged=true;i.useAnimation=17;i.useTime=17;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=4;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.UseSound=Terraria.ID.SoundID.Item11;i.noUseGraphic=true;i.channel=true;i.shoot=ModProjectile.getTypeByName('OpalStrikerHoldout');i.shootSpeed=12;this.MenuCategories.push('ranged');}
 CanUseItem(item,player){return !OpalHoldoutActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('OpalStrikerHoldout')||0);if(!(t>0))return false;const a=aim(player,velocity),o=Terraria.PlayerIndex(player);RegisterOpalAim(o,a);NewProjectile(src(player,item),player.MountedCenter,a,t,Math.max(1,Math.floor(N(damage)>0?N(damage):N(item.damage,30))),N(kb,4),o,0,0,0,null);return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Marble,25).AddIngredient(Terraria.ID.ItemID.MeteoriteBar,10).AddIngredient(Terraria.ID.ItemID.Diamond,3).AddIngredient(Terraria.ID.ItemID.Amber,3).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
