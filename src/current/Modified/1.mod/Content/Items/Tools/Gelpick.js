import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class Gelpick extends ModItem {
    constructor(){super();this.Texture='Items/Tools/Gelpick';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=46;i.height=48;i.damage=19;i.knockBack=2.5;i.useTime=9;i.useAnimation=12;i.pick=105;i.tileBoost=1;i.melee=true;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.value=Terraria.Item.buyPrice(0,10,0,0);i.rare=Terraria.ID.ItemRarityID.LightRed;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.useTurn=true;this.MenuCategories.push('tools');}
    OnHitNPC(item,player,npc){try{npc.AddBuff(Number(Terraria.ID.BuffID.Slimed||137),180,false);}catch(e){}}

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),12).AddIngredient(ModItem.getTypeByName('BlightedGel'),12).AddTile(220).Register();
    }
}
