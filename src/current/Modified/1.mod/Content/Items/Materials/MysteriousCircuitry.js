import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class MysteriousCircuitry extends ModItem{
 constructor(){super();this.Texture='Items/Materials/MysteriousCircuitry';this.ResearchUnlockCount=25;}
 SetDefaults(){const i=this.Item;i.width=30;i.height=24;i.maxStack=ModItem.CommonMaxStack;i.value=Terraria.Item.sellPrice(0,0,3,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.material=true;}
}
