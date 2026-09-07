import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
export class SulphurousHelmet extends ModItem{
 constructor(){super();this.Texture='Items/Armor/Sulphurous/SulphurousHelmet';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=26;i.height=26;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,0,60,0);i.rare=Terraria.ID.ItemRarityID.Green;i.defense=5;}
 AddArmorSets(){this.CreateArmorSet(this.Type,ModItem.getTypeByName('SulphurousBreastplate'),ModItem.getTypeByName('SulphurousLeggings'),'\u200B');}
 UpdateEquip(item,player){const s=ModPlayer.getByName('CalamityPlayerState');if(s&&s.IsLocalPlayer(player))s.RogueCritBonus+=6;if(player?.wet===true)try{player.gills=true;}catch(e){}}
 UpdateArmorSet(item,player){player.setBonus=ModLocalization.getTranslationArmorSetBonus('Sulphurous');const p=ModPlayer.getByName('SulphurousArmorPlayer');if(p&&typeof p.ActivateSet==='function')p.ActivateSet(player);}
 AddRecipes(){const wood=Number(ModItem.getTypeByName('Acidwood')||0),scale=Number(ModItem.getTypeByName('SulphuricScale')||0);if(wood>0&&scale>0)this.CreateRecipe().AddIngredient(wood,10).AddIngredient(scale,10).AddTile(16).Register();}
}
