import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { CountOwned } from './../../../../Core/PerforatorRewardRuntime.js';
const { Vector2 }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function Source(pl,item){try{return pl['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(_){return null;}}
export class CinderBlossomStaff extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Summon/CinderBlossomStaff';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){try{Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type]=true;}catch(_){}try{Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type]=true;}catch(_){}try{Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type]=1;}catch(_){} }
 SetDefaults(){const i=this.Item;i.width=50;i.height=56;i.damage=16;i.summon=true;i.knockBack=2;i.mana=10;i.buffType=ModBuff.getTypeByName('CinderBlossomBuff');i.shoot=ModProjectile.getTypeByName('CinderBlossom');i.useAnimation=36;i.useTime=36;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.UseSound=Terraria.ID.SoundID.Item34;i.rare=Terraria.ID.ItemRarityID.Orange;i.value=Terraria.Item.buyPrice(0,5,0,0);i.noMelee=true;this.MenuCategories.push('summon');}
 CanUseItem(item,player){const t=Number(ModProjectile.getTypeByName('CinderBlossom')||0);return !(t>0&&CountOwned(player,t)>0);}
 Shoot(item,player,position,velocity,type,damage,knockBack){const t=Number(ModProjectile.getTypeByName('CinderBlossom')||0),b=Number(ModBuff.getTypeByName('CinderBlossomBuff')||0);if(!(t>0&&b>0))return false;try{player.AddBuff(b,2,false);}catch(_){}const dmg=Math.max(1,Math.floor(N(damage,0)>0?N(damage):N(item.damage,16))),id=NewProjectile(Source(player,item),Terraria.PlayerCenter(player),Vector2.Zero,t,dmg,N(knockBack,2),Terraria.PlayerIndex(player),0,0,0,null);try{const p=Terraria.Main.projectile[id];if(p){p.originalDamage=Math.max(1,Math.floor(N(item.damage,16)));p.damage=dmg;p.minionSlots=1;p.netUpdate=true;}}catch(_){}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.HellstoneBar,10).AddIngredient(Terraria.ID.ItemID.AshWood,10).AddIngredient(Terraria.ID.ItemID.Fireblossom,5).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
