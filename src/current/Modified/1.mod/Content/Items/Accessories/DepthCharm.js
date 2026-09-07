import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class DepthCharm extends ModItem {
 constructor(){super();this.Texture='Items/Accessories/DepthCharm';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=26;i.height=26;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.accessory=true;this.MenuCategories.push('accessory');}
 UpdateAccessory(item,player){ /* Abyss pressure/breath integration is handled by the biome runtime when present. */ }
}
