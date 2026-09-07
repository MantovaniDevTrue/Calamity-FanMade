import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { WorldDB } from './../../../TL/WorldDB.js';
import { CyanLabSeekerActive } from './../../Projectiles/Typeless/CyanLabSeeker.js';
const KEY='calamity:structure:sunkenSeaLab:';
export class CyanSeekingMechanism extends ModItem{constructor(){super();this.Texture='Items/LabFinders/CyanSeekingMechanism';}SetDefaults(){const i=this.Item;i.width=24;i.height=26;i.noUseGraphic=true;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useAnimation=36;i.useTime=36;i.shoot=ModProjectile.getTypeByName('CyanLabSeeker');i.shootSpeed=0;i.value=Terraria.Item.sellPrice(0,0,50,0);i.rare=Terraria.ID.ItemRarityID.Orange;}CanUseItem(item,player){if(!WorldDB.Instance||WorldDB.get(KEY+'generated')!==true)return false;let owner=-1;try{owner=Terraria.PlayerIndex(player);}catch(e){try{owner=Number(player?.whoAmI)||-1;}catch(_){}}return !CyanLabSeekerActive(owner);}AddRecipes(){const base=Number(ModItem.getTypeByName('LabSeekingMechanism')||0);if(base<=0)return;this.CreateRecipe().AddIngredient(base,1).AddIngredient(206,1).AddTile(16).Register();}}
