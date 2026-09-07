import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';
const { Vector2 }=Modules;let AnyIce=null;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
export class IcicleStaff extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/IcicleStaff';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){try{Terraria.Item.staff[this.Type]=true;}catch(_){} }
 SetDefaults(){const i=this.Item;i.width=38;i.height=42;i.damage=10;i.magic=true;i.mana=6;i.useTime=7;i.useAnimation=14;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=2;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.UseSound=Terraria.ID.SoundID.Item8;i.autoReuse=true;i.shoot=ModProjectile.getTypeByName('IcicleStaffProj');i.shootSpeed=11;this.MenuCategories.push('magic');}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('IcicleStaffProj')||0);if(!(t>0))return false;const pc=Terraria.PlayerCenter(player);let mx=N(pc.X)+N(Terraria.PlayerDirection(player),1)*160,my=N(pc.Y);try{mx=N(Terraria.Main.MouseWorld.X,mx);my=N(Terraria.Main.MouseWorld.Y,my);}catch(_){}let sx=(mx+N(pc.X))*.5+(Math.random()*400-200),sy=N(player.MountedCenter.Y,pc.Y)-600;let dx=mx-sx,dy=my-sy;if(dy<0)dy=-dy;if(dy<20)dy=20;const l=Math.sqrt(dx*dx+dy*dy)||1,sp=11;dx=dx/l*sp;dy=dy/l*sp+(Math.random()*80-40)*.02;NewProjectile(src(player,item),Vector2.new(sx,sy),Vector2.new(dx,dy),t,Math.max(1,Math.floor(N(damage)>0?N(damage):N(item.damage,10))),N(kb,2),Terraria.PlayerIndex(player),0,Math.floor(Math.random()*10),0,null);return false;}
 AddRecipeGroups(){if(AnyIce)return;const id=Terraria.ID.ItemID,a=[id.IceBlock,id.PurpleIceBlock,id.RedIceBlock,id.PinkIceBlock].map(Number).filter(v=>v>0);if(a.length)AnyIce=ModRecipe.CreateRecipeGroup('Any Ice Block',a);}
 AddRecipes(){const r=this.CreateRecipe();if(AnyIce)r.AddRecipeGroup(AnyIce,25);else r.AddIngredient(Terraria.ID.ItemID.IceBlock,25);r.AddIngredient(Terraria.ID.ItemID.Shiverthorn,3).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
