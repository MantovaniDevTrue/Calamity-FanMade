import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class DraedonsLogSnowBiome extends ModItem{
 constructor(){super();this.Texture='Items/DraedonMisc/DraedonsLogSnowBiome';}
 SetDefaults(){const i=this.Item;i.width=28;i.height=28;i.rare=Terraria.ID.ItemRarityID.Orange;i.useAnimation=20;i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.HoldUp;}
}
