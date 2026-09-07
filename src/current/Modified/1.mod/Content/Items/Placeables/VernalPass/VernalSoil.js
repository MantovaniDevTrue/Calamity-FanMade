import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { VernalSoilRuntime, VernalSoilAnchorTile } from './../../../../Core/VernalSoilRuntime.js';

export class VernalSoil extends ModItem {
    constructor(){ super(); this.Texture='Items/Placeables/VernalPass/VernalSoil'; this.ResearchUnlockCount=10; }
    SetDefaults(){
        this.DefaultToPlaceableTile(VernalSoilAnchorTile,0);
        const i=this.Item; i.width=16;i.height=16;i.maxStack=9999;i.value=0;i.rare=Terraria.ID.ItemRarityID.White;i.material=true;
        this.MenuCategories.push('material');
    }
    CanUseItem(item,player){ VernalSoilRuntime.MarkPending(player); return true; }
    AddRecipes(){ this.CreateRecipe(25).AddIngredient(176,25).AddIngredient(331,1).AddTile(16).Register(); }
}
