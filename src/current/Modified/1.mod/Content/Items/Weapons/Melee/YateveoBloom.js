import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { YateveoBloomActive } from './../../../Projectiles/Melee/PreHardmodeMeleeBatch10Projectiles.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
const YateveoMobileMode=new Map();
function useSpear(player){if(Number(player.altFunctionUse)===2)return true;return YateveoMobileMode.get(Number(Terraria.PlayerIndex(player)))===true;}
export class YateveoBloom extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/YateveoBloom';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=42;i.height=62;i.damage=30;i.melee=true;i.knockBack=5;i.useAnimation=i.useTime=22;i.noUseGraphic=true;i.noMelee=true;i.channel=true;i.autoReuse=true;i.useTurn=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.Item1;i.value=Terraria.Item.buyPrice(0,4,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.shoot=ModProjectile.getTypeByName('YateveoBloomMace');i.shootSpeed=12;this.MenuCategories.push('melee');}
 AltFunctionUse(){return true;}
 UseSpeedMultiplier(item,player){return useSpear(player)?.66:1;}
 CanUseItem(item,player){const alt=useSpear(player);if(alt){item.channel=false;item.autoReuse=true;}else{item.channel=true;item.autoReuse=false;}return !YateveoBloomActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,position,velocity,type,damage,kb){const owner=Number(Terraria.PlayerIndex(player)),alt=useSpear(player),t=Number(ModProjectile.getTypeByName(alt?'YateveoBloomSpear':'YateveoBloomMace')||0);if(!(t>0))return false;const mult=alt?(4.5/12):1,dmg=Math.max(1,Math.floor(N(damage,N(item.damage,30))*(alt?1:.5)));NewProjectile(src(player,item),position,Vector2.new(N(velocity.X)*mult,N(velocity.Y)*mult),t,dmg,N(kb,5),owner,0,0,0,null);if(Number(player.altFunctionUse)!==2)YateveoMobileMode.set(owner,!alt);return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.JungleRose,1).AddIngredient(Terraria.ID.ItemID.RichMahogany,15).AddIngredient(Terraria.ID.ItemID.JungleSpores,12).AddIngredient(Terraria.ID.ItemID.Stinger,4).AddIngredient(Terraria.ID.ItemID.Vine,2).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
