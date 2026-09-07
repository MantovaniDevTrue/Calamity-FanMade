import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';
export class GleamingDagger extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/GleamingDagger';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=32;i.height=26;i.damage=14;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=18;i.useTime=18;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=1;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.shoot=ModProjectile.getTypeByName('GleamingDaggerProj');i.shootSpeed=15;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),base=Number(damage)>0?Number(damage):Number(item.damage)||14,t=Number(ModProjectile.getTypeByName('GleamingDaggerProj')||type||0),dmg=base*(stealth?StealthDamageMultiplier(player,'GleamingDagger'):1);const p=SpawnMarkedProjectile(player,item,position,velocity,t,dmg,kb,'GleamingDagger',stealth,false,0,stealth?1:0,0);if(p&&stealth){p.penetrate=4;p.netUpdate=true;}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.PlatinumBar,12).AddTile(Terraria.ID.TileID.Anvils).Register();}
}