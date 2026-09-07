import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, MarkRogueProjectile, MarkStealthStrike, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';
import { SlickCaneActive } from './../../../Projectiles/Rogue/PreHardmodeRogueBatch11Projectiles.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;} function source(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}} function spawned(id){try{return Terraria.Main.projectile.get_Item(Number(id));}catch(_){return null;}}
function spawn(player,item,pos,vel,type,damage,kb,name,stealth,ai0=0,ai1=0){const id=NewProjectile(source(player,item),pos,vel,type,Math.max(1,Math.floor(N(damage))),N(kb),Terraria.PlayerIndex(player),ai0,ai1,0,null),p=spawned(id);if(p){MarkRogueProjectile(p,name,false);if(stealth)MarkStealthStrike(p,name,false);}return p;}
export class Kylie extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/Kylie';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=34;i.height=50;i.damage=12;i.crit=16;i.knockBack=9;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.useTime=i.useAnimation=25;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.UseSound=Terraria.ID.SoundID.Item1;i.shootSpeed=14;i.shoot=ModProjectile.getTypeByName('KylieBoomerang');i.noMelee=true;i.noUseGraphic=true;this.MenuCategories.push('rogue');}
 Shoot(item,player,pos,vel,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),t=Number(ModProjectile.getTypeByName('KylieBoomerang')||0);if(t>0){const p=spawn(player,item,pos,vel,t,damage,kb,'Kylie',stealth);if(p&&stealth)p.penetrate=7;}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.PortableStool,1).AddTile(Terraria.ID.TileID.WorkBenches).Register();}
}
export class Glaive extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/Glaive';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=34;i.height=32;i.damage=19;i.crit=6;i.autoReuse=true;i.noMelee=true;i.noUseGraphic=true;i.useTime=i.useAnimation=22;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=3;i.value=Terraria.Item.buyPrice(0,10,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.UseSound=Terraria.ID.SoundID.Item1;i.shootSpeed=13;i.shoot=ModProjectile.getTypeByName('GlaiveProj');this.MenuCategories.push('rogue');}
 Shoot(item,player,pos,vel,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),t=Number(ModProjectile.getTypeByName('GlaiveProj')||0);if(!(t>0))return false;const v=stealth?Vector2.Multiply(vel,1.3):vel,dmg=N(damage,N(item.damage,19))*(stealth?StealthDamageMultiplier(player,'Glaive'):1);spawn(player,item,pos,v,t,dmg,kb,'Glaive',stealth,0,-1);if(stealth){const o=Number(ModProjectile.getTypeByName('GlaiveOrbital')||0);if(o>0){let existing=null;for(let k=0;k<1000;k++){let p=null;try{p=Terraria.Main.projectile.get_Item(k);}catch(_){}if(p&&p.active!==false&&N(p.type)===o&&N(p.owner)===Terraria.PlayerIndex(player)){existing=p;break;}}if(existing)existing.timeLeft=N(existing.timeLeft)+300;else spawn(player,item,pos,Vector2.Zero,o,damage,10,'Glaive',true,0,-1);}}return false;}
}
export class SlickCane extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/SlickCane';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=42;i.height=36;i.damage=50;i.noMelee=true;i.noUseGraphic=true;i.channel=true;i.useTime=i.useAnimation=16;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.knockBack=6;i.UseSound=Terraria.ID.SoundID.DD2_GhastlyGlaivePierce;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,35,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.shoot=ModProjectile.getTypeByName('SlickCaneProjectile');i.shootSpeed=16;this.MenuCategories.push('rogue');}
 CanUseItem(item,player){return !SlickCaneActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,pos,vel,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),t=Number(ModProjectile.getTypeByName('SlickCaneProjectile')||0);if(t>0){const ai0=Math.random()*N(item.shootSpeed,16)*1.5*N(player.direction,1);spawn(player,item,Vector2.new(N(pos.X),N(pos.Y)+100),Vector2.Multiply(vel,2),t,damage,kb,'SlickCane',stealth,ai0,0);}return false;}
}
