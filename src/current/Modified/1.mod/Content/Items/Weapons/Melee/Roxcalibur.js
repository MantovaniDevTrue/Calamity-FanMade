import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { SignalRoxcalibur } from './../../../../Core/RoxcaliburSignalRuntime.js';
const { Vector2 }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function Owner(p){return Math.max(0,Math.floor(Number(Terraria.PlayerIndex(p))||0));}function Aim(player){let c=Terraria.PlayerCenter(player),x=Number(c.X)+(Number(Terraria.PlayerDirection(player))||1)*100,y=Number(c.Y);try{const m=Terraria.Main.MouseWorld;if(m){x=Number(m.X);y=Number(m.Y);}}catch(e){}return {x,y};}
function Count(player,type){try{return Math.max(0,Math.floor(Number(player.ownedProjectileCounts.get_Item(type))||0));}catch(e){return 0;}}
export class Roxcalibur extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/Roxcalibur';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=100;i.height=100;i.damage=180;i.crit=8;i.knockBack=13;i.melee=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.NPCHit42;i.useAnimation=40;i.useTime=40;i.reuseDelay=10;i.shoot=ModProjectile.getTypeByName('RoxcaliburProj');i.shootSpeed=4;i.value=Terraria.Item.buyPrice(0,10,0,0);i.rare=Terraria.ID.ItemRarityID.LightRed;i.noUseGraphic=true;i.noMelee=true;i.autoReuse=false;i.channel=true;this.MenuCategories.push('melee');}
 CanUseItem(item,player){return Terraria.Main.hardMode===true&&Count(player,Number(item.shoot))<1;}
 HoldItem(item,player){const a=Aim(player);SignalRoxcalibur(Owner(player),player,a.x,a.y,Number(player.itemTimeMax)||40);}
 Shoot(item,player,position,velocity,type,damage,knockBack){const o=Owner(player),a=Aim(player);SignalRoxcalibur(o,player,a.x,a.y,Number(player.itemTimeMax)||40);const source=player.GetProjectileSource_Item(item);NewProjectile(source,position,velocity,type,damage,knockBack,o,0,0,Math.max(1,Math.floor(Number(player.itemTimeMax)||40)),null);return false;}
}
