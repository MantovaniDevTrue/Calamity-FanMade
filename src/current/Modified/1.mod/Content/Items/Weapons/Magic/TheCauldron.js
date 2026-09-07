import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { CauldronHoldoutActive } from './../../../Projectiles/Magic/PreHardmodeMagicBatch11Projectiles.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;} function source(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
export class TheCauldron extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/TheCauldron';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=i.height=46;i.damage=56;i.magic=true;i.noMelee=true;i.noUseGraphic=true;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useTime=i.useAnimation=60;i.knockBack=8;i.mana=30;i.UseSound=Terraria.ID.SoundID.DD2_MonkStaffSwing;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,4,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.shoot=ModProjectile.getTypeByName('CauldronHoldout');i.shootSpeed=12;i.channel=true;this.MenuCategories.push('magic');}
 ModifyManaCost(item,player,mana){return (player?.lavaWet===true||player?.ZoneUnderworldHeight===true)?Math.max(1,Math.floor(N(mana,30)*.2)):mana;}
 CanUseItem(item,player){return !CauldronHoldoutActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('CauldronHoldout')||0);if(!(t>0))return false;NewProjectile(source(player,item),position,velocity,t,Math.max(1,Math.floor(N(damage,N(item.damage,56)))),N(kb,8),Terraria.PlayerIndex(player),46,0,0,null);return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.LavaBucket,1).AddIngredient(Terraria.ID.ItemID.HellstoneBar,8).AddIngredient(Terraria.ID.ItemID.Obsidian,20).AddIngredient(Terraria.ID.ItemID.AshBlock,20).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
