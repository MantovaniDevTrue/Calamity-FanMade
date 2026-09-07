import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';
const { Vector2 }=Modules;
export class Cinquedea extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/Cinquedea';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=32;i.height=32;i.damage=35;i.crit=8;i.rare=Terraria.ID.ItemRarityID.Orange;i.knockBack=5;i.autoReuse=true;i.useTime=20;i.useAnimation=20;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.UseSound=Terraria.ID.SoundID.Item1;i.noMelee=true;i.noUseGraphic=true;i.shoot=ModProjectile.getTypeByName('CinquedeaProj');i.shootSpeed=10;i.value=Terraria.Item.buyPrice(0,10,0,0);this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),base=Number(damage)>0?Number(damage):Number(item.damage)||35,t=Number(ModProjectile.getTypeByName('CinquedeaProj')||type||0),v=stealth?Vector2.Multiply(velocity,1.25):velocity,dmg=base*(stealth?StealthDamageMultiplier(player,'Cinquedea'):1);SpawnMarkedProjectile(player,item,position,v,t,dmg,kb,'Cinquedea',stealth,false,0,0,0);return false;}
}