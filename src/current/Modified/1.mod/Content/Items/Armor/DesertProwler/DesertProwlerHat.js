import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';

export class DesertProwlerHat extends ModItem {
    constructor(){ super(); this.Texture='Items/Armor/DesertProwler/DesertProwlerHat'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=18; i.height=18; i.maxStack=1; i.value=Terraria.Item.buyPrice(0,0,50,0); i.rare=Terraria.ID.ItemRarityID.Blue; i.defense=2; }
    AddArmorSets(){ this.CreateArmorSet(this.Type, ModItem.getTypeByName('DesertProwlerShirt'), ModItem.getTypeByName('DesertProwlerPants'), 'ArmorSetBonus.Empty'); }
    UpdateEquip(item,player){ const s=ModPlayer.getByName('CalamityPlayerState'); if(s&&s.IsLocalPlayer(player)) s.RogueCritBonus+=4; }
    UpdateArmorSet(item,player){ player.setBonus=ModLocalization.getTranslationArmorSetBonus('DesertProwler'); const p=ModPlayer.getByName('DesertProwlerPlayer'); if(p&&typeof p.ActivateSet==='function') p.ActivateSet(player); }
    AddRecipes(){ this.CreateRecipe().AddIngredient(ModItem.getTypeByName('StormlionMandible'),2).AddIngredient(225,8).AddTile(86).Register(); }
}
