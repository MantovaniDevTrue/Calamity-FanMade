import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, Rotate } from './../../../../Core/RogueRuntime.js';
const { Vector2 }=Modules;function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
export class BouncingEyeball extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/BouncingEyeball';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=26;i.height=26;i.damage=16;i.useTime=23;i.useAnimation=23;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=3.5;i.rare=Terraria.ID.ItemRarityID.Orange;i.value=Terraria.Item.buyPrice(0,5,0,0);i.melee=false;i.ranged=false;i.magic=false;i.summon=false;i.noMelee=true;i.noUseGraphic=true;i.UseSound=Terraria.ID.SoundID.Item1;i.shoot=ModProjectile.getTypeByName('BouncingEyeballProjectile');i.shootSpeed=10;i.autoReuse=true;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,knockBack){const stealth=ConsumeStealthStrike(player,item);let v=velocity,kb=N(knockBack,3.5),t=Number(ModProjectile.getTypeByName(stealth?'BouncingEyeballProjectileStealthStrike':'BouncingEyeballProjectile')||0);if(!(t>0))return false;try{if(Terraria.Main.bloodMoon===true)kb*=3;}catch(_){}if(stealth)v=Vector2.Multiply(v,2);else v=Rotate(v,(Math.random()-.5)*Math.PI/9,.85+Math.random()*.45);SpawnMarkedProjectile(player,item,position,v,t,Math.max(1,N(damage,N(item.damage,16))),kb,'BouncingEyeball',stealth,false,0,0,0);return false;}
}
