import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
export class HadalStew extends ModItem{
 constructor(){super();this.Texture='Items/Potions/Food/HadalStew';this.ResearchUnlockCount=30;}
 SetDefaults(){const i=this.Item;i.width=28;i.height=18;i.healLife=100;i.useTime=17;i.useAnimation=17;i.useStyle=2;i.UseSound=Terraria.ID.SoundID.Item2;i.maxStack=9999;i.consumable=true;i.potion=true;i.value=Terraria.Item.sellPrice(0,0,40,0);i.rare=2;}
 OnConsumeItem(item,player){try{player['void AddBuff(int type, int time, bool fromNetPvP)'](207,28800,true);}catch(e){}try{player.potionDelay=Math.min(Number(player.potionDelay)||3600,3000);}catch(e){}}
}
