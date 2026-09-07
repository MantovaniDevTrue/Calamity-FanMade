import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ProjAI } from './../../../TL/ProjAI.js';
const { Vector2, Color }=Modules;
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const PlaySound=Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'];
function ownerOf(p){const i=Math.floor(Number(p.owner));if(!(i>=0))return null;try{return Terraria.Main.player.get_Item(i);}catch(e){try{return Terraria.Main.player[i];}catch(_){return null;}}}
export class SpectralFeather extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Magic/StickyFeather';}
 SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.scale=.8;p.friendly=true;p.ignoreWater=true;p.timeLeft=2;p.penetrate=-1;p.tileCollide=false;p.extraUpdates=0;p.magic=true;}
 CanDamage(){return false;}
 OnSpawn(p){const o=ownerOf(p),s=ModPlayer.getByName('AerialiteAccessoryPlayer');if(o&&s&&s.IsCrownVisible(o)){try{PlaySound(2,Terraria.PlayerCenter(o),20,0);}catch(e){}}}
 AI(p){const o=ownerOf(p),s=ModPlayer.getByName('AerialiteAccessoryPlayer');if(!o||!s||!s.IsCrownEquipped(o)){p.Kill();return;}const count=s.GetCrownCount(o),ai=new ProjAI(p),index=Math.max(1,Math.floor(Number(ai[1])||1));if(count<index){p.Kill();return;}p.timeLeft=2;p.alpha=s.IsCrownVisible(o)?0:160;p.rotation=Number(p.rotation)+0.02268928;
   const tick=Number(Terraria.Main.GameUpdateCount||0),angle=((index-1)/Math.max(1,count)+tick/180)*Math.PI*2,r=18+count,c=Terraria.PlayerCenter(o);p.Center=Vector2.new(Number(c.X)+Math.cos(angle)*r,Number(c.Y)-25+Math.sin(angle)*r*.05);
   if(((Math.floor(tick)+index)&3)===0){try{Terraria.Lighting.AddLight(p.Center,.15,.13,.075);}catch(e){}}
 }
 OnKill(p){for(let i=0;i<4;i++){try{const a=i*Math.PI*.5,s=.4+i*.18,d=NewDust(p.Center,2,2,31,Math.cos(a)*s,Math.sin(a)*s,180,Color.White,.8);if(d>=0)Terraria.Main.dust[d].noGravity=true;}catch(e){}}}
}
