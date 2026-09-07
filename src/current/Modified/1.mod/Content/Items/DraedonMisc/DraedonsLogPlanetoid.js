import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ShowPlanetoidLog } from './../../../Core/DraedonDocumentRuntime.js';
export class DraedonsLogPlanetoid extends ModItem{
 constructor(){super();this.Texture='Items/DraedonMisc/DraedonsLogPlanetoid';}
 SetDefaults(){const i=this.Item;i.width=28;i.height=28;i.rare=Terraria.ID.ItemRarityID.Orange;i.useAnimation=20;i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.HoldUp;}
 UseItem(item,player){return ShowPlanetoidLog(player);}
}
