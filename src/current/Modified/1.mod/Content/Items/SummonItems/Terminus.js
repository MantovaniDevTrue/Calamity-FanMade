import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
let LastNotice=0;
export class Terminus extends ModItem{
 constructor(){super();this.Texture='Items/SummonItems/Terminus';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=Terraria.Main.zenithWorld===true?54:70;i.height=Terraria.Main.zenithWorld===true?78:80;i.rare=1;i.useAnimation=45;i.useTime=45;i.channel=true;i.noUseGraphic=true;i.useStyle=Terraria.ID.ItemUseStyleID.HoldUp;i.consumable=false;i.maxStack=1;}
 CanUseItem(item,player){const now=Date.now();if(now-LastNotice>1500){LastNotice=now;try{Terraria.Main['void NewText(string newText, byte R, byte G, byte B)']('The Terminus was recovered. Boss Rush activation will be ported in its dedicated phase.',150,110,255);}catch(e){}}return false;}
}
