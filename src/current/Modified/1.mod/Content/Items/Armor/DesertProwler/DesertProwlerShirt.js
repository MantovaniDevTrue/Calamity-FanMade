import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';

export class DesertProwlerShirt extends ModItem {
    constructor(){ super(); this.Texture='Items/Armor/DesertProwler/DesertProwlerShirt'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=18; i.height=18; i.maxStack=1; i.value=Terraria.Item.buyPrice(0,0,50,0); i.rare=Terraria.ID.ItemRarityID.Blue; i.defense=4; }
    UpdateEquip(item,player){ const s=ModPlayer.getByName('CalamityPlayerState'); if(s&&s.IsLocalPlayer(player)) s.RogueDamageBonus+=0.05; }
    AddRecipes(){ this.CreateRecipe().AddIngredient(ModItem.getTypeByName('StormlionMandible'),3).AddIngredient(225,10).AddTile(86).Register(); }
}
