import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { ApplyStatigelSet } from './../../../../Core/StatigelRuntime.js';

export class StatigelHeadMelee extends ModItem {
    constructor(){ super(); this.Texture='Items/Armor/Statigel/StatigelHeadMelee'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=18; i.height=18; i.maxStack=1; i.value=Terraria.Item.buyPrice(0,10,0,0); i.rare=Terraria.ID.ItemRarityID.LightRed; i.defense=9; }
    AddArmorSets(){ this.CreateArmorSet(this.Type,ModItem.getTypeByName('StatigelArmor'),ModItem.getTypeByName('StatigelGreaves'),''); }
    UpdateEquip(item,player){ player.meleeDamage=Number(player.meleeDamage||1)+0.10; player.meleeCrit=Number(player.meleeCrit||0)+7; player.meleeSpeed=Number(player.meleeSpeed||1)/1.10; }
    UpdateArmorSet(item,player){ player.setBonus=ModLocalization.getTranslationArmorSetBonus('StatigelMelee'); ApplyStatigelSet(player,'melee'); }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),5).AddIngredient(ModItem.getTypeByName('BlightedGel'),5).AddTile(220).Register();
    }
}
