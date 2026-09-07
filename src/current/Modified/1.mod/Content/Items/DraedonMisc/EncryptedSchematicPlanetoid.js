import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { WorldDB } from './../../../TL/WorldDB.js';
import { ShowPlanetoidSchematic } from './../../../Core/DraedonDocumentRuntime.js';
const KEY='calamity:draedon:planetoidSchematicFound';
export class EncryptedSchematicPlanetoid extends ModItem{
 constructor(){super();this.Texture='Items/DraedonMisc/EncryptedSchematicPlanetoid';}
 SetDefaults(){const i=this.Item;i.width=42;i.height=42;i.rare=Terraria.ID.ItemRarityID.Orange;i.maxStack=1;i.useAnimation=20;i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.HoldUp;}
 UpdateInventory(item,player){if(WorldDB.Instance&&WorldDB.get(KEY)!==true){WorldDB.set(KEY,true);try{WorldDB.Instance.Save();}catch(e){}}}
 UseItem(item,player){return ShowPlanetoidSchematic(player);}
 AddRecipes(){
  this.CreateRecipe()
   .AddIngredient(ModItem.getTypeByName('MysteriousCircuitry'),10)
   .AddIngredient(ModItem.getTypeByName('DubiousPlating'),10)
   .AddIngredient(170,50)
   .AddCondition(()=>!!WorldDB.Instance && WorldDB.get(KEY)===true)
   .AddTile(Terraria.ID.TileID.Anvils)
   .Register();
 }
}
