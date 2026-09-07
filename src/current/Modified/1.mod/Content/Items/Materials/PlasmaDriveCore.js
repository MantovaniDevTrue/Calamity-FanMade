import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class PlasmaDriveCore extends ModItem{
 constructor(){super();this.Texture='Items/Materials/PlasmaDriveCore';}
 SetDefaults(){const i=this.Item;i.width=30;i.height=30;i.maxStack=ModItem.CommonMaxStack;i.value=0;i.rare=Terraria.ID.ItemRarityID.Orange;i.material=true;}
}
