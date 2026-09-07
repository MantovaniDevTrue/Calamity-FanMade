import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';
export class LeadTomahawk extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/LeadTomahawk';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=40;i.height=36;i.damage=9;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=20;i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=1;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=false;i.value=Terraria.Item.buyPrice(0,0,20,0);i.rare=Terraria.ID.ItemRarityID.White;i.shoot=ModProjectile.getTypeByName('LeadTomahawkProj');i.shootSpeed=12;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),base=Number(damage)>0?Number(damage):Number(item.damage)||9,mult=stealth?StealthDamageMultiplier(player,'LeadTomahawk'):1,t=Number(ModProjectile.getTypeByName('LeadTomahawkProj')||type||0);const p=SpawnMarkedProjectile(player,item,position,velocity,t,base*mult,kb,'LeadTomahawk',stealth,false,0,0,0);if(p&&stealth){p.penetrate=7;p.netUpdate=true;}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.LeadBar,7).AddTile(Terraria.ID.TileID.Anvils).Register();}
}