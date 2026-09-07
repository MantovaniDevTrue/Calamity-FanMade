import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
export class TorrentialTear extends ModItem {
    constructor(){super();this.Texture='Items/Tools/ClimateChange/TorrentialTear';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=20;i.height=20;i.useAnimation=20;i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.HoldUp;i.UseSound=Terraria.ID.SoundID.Item66;i.rare=Terraria.ID.ItemRarityID.Pink;i.value=Terraria.Item.buyPrice(0,1,0,0);i.consumable=false;this.MenuCategories.push('tool');}
    CanUseItem(){try{return Terraria.Main.slimeRain!==true;}catch(_){return true;}}
    UseItem(){
        try{
            if(Terraria.Main.raining===true){
                Terraria.Main.maxRaining=0; Terraria.Main.rainTime=0; Terraria.Main.raining=false;
            }else{
                Terraria.Main.raining=true; Terraria.Main.rainTime=Math.max(Number(Terraria.Main.rainTime)||0,36000);
                Terraria.Main.maxRaining=0.89; Terraria.Main.windSpeedCurrent=0.6; Terraria.Main.windSpeedTarget=0.6;
                try{Terraria.Main.cloudBGActive=1;}catch(_){} try{Terraria.Main.numCloudsTemp=Terraria.Main.maxClouds;Terraria.Main.numClouds=Terraria.Main.numCloudsTemp;}catch(_){}
            }
            return true;
        }catch(e){try{tl.log(`[CalamityPort TorrentialTear] weather toggle failed: ${e}`);}catch(_){} return false;}
    }
}
