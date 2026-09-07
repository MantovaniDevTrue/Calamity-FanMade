import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';
const { Vector2 }=Modules;function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
export class SeafoamBomb extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/SeafoamBomb';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=38;i.height=42;i.damage=12;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=25;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useTime=25;i.knockBack=8;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.shoot=ModProjectile.getTypeByName('SeafoamBombProj');i.shootSpeed=8;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),t=Number(ModProjectile.getTypeByName('SeafoamBombProj')||type||0),base=Math.max(1,Number(damage)||Number(item.damage)||12),v=stealth?Vector2.new(N(velocity.X)*4/3,N(velocity.Y)*4/3):velocity;SpawnMarkedProjectile(player,item,position,v,t,base,kb,'SeafoamBomb',stealth,false,0,0,0);return false;}
 AddRecipes(){const prism=Number(ModItem.getTypeByName('SeaPrism')||0),pearl=Number(ModItem.getTypeByName('PearlShard')||0);if(prism>0&&pearl>0)this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Bomb,25).AddIngredient(prism,10).AddIngredient(pearl,1).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
