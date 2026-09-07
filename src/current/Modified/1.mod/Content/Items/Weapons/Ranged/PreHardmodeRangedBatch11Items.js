import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';
import { SlagfireDouserHoldoutActive, GetRicoshotCoinById, FindNearestRicoshotCoinId } from './../../../Projectiles/Ranged/PreHardmodeRangedBatch11Projectiles.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;} function source(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
function inventory(p){try{return Array.from(p.inventory||[]);}catch(_){return [];}}
function countType(p,type){let n=0;for(const i of inventory(p))if(i&&N(i.type)===N(type))n+=Math.max(0,N(i.stack));return n;}
function consumeOne(p,type){for(const i of inventory(p)){if(i&&N(i.type)===N(type)&&N(i.stack)>0){i.stack=N(i.stack)-1;if(N(i.stack)<=0)try{i.TurnToAir(true);}catch(_){}return true;}}return false;}
const CrackshotMobileState=new Map();
function crackState(ownerId){const key=Math.floor(N(ownerId,-1));let s=CrackshotMobileState.get(key);if(!s){s={mode:0,lastCoinId:-1};CrackshotMobileState.set(key,s);}return s;}
function validCoinId(ownerId,id){try{return !!GetRicoshotCoinById(ownerId,id);}catch(_){return false;}}
function refreshCrackState(ownerId){const s=crackState(ownerId);if(s.mode===1&&!validCoinId(ownerId,s.lastCoinId)){const fallback=FindNearestRicoshotCoinId(ownerId,null);if(fallback>=0)s.lastCoinId=fallback;else{s.mode=0;s.lastCoinId=-1;}}return s;}
function setCrackshotPose(player){
    // Port direto da pose do Crackshot Colt de PC. O sprite tem 40x20 e o pivô
    // real da empunhadura fica em (-15, +1) relativo ao centro da textura.
    const mounted=player.MountedCenter||SafePlayerCenter(player);
    let px=N(mounted.X),py=N(mounted.Y),mx=px+1,my=py;
    try{const c=player.Center,m=Terraria.Main.MouseWorld;px=N(c.X,px);py=N(c.Y,py);mx=N(m.X,px+1);my=N(m.Y,py);}catch(_){}
    const dx=mx-px,dy=my-py,dir=dx>=0?1:-1,grav=N(player.gravDir,1)<0?-1:1;
    try{Terraria.SetPlayerDirection(player,dir);}catch(_){}
    let maxTime=35,currentTime=35;try{maxTime=Math.max(1,N(player.itemTimeMax,35));currentTime=Math.max(0,N(player.itemTime,maxTime));}catch(_){}
    const progress=1-currentTime/maxTime;
    // PC: (player.Center - mouseWorld).ToRotation() * gravDir + Pi/2.
    let arm=Math.atan2(-dy,-dx)*grav+Math.PI/2;
    if(progress<.4){const t=(.4-progress)/.4;arm+=-.45*t*t*dir;}
    try{player.SetCompositeArmFront(true,Terraria.Player.CompositeArmStretchAmount.Full,arm);}catch(_){}
    // PC: itemRotation = compositeFrontArm.rotation + Pi/2 * gravDir.
    const itemRotation=arm+Math.PI/2*grav;
    const itemPosition=Vector2.new(N(mounted.X)+Math.cos(itemRotation)*7,N(mounted.Y)+Math.sin(itemRotation)*7);
    CleanHoldStyleTLPro(player,itemRotation,itemPosition,Vector2.new(40,20),Vector2.new(-15,1));
}


let AnyGoldBar=null;
export class CrackshotColt extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/CrackshotColt';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=23;i.height=8;i.damage=18;i.ranged=true;i.useTime=i.useAnimation=35;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=2.25;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.UseSound=Terraria.ID.SoundID.Item11;i.autoReuse=true;i.shoot=ModProjectile.getTypeByName('MarksmanShot');i.useAmmo=Terraria.ID.AmmoID.Bullet;i.shootSpeed=14;this.MenuCategories.push('ranged');}
 CanUseItem(){return true;}
 CanConsumeAmmo(item,ammo,player){const o=Terraria.PlayerIndex(player),s=refreshCrackState(o);return s.mode===1||countType(player,Terraria.ID.ItemID.CopperCoin)<=0;}
 UseSpeedMultiplier(item,player){const o=Terraria.PlayerIndex(player),s=refreshCrackState(o);return s.mode===0&&countType(player,Terraria.ID.ItemID.CopperCoin)>0?3:1;}
 UseStyle(item,player){setCrackshotPose(player);}
 ModifyShootStats(item,player,s){s.position=Vector2.new(N(s.position.X),N(s.position.Y)-12);s.type=ModProjectile.getTypeByName('MarksmanShot');}
 Shoot(item,player,position,velocity,type,damage,kb){
  const o=Terraria.PlayerIndex(player),coinType=Number(ModProjectile.getTypeByName('RicoshotCoin')||0),shotType=Number(ModProjectile.getTypeByName('MarksmanShot')||0),st=refreshCrackState(o);
  if(st.mode===0&&coinType>0&&countType(player,Terraria.ID.ItemID.CopperCoin)>0&&consumeOne(player,Terraria.ID.ItemID.CopperCoin)){
   const c=player.MountedCenter,m=Terraria.Main.MouseWorld,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),len=Math.sqrt(dx*dx+dy*dy)||1,force=7.33;
   const pv=player.velocity||Vector2.Zero,toss=Vector2.new(N(pv.X)+force*dx/len,N(pv.Y)-force+force*dy/len),dir=N(dx)>=0?1:-1,spawn=Vector2.new(N(position.X)+dir*4,N(position.Y)-4);
   const coinId=NewProjectile(source(player,item),spawn,toss,coinType,0,0,o,0,0,0,null);
   st.mode=1;st.lastCoinId=Math.floor(N(coinId,-1));
   return false;
  }
  if(shotType>0){
   let coinId=st.lastCoinId;if(!validCoinId(o,coinId))coinId=FindNearestRicoshotCoinId(o,position);
   let aim=velocity;
   if(coinId>=0){try{const coin=GetRicoshotCoinById(o,coinId);if(coin){const q=coin.Center;aim=Vector2.new(N(q.X)-N(position.X),N(q.Y)-N(position.Y));}}catch(_){} }
   const x=N(aim.X,1),y=N(aim.Y),len=Math.sqrt(x*x+y*y)||1,v=Vector2.new(x/len*28,y/len*28);
   // ai0 carries the exact coin slot (+1 so zero means no target). The Marksman shot
   // no longer has to scan projectile arrays every update.
   NewProjectile(source(player,item),position,v,shotType,Math.max(1,Math.floor(N(damage,N(item.damage,18)))),N(kb,2.25),o,coinId>=0?coinId+1:0,0,0,null);
  }
  st.mode=0;st.lastCoinId=-1;
  return false;
 }
 AddRecipeGroups(){if(AnyGoldBar)return;const a=[Terraria.ID.ItemID.GoldBar,Terraria.ID.ItemID.PlatinumBar].map(Number).filter(v=>v>0);if(a.length)AnyGoldBar=ModRecipe.CreateRecipeGroup('Any Gold Bar',a);}
 AddRecipes(){const m=Number(ModItem.getTypeByName('StormlionMandible')||0),b=Number(ModItem.getTypeByName('BloodOrb')||0);if(!(m>0&&b>0))return;const r=this.CreateRecipe();if(AnyGoldBar)r.AddRecipeGroup(AnyGoldBar,8);else r.AddIngredient(Terraria.ID.ItemID.GoldBar,8);r.AddIngredient(m,1).AddIngredient(b,1).AddIngredient(Terraria.ID.ItemID.CopperCoin,4).AddTile(Terraria.ID.TileID.Anvils).Register();}
}

export class SlagfireDouser extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/SlagfireDouser';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=104;i.height=34;i.damage=5;i.ranged=true;i.useTime=i.useAnimation=30;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=2;i.UseSound=Terraria.ID.SoundID.Item61;i.value=Terraria.Item.buyPrice(0,4,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.autoReuse=false;i.shoot=ModProjectile.getTypeByName('SlagfireDouserHoldout');i.shootSpeed=13;i.channel=true;i.noUseGraphic=true;i.armorPenetration=10;this.MenuCategories.push('ranged');}
 CanUseItem(item,player){return !SlagfireDouserHoldoutActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('SlagfireDouserHoldout')||0);if(!(t>0))return false;NewProjectile(source(player,item),player.MountedCenter,velocity,t,Math.max(1,Math.floor(N(damage,N(item.damage,5)))),N(kb,2),Terraria.PlayerIndex(player),0,0,0,null);return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.HellstoneBar,10).AddIngredient(Terraria.ID.ItemID.Obsidian,20).AddIngredient(Terraria.ID.ItemID.Fireblossom,3).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class DriftwoodBow extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/DriftwoodBow';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=22;i.height=42;i.damage=10;i.ranged=true;i.useTime=i.useAnimation=28;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=0;i.value=Terraria.Item.buyPrice(0,0,20,0);i.rare=Terraria.ID.ItemRarityID.White;i.UseSound=Terraria.ID.SoundID.Item5;i.autoReuse=true;i.shoot=Terraria.ID.ProjectileID.WoodenArrowFriendly;i.shootSpeed=6.6;i.useAmmo=Terraria.ID.AmmoID.Arrow;this.MenuCategories.push('ranged');}
 IsWet(p){return !!(p&&(p.wet===true||p.lavaWet===true||p.honeyWet===true));}
 UseSpeedMultiplier(item,player){return this.IsWet(player)?1.2:1;}
 ModifyShootStats(item,player,s){if(this.IsWet(player)){s.velocity=Vector2.Multiply(s.velocity,1.3);s.knockBack=N(s.knockBack)+1;}}
 AddRecipes(){const d=Number(ModItem.getTypeByName('Driftwood')||0);if(d>0)this.CreateRecipe().AddIngredient(d,10).AddTile(Terraria.ID.TileID.WorkBenches).Register();}
}
