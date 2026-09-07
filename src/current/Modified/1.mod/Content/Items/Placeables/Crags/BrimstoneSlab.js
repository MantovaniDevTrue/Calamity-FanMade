import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModSystem } from './../../../../TL/ModSystem.js';
export class BrimstoneSlab extends ModItem{
 constructor(){super();this.Texture='Items/Placeables/Crags/BrimstoneSlab';this.ResearchUnlockCount=100;}
 SetDefaults(){this.Item.width=16;this.Item.height=16;this.DefaultToPlaceableTile(1,0);this.Item.rare=0;this.MenuCategories.push('placeable');}
 CanUseItem(item,player){const s=ModSystem.getByName('RoxShrineVisualSystem');if(s&&s.MarkSlabPlacement)s.MarkSlabPlacement(player);return true;}
}
