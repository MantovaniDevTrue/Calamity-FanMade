import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
function wet(p){return !!(p&&(p.wet===true||p.lavaWet===true||p.honeyWet===true));}
export class DriftwoodSword extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/DriftwoodSword';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=42;i.height=46;i.damage=14;i.melee=true;i.useAnimation=i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=4;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.useTurn=true;i.value=Terraria.Item.buyPrice(0,0,20,0);i.rare=Terraria.ID.ItemRarityID.White;this.MenuCategories.push('melee');}
 UseSpeedMultiplier(item,player){return wet(player)?1.66:1;}
 ModifyWeaponKnockback(item,player,kb){return Number(kb)+(wet(player)?1.5:0);}
 AddRecipes(){const d=Number(ModItem.getTypeByName('Driftwood')||0);if(d>0)this.CreateRecipe().AddIngredient(d,7).AddTile(Terraria.ID.TileID.WorkBenches).Register();}
}
