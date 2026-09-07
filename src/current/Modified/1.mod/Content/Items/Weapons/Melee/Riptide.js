import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
function setArray(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}try{a.set_Item(Number(index),value);return true;}catch(_){}a[Number(index)]=value;return true;}catch(_){return false;}}
export class Riptide extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/Riptide';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){setArray(Terraria.ID.ItemID.Sets,'Yoyo',this.Type,true);setArray(Terraria.ID.ItemID.Sets,'GamepadExtraRange',this.Type,15);setArray(Terraria.ID.ItemID.Sets,'GamepadSmartQuickReach',this.Type,true);}
 SetDefaults(){const i=this.Item;i.width=46;i.height=48;i.damage=12;i.melee=true;i.knockBack=1;i.useTime=25;i.useAnimation=25;i.autoReuse=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.Item1;i.channel=true;i.noUseGraphic=true;i.noMelee=true;i.shoot=ModProjectile.getTypeByName('RiptideYoyo');i.shootSpeed=18;i.rare=Terraria.ID.ItemRarityID.Green;i.value=Terraria.Item.buyPrice(0,2,0,0);this.MenuCategories.push('melee');}
 AddRecipes(){const pearl=Number(ModItem.getTypeByName('PearlShard')||0),prism=Number(ModItem.getTypeByName('SeaPrism')||0),navi=Number(ModItem.getTypeByName('Navystone')||0);if(pearl>0&&prism>0&&navi>0)this.CreateRecipe().AddIngredient(pearl,3).AddIngredient(prism,7).AddIngredient(navi,10).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
