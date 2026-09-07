import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class IronBoots extends ModItem {
    constructor(){super();this.Texture='Items/Accessories/IronBoots';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=26;i.height=26;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.accessory=true;this.MenuCategories.push('accessory');}
    UpdateAccessory(item,player){
        try{player.noFallDmg=true;}catch(_){}
        try{
            if(player.controlDown&&!player.controlJump){
                player.maxFallSpeed=Number(player.maxFallSpeed)*2;
                const g=Number(player.gravDir)||1,vy=Number(player.velocity.Y)||0;
                if((g===1&&vy<=0)||(g<0&&vy>=0))player.velocity.Y=vy*0.7;
            }
        }catch(_){}
    }
}
