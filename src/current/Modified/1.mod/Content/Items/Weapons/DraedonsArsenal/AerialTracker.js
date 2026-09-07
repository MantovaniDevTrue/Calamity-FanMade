import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { WorldDB } from './../../../../TL/WorldDB.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier, Rotate } from './../../../../Core/RogueRuntime.js';
export class AerialTracker extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/DraedonsArsenal/AerialTracker';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;this.RoguePrefix=true;i.width=52;i.height=40;i.damage=16;i.noMelee=true;i.noUseGraphic=true;i.useTime=40;i.useAnimation=40;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useTurn=false;i.knockBack=3;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.shoot=ModProjectile.getTypeByName('AerialTrackerProjectile');i.shootSpeed=8;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,knockBack){const pType=Number(ModProjectile.getTypeByName('AerialTrackerProjectile')||type||0);if(!(pType>0))return false;const stealth=ConsumeStealthStrike(player,item);if(stealth){const mult=StealthDamageMultiplier(player,'AerialTracker');for(const dir of [-1,1]){const v=Rotate(velocity,.6*dir,1.2);SpawnMarkedProjectile(player,item,position,v,pType,damage*.8*mult,knockBack,'AerialTracker',true,false,1,dir,0);}}else SpawnMarkedProjectile(player,item,position,velocity,pType,damage,knockBack,'AerialTracker',false,false,0,0,0);return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(ModItem.getTypeByName('MysteriousCircuitry'),5).AddIngredient(ModItem.getTypeByName('DubiousPlating'),7).AddIngredient(ModItem.getTypeByName('AerialiteBar'),4).AddIngredient(ModItem.getTypeByName('SeaPrism'),7).AddCondition(() => !!WorldDB.Instance && WorldDB.get('calamity:draedon:sunkenSeaSchematicFound') === true).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
