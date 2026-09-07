import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
function setArray(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}try{a.set_Item(Number(index),value);return true;}catch(_){}return false;}catch(_){return false;}}
export class SmokingComet extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/SmokingComet';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){setArray(Terraria.ID.ItemID.Sets,'Yoyo',this.Type,true);setArray(Terraria.ID.ItemID.Sets,'GamepadExtraRange',this.Type,15);setArray(Terraria.ID.ItemID.Sets,'GamepadSmartQuickReach',this.Type,true);}
 SetDefaults(){const i=this.Item;i.width=36;i.height=40;i.damage=17;i.melee=true;i.knockBack=1.5;i.useTime=25;i.useAnimation=25;i.autoReuse=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.Item1;i.channel=true;i.noUseGraphic=true;i.noMelee=true;i.shoot=ModProjectile.getTypeByName('SmokingCometYoyo');i.shootSpeed=14;i.rare=Terraria.ID.ItemRarityID.Green;i.value=Terraria.Item.buyPrice(0,2,0,0);this.MenuCategories.push('melee');}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Diamond,5).AddIngredient(Terraria.ID.ItemID.Amethyst,5).AddIngredient(Terraria.ID.ItemID.PinkGel,10).AddIngredient(Terraria.ID.ItemID.FallenStar,15).AddIngredient(Terraria.ID.ItemID.MeteoriteBar,10).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
