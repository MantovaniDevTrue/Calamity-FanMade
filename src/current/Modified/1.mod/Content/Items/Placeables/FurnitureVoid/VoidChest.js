import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
export class VoidChest extends ModItem{
 constructor(){super();this.Texture='Items/Placeables/FurnitureVoid/VoidChest';this.ResearchUnlockCount=1;}
 SetDefaults(){this.CloneDefaults(Terraria.ID.ItemID.Chest);this.Item.width=32;this.Item.height=28;this.Item.value=Terraria.Item.sellPrice(0,0,1,0);this.Item.maxStack=9999;}
}
