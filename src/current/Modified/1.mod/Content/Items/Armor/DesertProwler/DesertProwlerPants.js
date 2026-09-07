import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';

export class DesertProwlerPants extends ModItem {
    constructor(){ super(); this.Texture='Items/Armor/DesertProwler/DesertProwlerPants'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=18; i.height=18; i.maxStack=1; i.value=Terraria.Item.buyPrice(0,0,50,0); i.rare=Terraria.ID.ItemRarityID.Blue; i.defense=3; }
    UpdateEquip(item,player){ const s=ModPlayer.getByName('CalamityPlayerState'); if(s&&s.IsLocalPlayer(player)) s.RogueCritBonus+=4; try{ if(player.buffImmune&&typeof player.buffImmune.set_Item==='function') player.buffImmune.set_Item(194,true); }catch(e){} }
    AddRecipes(){ this.CreateRecipe().AddIngredient(ModItem.getTypeByName('StormlionMandible'),1).AddIngredient(225,5).AddTile(86).Register(); }
}
