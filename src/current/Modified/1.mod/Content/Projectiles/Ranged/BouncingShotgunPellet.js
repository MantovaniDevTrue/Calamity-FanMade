import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC, ScanFrozenCubeNPCs } from './../../../Core/FrozenCubeTargetRuntime.js';
import { PlayItemSound } from '../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2,Color }=Modules;const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const Bounce=new Map();let LastHitSound=0,LastScanTick=-1,DustTick=-1,DustBudget=0;function K(p){return Math.floor(Number(p.whoAmI)||-1);}function Tick(){try{return Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(_){return 0;}}function RefreshTargets(){const t=Tick();if(t===LastScanTick)return;LastScanTick=t;ScanFrozenCubeNPCs(8);}function TakeDust(){const t=Tick();if(t!==DustTick){DustTick=t;DustBudget=12;}if(DustBudget<=0)return false;DustBudget--;return true;}function Chase(n){try{return !!(n&&n.active&&Number(n.life)>0&&n.friendly!==true&&n.dontTakeDamage!==true);}catch(_){return false;}}function Owner(p){try{return Terraria.Main.player[p.owner];}catch(_){return null;}}
export class BouncingShotgunPellet extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/RealmRavagerBullet';}
 SetDefaults(){const p=this.Projectile;p.width=4;p.height=4;p.light=.5;p.alpha=255;p.ranged=true;p.friendly=true;p.aiStyle=1;this.AIType=242;p.timeLeft=180;}
 OnSpawn(p){Bounce.set(K(p),3);}
 OnTileCollide(p,oldVelocity){let b=(Bounce.get(K(p))??3)-1;Bounce.set(K(p),b);if(b<=0)return true;if(b===1){const owner=Owner(p);RefreshTargets();let tx=null,best=640*640,aim=null;try{aim=owner&&Number(Terraria.PlayerIndex(owner))===Number(Terraria.Main.myPlayer)?Terraria.Main.MouseWorld:null;}catch(_){}if(!aim&&owner)aim=owner.Center;if(aim){for(const idx of FrozenCubeTrackedIndices()){const n=FrozenCubeNPC(idx);if(!Chase(n))continue;const dx=Number(n.Center.X)-Number(aim.X),dy=Number(n.Center.Y)-Number(aim.Y),d=dx*dx+dy*dy;if(d<best){best=d;tx=n;}}}if(tx){const dx=Number(tx.Center.X)-Number(p.Center.X),dy=Number(tx.Center.Y)-Number(p.Center.Y),m=Math.sqrt(dx*dx+dy*dy)||1,s=18;p.velocity=Vector2.new(dx/m*s,dy/m*s);return false;}}
 if(Number(p.velocity.X)!==Number(oldVelocity.X))p.velocity=Vector2.new(-Number(oldVelocity.X),Number(p.velocity.Y));if(Number(p.velocity.Y)!==Number(oldVelocity.Y))p.velocity=Vector2.new(Number(p.velocity.X),-Number(oldVelocity.Y));return false;}
 OnHitNPC(p,npc){const now=Date.now();if(now-LastHitSound>55){LastHitSound=now;try{PlayItemSound(10,p.Center,0,.35);}catch(_){}}}
 OnKill(p){Bounce.delete(K(p));for(let i=0;i<3&&TakeDust();i++)try{NewDust(p.position,p.width,p.height,6,(Math.random()-.5)*3,(Math.random()-.5)*3,80,Color.White,.8);}catch(_){}}
}
