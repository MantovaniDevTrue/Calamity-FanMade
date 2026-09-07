import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class HarpyRing extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/HarpyRing'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=20;i.height=22;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=ModPlayer.getByName('AerialiteAccessoryPlayer'); if(s)s.EnableHarpy(player); }
    AddRecipes(){ this.CreateRecipe().AddIngredient(ModItem.getTypeByName('AerialiteBar'),5).AddIngredient(Number(Terraria.ID.ItemID.Feather||320),5).AddTile(Terraria.ID.TileID.Anvils).Register(); }
}
