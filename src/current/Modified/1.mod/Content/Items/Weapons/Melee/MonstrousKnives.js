import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
export class MonstrousKnives extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/MonstrousKnives';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=18;i.height=20;i.damage=8;i.melee=true;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=21;i.useTime=21;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=3;i.UseSound=Terraria.ID.SoundID.Item39;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.shoot=ModProjectile.getTypeByName('MonstrousKnife');i.shootSpeed=15;this.MenuCategories.push('melee');}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('MonstrousKnife')||type||0);if(!(t>0))return false;const x=N(velocity.X),y=N(velocity.Y),len=Math.sqrt(x*x+y*y)||1,spd=15,bx=x/len*spd,by=y/len*spd,count=3+(Math.random()<.5?0:1),owner=Terraria.PlayerIndex(player),dmg=Math.max(1,Math.floor(N(damage)>0?N(damage):N(item.damage,8))),source=src(player,item);for(let k=0;k<count;k++){const spread=.05*k,rx=(Math.random()*50-25)*spread,ry=(Math.random()*50-25)*spread,vx=bx+rx,vy=by+ry,l=Math.sqrt(vx*vx+vy*vy)||1;NewProjectile(source,position,Vector2.new(vx/l*spd,vy/l*spd),t,dmg,N(kb,3),owner,0,0,0,null);}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.ThrowingKnife,50).AddIngredient(Terraria.ID.ItemID.LifeCrystal,1).AddIngredient(Terraria.ID.ItemID.LesserHealingPotion,5).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
