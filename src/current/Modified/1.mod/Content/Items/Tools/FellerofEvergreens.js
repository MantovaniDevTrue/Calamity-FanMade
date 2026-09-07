import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class FellerofEvergreens extends ModItem {
    constructor(){ super(); this.Texture='Items/Tools/FellerofEvergreens'; this.ResearchUnlockCount=1; }
    SetDefaults(){
        const i=this.Item;
        i.width=66;i.height=66;i.damage=18;i.knockBack=5;i.useTime=17;i.useAnimation=25;i.axe=20;i.melee=true;
        i.useTurn=true;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;
        i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;
        this.MenuCategories.push('melee');
    }
    AddRecipes(){
        // The official recipe uses the AnySilverBar group. TLPro's lightweight
        // recipe bridge has no recipe-group registration here, so register the
        // two equivalent vanilla alternatives explicitly.
        let silver=21,tungsten=703;
        try{silver=Number(Terraria.ID.ItemID.SilverBar)||21;}catch(e){}
        try{tungsten=Number(Terraria.ID.ItemID.TungstenBar)||703;}catch(e){}
        this.CreateRecipe().AddIngredient(silver,18).AddIngredient(620,18).AddTile(16).Register();
        if(tungsten!==silver)this.CreateRecipe().AddIngredient(tungsten,18).AddIngredient(620,18).AddTile(16).Register();
    }
}
