import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';
const {Vector2}=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let AnyIceBlockGroup=null;
function rot(v,a,m=1){const x=Number(v.X),y=Number(v.Y),c=Math.cos(a),s=Math.sin(a);return Vector2.new((x*c-y*s)*m,(x*s+y*c)*m);}
export class VeeringWind extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/VeeringWind';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=28;i.height=32;i.damage=16;i.magic=true;i.mana=14;i.useAnimation=36;i.useTime=36;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=10;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.UseSound=Terraria.ID.SoundID.Item66;i.autoReuse=true;i.shoot=ModProjectile.getTypeByName('VeeringWindAirWave');i.shootSpeed=6;this.MenuCategories.push('magic');}
 AltFunctionUse(){return true;}
 UseSpeedMultiplier(item,player){return Number(player.altFunctionUse)===2?0.5:1;}
 ModifyManaCost(item,player,mana){return Number(player.altFunctionUse)===2?Math.max(1,Math.floor(Number(mana)*2)):mana;}
 Shoot(item,player,position,velocity,type,damage,knockBack){const alt=Number(player.altFunctionUse)===2;const t=Number(ModProjectile.getTypeByName(alt?'VeeringWindFrostWave':'VeeringWindAirWave')||0);if(!(t>0))return false;const src=player.GetProjectileSource_Item(item),owner=Terraria.PlayerIndex(player),mult=alt?0.5:1,kb=alt?knockBack*0.2:knockBack;for(let k=0;k<12;k++)NewProjectile(src,position,rot(velocity,(Math.PI*2*k)/12,mult),t,damage,kb,owner,0,0,0,null);return false;}
 AddRecipeGroups(){if(AnyIceBlockGroup)return;const id=Terraria.ID.ItemID;const a=[id.IceBlock,id.PurpleIceBlock,id.RedIceBlock,id.PinkIceBlock].map(Number).filter(v=>v>0);if(a.length)AnyIceBlockGroup=ModRecipe.CreateRecipeGroup('Any Ice Block',a);}
 AddRecipes(){const r=this.CreateRecipe();if(AnyIceBlockGroup)r.AddRecipeGroup(AnyIceBlockGroup,30);else r.AddIngredient(Terraria.ID.ItemID.IceBlock,30);r.AddIngredient(Terraria.ID.ItemID.Feather,3).AddIngredient(Terraria.ID.ItemID.FallenStar,5).AddIngredient(Terraria.ID.ItemID.Cloud,10).AddTile(Terraria.ID.TileID.Bookcases).Register();}
}
