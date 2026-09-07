import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { UrchinMaceActive } from './../../../Projectiles/Melee/PreHardmodeMeleeBatch5Projectiles.js';
function setStatic(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Number(index));return;}catch(_){}try{a.set_Item(Number(index),value);return;}catch(_){}a[Number(index)]=value;}catch(_){}}
export class UrchinMace extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/UrchinMace';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){setStatic(Terraria.ID.ItemID.Sets,'ToolTipDamageMultiplier',this.Type,2);}
 SetDefaults(){const i=this.Item;i.width=42;i.height=48;i.damage=15;i.channel=true;i.noUseGraphic=true;i.noMelee=true;i.useTurn=true;i.melee=true;i.useAnimation=19;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useTime=19;i.knockBack=4;i.UseSound=Terraria.ID.SoundID.Item1;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.shoot=ModProjectile.getTypeByName('UrchinMaceProj');i.shootSpeed=9;this.MenuCategories.push('melee');}
 CanUseItem(item,player){return !UrchinMaceActive(Terraria.PlayerIndex(player));}
 AddRecipes(){const sea=Number(ModItem.getTypeByName('SeaRemains')||0);if(sea>0)this.CreateRecipe().AddIngredient(sea,3).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
