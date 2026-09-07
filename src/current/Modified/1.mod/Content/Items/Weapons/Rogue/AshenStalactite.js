import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';
const { Vector2 }=Modules;function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
export class AshenStalactite extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/AshenStalactite';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=36;i.height=36;i.damage=37;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=20;i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=1;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.shoot=ModProjectile.getTypeByName('AshenStalactiteProj');i.shootSpeed=15;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),base=Number(damage)>0?Number(damage):Number(item.damage)||37;let t=Number(ModProjectile.getTypeByName(stealth?'AshenStalagmiteProj':'AshenStalactiteProj')||0),v=velocity,dmg=base,kn=N(kb,1);if(stealth){v=Vector2.Multiply(v,.6);dmg*=StealthDamageMultiplier(player,'AshenStalactite');kn*=2.5;}SpawnMarkedProjectile(player,item,position,v,t,dmg,kn,'AshenStalactite',stealth,false,0,stealth?1:0,0);return false;}
}