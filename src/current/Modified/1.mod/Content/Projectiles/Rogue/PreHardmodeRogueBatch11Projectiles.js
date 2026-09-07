import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile, IsStealthStrike } from './../../../Core/RogueRuntime.js';
const { Vector2 }=Modules;
const NewItem=Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function owner(p){const i=I(p.owner);try{return i===I(Terraria.Main.myPlayer,-2)?Terraria.Main.LocalPlayer:Terraria.Main.player.get_Item(i);}catch(_){return null;}}function npcAt(i){try{return Terraria.Main.npc.get_Item(I(i));}catch(_){return null;}}function valid(n){try{return !!n&&n.active!==false&&n.friendly!==true&&n.townNPC!==true&&n.dontTakeDamage!==true&&N(n.life)>0;}catch(_){return false;}}function center(e){try{return e.Center;}catch(_){return Vector2.Zero;}}function norm(v,s=1){const x=N(v?.X),y=N(v?.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*s,y/l*s);}function nearest(c,range,skip){let best=null,d2=range*range;for(let i=0;i<200;i++){const n=npcAt(i);if(!valid(n)||n===skip)continue;const q=center(n),dx=N(q.X)-N(c.X),dy=N(q.Y)-N(c.Y),v=dx*dx+dy*dy;if(v<d2){d2=v;best=n;}}return best;}
export class KylieBoomerang extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/Kylie';}
 SetDefaults(){const p=this.Projectile;p.friendly=true;p.hostile=false;p.width=p.height=40;p.penetrate=-1;p.timeLeft=240;p.tileCollide=false;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=30;}
 OnSpawn(p){MarkRogueProjectile(p,'Kylie',false);FusionEntityData.GetProjectileBag(p,'kylie',()=>({state:0,age:0,bounce:0}));}
 AI(p){const pl=owner(p),s=FusionEntityData.GetProjectileBag(p,'kylie',()=>({state:0,age:0,bounce:0}));if(!pl||pl.dead){p.Kill();return;}s.age++;p.rotation+=.2;if(IsStealthStrike(p)){p.tileCollide=true;let m=Terraria.Main.MouseWorld,c=center(p),a=norm(Vector2.new(N(m.X)-N(c.X),N(m.Y)-N(c.Y)),14/12);p.velocity=Vector2.new(N(p.velocity.X)+N(a.X),N(p.velocity.Y)+N(a.Y));const sp=Math.hypot(N(p.velocity.X),N(p.velocity.Y));if(sp>14)p.velocity=norm(p.velocity,14);return;}if(s.state===0){if(s.age>=3)p.tileCollide=true;if(s.age>=35)s.state=1;}else{p.tileCollide=false;const c=center(p),pc=center(pl),d=Math.hypot(N(pc.X)-N(c.X),N(pc.Y)-N(c.Y));if(d>3000||d<30){p.Kill();return;}const v=norm(Vector2.new(N(pc.X)-N(c.X),N(pc.Y)-N(c.Y)),21);p.velocity=Vector2.new(N(p.velocity.X)*.75+N(v.X)*.25,N(p.velocity.Y)*.75+N(v.Y)*.25);}}
 OnHitNPC(p){if(!IsStealthStrike(p))FusionEntityData.GetProjectileBag(p,'kylie',()=>({state:0})).state=1;}
 OnTileCollide(p,old){const s=FusionEntityData.GetProjectileBag(p,'kylie',()=>({state:1,bounce:0}));s.state=1;s.bounce=10;let x=N(p.velocity.X),y=N(p.velocity.Y);if(x!==N(old.X))x=-N(old.X);if(y!==N(old.Y))y=-N(old.Y);p.velocity=Vector2.new(x,y);return false;}
}
export class GlaiveProj extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/Glaive';}
 SetDefaults(){const p=this.Projectile;p.width=p.height=16;p.friendly=true;p.hostile=false;p.tileCollide=true;p.penetrate=4;p.extraUpdates=1;p.timeLeft=180;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'Glaive',false);if(IsStealthStrike(p)){p.penetrate=-1;p.extraUpdates=2;} }
 AI(p){p.rotation+=.175*N(p.direction,1);}
 Ricochet(p,skip){const n=nearest(center(p),1000,skip);if(n)p.velocity=norm(Vector2.new(N(center(n).X)-N(p.Center.X),N(center(n).Y)-N(p.Center.Y)),Math.max(8,Math.hypot(N(p.velocity.X),N(p.velocity.Y))));}
 OnHitNPC(p,n){p.damage=Math.max(1,Math.floor(N(p.damage)*.9));this.Ricochet(p,n);}
 OnTileCollide(p,old){let x=N(p.velocity.X),y=N(p.velocity.Y);if(x!==N(old.X))x=-N(old.X);if(y!==N(old.Y))y=-N(old.Y);p.velocity=Vector2.new(x,y);if(N(p.penetrate)>0)p.penetrate=N(p.penetrate)-1;this.Ricochet(p,null);return false;}
}
export class GlaiveOrbital extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/Glaive';}
 SetDefaults(){const p=this.Projectile;p.width=p.height=136;p.friendly=true;p.hostile=false;p.tileCollide=false;p.penetrate=-1;p.timeLeft=300;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;p.scale=.7;}
 OnSpawn(p){MarkRogueProjectile(p,'Glaive',false);}
 AI(p){const pl=owner(p);if(!pl||pl.dead){p.Kill();return;}p.Center=pl.Center;p.rotation+=.2;}
}
const SlickHB=new Map();
export function SlickCaneActive(o){const now=I(Terraria.Main.GameUpdateCount,0),t=I(SlickHB.get(Number(o)),-9999);if(now-t<=3)return true;SlickHB.delete(Number(o));return false;}
function coinCount(pl){let total=0;try{for(const i of Array.from(pl.inventory||[])){const t=I(i?.type),s=Math.max(0,I(i?.stack,0));if(t===I(Terraria.ID.ItemID.CopperCoin))total+=s;else if(t===I(Terraria.ID.ItemID.SilverCoin))total+=s*100;else if(t===I(Terraria.ID.ItemID.GoldCoin))total+=s*10000;else if(t===I(Terraria.ID.ItemID.PlatinumCoin))total+=s*1000000;}}catch(_){}return Math.min(1000000,total);}
export class SlickCaneProjectile extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/SlickCane';}
 SetDefaults(){const p=this.Projectile;p.width=40;p.height=36;p.timeLeft=120;p.friendly=true;p.hostile=false;p.tileCollide=false;p.ignoreWater=true;p.penetrate=-1;p.ownerHitCheck=true;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;p.alpha=80;p.scale=1.25;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'SlickCane',false);FusionEntityData.GetProjectileBag(p,'slickCane',()=>({age:0,base:Math.max(1,I(p.damage,50)),hit:false}));SlickHB.set(Number(p.owner),I(Terraria.Main.GameUpdateCount,0));}
 AI(p){const pl=owner(p),s=FusionEntityData.GetProjectileBag(p,'slickCane',()=>({age:0,base:Math.max(1,I(p.damage,50))}));if(!pl||pl.dead){p.Kill();return;}s.age++;SlickHB.set(Number(p.owner),I(Terraria.Main.GameUpdateCount,0));const life=Math.min(1,s.age/16),retract=s.age>80?Math.max(0,(120-s.age)/40):1,a=norm(p.velocity),dist=(20+130*Math.sin(life*Math.PI/2))*retract;p.Center=Vector2.new(N(pl.MountedCenter.X)+N(a.X)*dist,N(pl.MountedCenter.Y)+N(a.Y)*dist);p.rotation=Math.atan2(N(a.Y),N(a.X))+Math.PI/4;p.spriteDirection=N(a.X)>=0?1:-1;if(IsStealthStrike(p))p.damage=Math.max(1,Math.floor(s.base*(1+coinCount(pl)/1000000)));try{pl.heldProj=p.whoAmI;pl.itemTime=2;pl.itemAnimation=2;}catch(_){} }
 OnHitNPC(p,n){if(!valid(n))return;let value=Math.max(0,Math.min(5000,Math.floor(N(n.value)/ (15+Math.random()*20))));if(IsStealthStrike(p)&&Math.random()<.05)value+=10000*(1+Math.floor(Math.random()*2))+Math.floor(Math.random()*10000);try{const r=n['Rectangle getRect()']();while(value>=10000){const q=Math.min(50,Math.floor(value/10000));NewItem(r.X,r.Y,r.Width,r.Height,Terraria.ID.ItemID.GoldCoin,q,false,0,false);value-=q*10000;}while(value>=100){const q=Math.min(99,Math.floor(value/100));NewItem(r.X,r.Y,r.Width,r.Height,Terraria.ID.ItemID.SilverCoin,q,false,0,false);value-=q*100;}if(value>0)NewItem(r.X,r.Y,r.Width,r.Height,Terraria.ID.ItemID.CopperCoin,value,false,0,false);}catch(_){} }
 OnKill(p){SlickHB.delete(Number(p.owner));}
}
