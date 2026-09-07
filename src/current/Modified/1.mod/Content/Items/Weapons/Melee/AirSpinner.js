import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
function setArray(holder,name,index,value){try{let a=holder[name];const need=Number(index)+1;if(Number(a.length)<need){a=a.cloneResized(need);holder[name]=a;}a[Number(index)]=value;}catch(e){}}
export class AirSpinner extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/Melee/AirSpinner';this.ResearchUnlockCount=1;}
    SetStaticDefaults(){setArray(Terraria.ID.ItemID.Sets,'Yoyo',this.Type,true);setArray(Terraria.ID.ItemID.Sets,'GamepadExtraRange',this.Type,15);setArray(Terraria.ID.ItemID.Sets,'GamepadSmartQuickReach',this.Type,true);}
    SetDefaults(){const i=this.Item;i.width=28;i.height=28;i.damage=29;i.melee=true;i.knockBack=4;i.useTime=22;i.useAnimation=22;i.autoReuse=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.Item1;i.channel=true;i.noUseGraphic=true;i.noMelee=true;i.shoot=ModProjectile.getTypeByName('AirSpinnerYoyo');i.shootSpeed=14;i.rare=Terraria.ID.ItemRarityID.Orange;i.value=Terraria.Item.buyPrice(0,5,0,0);this.MenuCategories.push('melee');}
    AddRecipes(){this.CreateRecipe().AddIngredient(ModItem.getTypeByName('AerialiteBar'),7).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
