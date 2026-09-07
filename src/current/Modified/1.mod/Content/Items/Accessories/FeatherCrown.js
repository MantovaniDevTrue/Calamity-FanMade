import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class FeatherCrown extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/FeatherCrown'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item;i.width=44;i.height=38;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=ModPlayer.getByName('AerialiteAccessoryPlayer'); if(s)s.EnableCrown(player,hideVisual!==true); }
    AddRecipes(){
        const bar=ModItem.getTypeByName('AerialiteBar'), feather=Number(Terraria.ID.ItemID.Feather||320), anvil=Terraria.ID.TileID.Anvils;
        for(const crown of [Number(Terraria.ID.ItemID.GoldCrown||264),Number(Terraria.ID.ItemID.PlatinumCrown||895)]){
            if(crown>0)this.CreateRecipe().AddIngredient(crown,1).AddIngredient(bar,6).AddIngredient(feather,8).AddTile(anvil).Register();
        }
    }
}
