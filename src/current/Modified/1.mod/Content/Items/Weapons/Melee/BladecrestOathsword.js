import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}function aim(pl,v){try{const c=pl.MountedCenter,m=Terraria.Main.MouseWorld,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),l=Math.sqrt(dx*dx+dy*dy);if(l>1)return Vector2.new(dx/l,dy/l);}catch(_){}const x=N(v?.X,1),y=N(v?.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l,y/l);}
export class BladecrestOathsword extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/BladecrestOathsword';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=i.height=56;i.damage=42;i.melee=true;i.knockBack=3;i.useAnimation=i.useTime=53;i.shoot=ModProjectile.getTypeByName('BladecrestOathswordThrownBlade');i.shootSpeed=6;i.noMelee=true;i.noUseGraphic=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,4,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;this.MenuCategories.push('melee');}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('BladecrestOathswordThrownBlade')||0);if(!(t>0))return false;const a=aim(player,velocity);NewProjectile(src(player,item),player.MountedCenter,a,t,Math.max(1,Math.floor(N(damage,N(item.damage,35)))),N(kb,3),Terraria.PlayerIndex(player),0,0,0,null);return false;}
}
