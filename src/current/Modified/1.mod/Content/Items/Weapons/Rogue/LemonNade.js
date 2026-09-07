import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, MarkRogueProjectile, MarkStealthStrike } from './../../../../Core/RogueRuntime.js';
import { LemonNadeHoldoutActive } from './../../../Projectiles/Rogue/PreHardmodeRogueBatch10Projectiles.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}function spawned(id){try{return Terraria.Main.projectile.get_Item(Number(id));}catch(_){return null;}}function aim(pl,v){try{const c=pl.MountedCenter,m=Terraria.Main.MouseWorld,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),l=Math.sqrt(dx*dx+dy*dy);if(l>1)return Vector2.new(dx/l,dy/l);}catch(_){}const x=N(v?.X,1),y=N(v?.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l,y/l);}
export class LemonNade extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/LemonNade';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=26;i.height=30;i.damage=33;i.autoReuse=true;i.noMelee=true;i.noUseGraphic=true;i.useTime=i.useAnimation=30;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=3;i.rare=Terraria.ID.ItemRarityID.Green;i.value=Terraria.Item.buyPrice(0,2,0,0);i.UseSound=Terraria.ID.SoundID.Item1;i.channel=true;i.shootSpeed=13;i.shoot=ModProjectile.getTypeByName('LemonNadeHoldout');this.MenuCategories.push('rogue');}
 CanUseItem(item,player){return !LemonNadeHoldoutActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('LemonNadeHoldout')||0);if(!(t>0))return false;const stealth=ConsumeStealthStrike(player,item),a=aim(player,velocity),id=NewProjectile(src(player,item),player.MountedCenter,a,t,Math.max(1,Math.floor(N(damage,N(item.damage,33)))),N(kb,3),Terraria.PlayerIndex(player),0,0,0,null),p=spawned(id);if(p){MarkRogueProjectile(p,'LemonNade',false);if(stealth)MarkStealthStrike(p,'LemonNade',false);}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Lemon,1).AddIngredient(Terraria.ID.ItemID.BouncyGrenade,99).AddTile(Terraria.ID.TileID.TinkerersWorkbench).Register();}
}
