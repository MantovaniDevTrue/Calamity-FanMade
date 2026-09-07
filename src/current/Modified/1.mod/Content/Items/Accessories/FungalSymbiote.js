import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { WorldDB } from './../../../TL/WorldDB.js';
export class FungalSymbiote extends ModItem {
    constructor(){super();this.Texture='Items/Accessories/FungalSymbiote';this.ResearchUnlockCount=1;}
    SetDefaults(){const item=this.Item;item.width=38;item.height=36;item.maxStack=1;item.value=Terraria.Item.buyPrice(0,15,0,0);item.rare=3;item.accessory=true;this.MenuCategories.push('accessory');}
    MarkFound(){try{if(Terraria.Main.netMode!==1&&WorldDB.Instance&&WorldDB.get('calamity:unlock:fungalSymbiote')!==true)WorldDB.set('calamity:unlock:fungalSymbiote',true);}catch(e){}}
    UpdateInventory(item,player){this.MarkFound();}
    UpdateAccessory(item,player,hideVisual){this.MarkFound();const controller=ModPlayer.getByName('FungalSymbiotePlayer');if(controller)controller.Enable(player);}
}
