import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';
import { CountOwned } from './../../../../Core/PerforatorRewardRuntime.js';
const { Vector2 }=Modules;let AnyIce=null;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
export class FrostBlossomStaff extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Summon/FrostBlossomStaff';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=34;i.height=24;i.damage=10;i.summon=true;i.mana=10;i.useAnimation=36;i.useTime=36;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.noMelee=true;i.knockBack=2;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.UseSound=Terraria.ID.SoundID.Item28;i.buffType=ModBuff.getTypeByName('FrostBlossomBuff');i.shoot=ModProjectile.getTypeByName('FrostBlossom');this.MenuCategories.push('summon');}
 CanUseItem(item,player){const t=Number(ModProjectile.getTypeByName('FrostBlossom')||0);return !(t>0&&CountOwned(player,t)>0);}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('FrostBlossom')||0),b=Number(ModBuff.getTypeByName('FrostBlossomBuff')||0);if(!(t>0))return false;if(b>0)try{player.AddBuff(b,2,false);}catch(_){}const dmg=Math.max(1,Math.floor(N(damage)>0?N(damage):N(item.damage,10)));const id=NewProjectile(src(player,item),Terraria.PlayerCenter(player),Vector2.Zero,t,dmg,N(kb,2),Terraria.PlayerIndex(player),0,0,0,null);if(id>=0&&id<1000){try{const q=Terraria.Main.projectile.get_Item(Number(id));if(q){q.damage=dmg;q.originalDamage=dmg;}}catch(_){}}return false;}
 AddRecipeGroups(){if(AnyIce)return;const id=Terraria.ID.ItemID,a=[id.IceBlock,id.PurpleIceBlock,id.RedIceBlock,id.PinkIceBlock].map(Number).filter(v=>v>0);if(a.length)AnyIce=ModRecipe.CreateRecipeGroup('Any Ice Block',a);}
 AddRecipes(){const r=this.CreateRecipe();if(AnyIce)r.AddRecipeGroup(AnyIce,50);else r.AddIngredient(Terraria.ID.ItemID.IceBlock,50);r.AddIngredient(Terraria.ID.ItemID.BorealWood,10).AddIngredient(Terraria.ID.ItemID.Shiverthorn,5).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
