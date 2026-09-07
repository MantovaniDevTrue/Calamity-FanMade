import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { WorldDB } from './../../../TL/WorldDB.js';
import { GreenLabSeekerActive } from './../../Projectiles/Typeless/GreenLabSeeker.js';
const KEY='calamity:structure:jungleLab:';
export class GreenSeekingMechanism extends ModItem{
 constructor(){super();this.Texture='Items/LabFinders/GreenSeekingMechanism';}
 SetDefaults(){const i=this.Item;i.width=24;i.height=26;i.noUseGraphic=true;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useAnimation=36;i.useTime=36;i.shoot=ModProjectile.getTypeByName('GreenLabSeeker');i.shootSpeed=0;i.value=Terraria.Item.sellPrice(0,0,50,0);i.rare=Terraria.ID.ItemRarityID.Orange;}
 CanUseItem(item,player){if(!WorldDB.Instance||WorldDB.get(KEY+'generated')!==true)return false;let owner=-1;try{owner=Terraria.PlayerIndex(player);}catch(e){try{owner=Number(player?.whoAmI)||-1;}catch(_){}}return !GreenLabSeekerActive(owner);}

 AddRecipes(){
  this.CreateRecipe().AddIngredient(ModItem.getTypeByName('LabSeekingMechanism'),1).AddIngredient(210,3).AddTile(16).Register();
 }
}
