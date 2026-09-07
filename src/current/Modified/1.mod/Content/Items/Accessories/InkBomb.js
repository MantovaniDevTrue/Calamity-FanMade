import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
export class InkBomb extends ModItem{
 constructor(){super();this.Texture='Items/Accessories/InkBomb';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=22;i.height=50;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.accessory=true;this.MenuCategories.push('accessory');}
 UpdateAccessory(item,player,hideVisual){const c=ModPlayer.getByName('InkBombPlayer');if(c)c.Enable(player);}
}
