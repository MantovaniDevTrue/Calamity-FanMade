import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { ApplyStatigelSet } from './../../../../Core/StatigelRuntime.js';

export class StatigelHeadMagic extends ModItem {
    constructor(){ super(); this.Texture='Items/Armor/Statigel/StatigelHeadMagic'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=18; i.height=18; i.maxStack=1; i.value=Terraria.Item.buyPrice(0,10,0,0); i.rare=Terraria.ID.ItemRarityID.LightRed; i.defense=5; }
    AddArmorSets(){ this.CreateArmorSet(this.Type,ModItem.getTypeByName('StatigelArmor'),ModItem.getTypeByName('StatigelGreaves'),''); }
    UpdateEquip(item,player){ player.magicDamage=Number(player.magicDamage||1)+0.10; player.magicCrit=Number(player.magicCrit||0)+7; player.manaCost=Number(player.manaCost||1)-0.10; player.statManaMax2=Number(player.statManaMax2||0)+40; }
    UpdateArmorSet(item,player){ player.setBonus=ModLocalization.getTranslationArmorSetBonus('StatigelMagic'); ApplyStatigelSet(player,'magic'); }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),5).AddIngredient(ModItem.getTypeByName('BlightedGel'),5).AddTile(220).Register();
    }
}
