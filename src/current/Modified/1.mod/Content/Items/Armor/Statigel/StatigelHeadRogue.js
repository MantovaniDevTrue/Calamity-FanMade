import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { AddRogueDamage, AddRogueCrit, ApplyStatigelSet } from './../../../../Core/StatigelRuntime.js';

export class StatigelHeadRogue extends ModItem {
    constructor(){ super(); this.Texture='Items/Armor/Statigel/StatigelHeadRogue'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=18; i.height=18; i.maxStack=1; i.value=Terraria.Item.buyPrice(0,10,0,0); i.rare=Terraria.ID.ItemRarityID.LightRed; i.defense=6; }
    AddArmorSets(){ this.CreateArmorSet(this.Type,ModItem.getTypeByName('StatigelArmor'),ModItem.getTypeByName('StatigelGreaves'),''); }
    UpdateEquip(item,player){ AddRogueDamage(player,0.10); AddRogueCrit(player,7); player.moveSpeed=Number(player.moveSpeed||0)+0.05; }
    UpdateArmorSet(item,player){ player.setBonus=ModLocalization.getTranslationArmorSetBonus('StatigelRogue'); ApplyStatigelSet(player,'rogue'); }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),5).AddIngredient(ModItem.getTypeByName('BlightedGel'),5).AddTile(220).Register();
    }
}
