import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { WorldDB } from './../../../TL/WorldDB.js';
import { WhiteLabSeekerActive } from './../../Projectiles/Typeless/WhiteLabSeeker.js';
const KEY='calamity:structure:iceLab:';
export class WhiteSeekingMechanism extends ModItem{
 constructor(){super();this.Texture='Items/LabFinders/WhiteSeekingMechanism';}
 SetDefaults(){const i=this.Item;i.width=24;i.height=26;i.noUseGraphic=true;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useAnimation=36;i.useTime=36;i.shoot=ModProjectile.getTypeByName('WhiteLabSeeker');i.shootSpeed=0;i.value=Terraria.Item.sellPrice(0,0,50,0);i.rare=Terraria.ID.ItemRarityID.Orange;}
 CanUseItem(item,player){if(!WorldDB.Instance||WorldDB.get(KEY+'generated')!==true)return false;let owner=-1;try{owner=Terraria.PlayerIndex(player);}catch(e){try{owner=Number(player?.whoAmI)||-1;}catch(_){}}return !WhiteLabSeekerActive(owner);}
 AddRecipes(){const base=Number(ModItem.getTypeByName('LabSeekingMechanism')||0);if(base<=0)return;for(const ice of [664,833,834,835])this.CreateRecipe().AddIngredient(base,1).AddIngredient(ice,50).AddTile(16).Register();}
}
