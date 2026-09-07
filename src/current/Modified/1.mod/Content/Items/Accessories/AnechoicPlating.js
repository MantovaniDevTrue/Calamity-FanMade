import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class AnechoicPlating extends ModItem {
 constructor(){super();this.Texture='Items/Accessories/AnechoicPlating';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=28;i.height=24;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.accessory=true;this.MenuCategories.push('accessory');}
}
