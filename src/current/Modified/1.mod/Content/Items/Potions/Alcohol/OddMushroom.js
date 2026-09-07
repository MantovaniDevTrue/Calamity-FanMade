import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
export class OddMushroom extends ModItem {
    constructor(){super();this.Texture='Items/Potions/Alcohol/OddMushroom';this.ResearchUnlockCount=20;}
    SetDefaults(){const buff=Number(ModBuff.getTypeByName('Trippy')||0);this.DefaultToFood(buff,216000,false,17);const item=this.Item;item.width=38;item.height=50;item.value=Terraria.Item.buyPrice(0,5,0,0);item.rare=4;}
}
