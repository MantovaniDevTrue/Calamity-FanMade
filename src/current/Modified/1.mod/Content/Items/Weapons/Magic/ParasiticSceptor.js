import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
function norm(v,s=1){const x=N(v?.X),y=N(v?.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*s,y/l*s);}
function rot(v,a){const x=N(v.X),y=N(v.Y),c=Math.cos(a),s=Math.sin(a);return Vector2.new(x*c-y*s,x*s+y*c);}
export class ParasiticSceptor extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/ParasiticSceptor';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){try{Terraria.Item.staff[this.Type]=true;}catch(_){}}
 SetDefaults(){const i=this.Item;i.width=i.height=52;i.damage=12;i.magic=true;i.knockBack=3;i.mana=12;i.useAnimation=i.useTime=35;i.autoReuse=true;i.noMelee=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.Item46;i.rare=Terraria.ID.ItemRarityID.Green;i.value=Terraria.Item.buyPrice(0,1,0,0);i.shootSpeed=10;i.shoot=ModProjectile.getTypeByName('WaterLeechProj');this.MenuCategories.push('magic');}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('WaterLeechProj')||type||0);if(!(t>0))return false;let aim=velocity;try{const c=player.MountedCenter,m=Terraria.Main.MouseWorld;aim=norm(Vector2.new(N(m.X)-N(c.X),N(m.Y)-N(c.Y)),10);position=c;}catch(_){aim=norm(velocity,10);}let count=2;if(Math.random()<1/3)count++;if(Math.random()<1/4)count++;if(Math.random()<1/5)count++;for(let n=0;n<count;n++){const spread=(Math.random()-.5)*(.04+.035*n),v=rot(aim,spread);NewProjectile(src(player,item),position,v,t,Math.max(1,Math.floor(N(damage,N(item.damage,12)))),N(kb,3),Terraria.PlayerIndex(player),0,0,0,null);}return false;}
 AddRecipes(){const a=Number(ModItem.getTypeByName('Acidwood')||0),s=Number(ModItem.getTypeByName('SulphuricScale')||0);if(a>0&&s>0)this.CreateRecipe().AddIngredient(a,15).AddIngredient(s,12).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
