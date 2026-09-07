import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const {Vector2}=Modules; const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class BlackAnurian extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/BlackAnurian';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=58;i.height=38;i.damage=24;i.magic=true;i.mana=13;i.useAnimation=18;i.useTime=18;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=2.75;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.UseSound=Terraria.ID.SoundID.Item111;i.autoReuse=true;i.shootSpeed=8;i.shoot=ModProjectile.getTypeByName('BlackAnurianBubble');this.MenuCategories.push('magic');}
 Shoot(item,player,position,velocity,type,damage,knockBack){let src=null;try{src=player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(e){}const bubble=Number(ModProjectile.getTypeByName('BlackAnurianBubble')||type||0),plank=Number(ModProjectile.getTypeByName('BlackAnurianPlankton')||0);try{for(let n=0;n<2;n++){const a=(Math.random()-.5)*.22,c=Math.cos(a),s=Math.sin(a),vx=Number(velocity.X)*c-Number(velocity.Y)*s,vy=Number(velocity.X)*s+Number(velocity.Y)*c;NewProjectile(src,position,Vector2.new(vx,vy),plank,Math.floor(damage*.75),knockBack,Terraria.PlayerIndex(player),0,0,0,null);}NewProjectile(src,position,velocity,bubble,damage,knockBack,Terraria.PlayerIndex(player),0,0,0,null);}catch(e){}return false;}
}
