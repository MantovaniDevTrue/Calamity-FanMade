import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';
import { CanSpawnTier1, SpawnTier1Aquatic, TargetPlayer, NPCCenter, PlayerCenter, ApplyIrradiated, AddScaleDrop, RegisterTier1Kill } from './../../../Core/AcidRainTier1NPC.js';
const { Vector2 }=Modules;const { FlavorTextBestiaryInfoElement }=Terraria.GameContent.Bestiary;function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function Clamp(v,a,b){return Math.max(a,Math.min(b,N(v)));}function Len(x,y){return Math.sqrt(x*x+y*y);}function Toward(ax,ay,bx,by,s){const dx=bx-ax,dy=by-ay,d=Math.max(.001,Len(dx,dy));return{x:dx/d*s,y:dy/d*s};}
export class Skyfin extends ModNPC{
 constructor(){super();this.Texture='NPCs/AcidRain/Skyfin';this.BestiaryRarityStars=1;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=5;}
 SetDefaults(){const n=this.NPC;n.width=46;n.height=22;n.aiStyle=-1;n.damage=12;n.lifeMax=50;n.defense=6;n.knockBackResist=1;n.value=Terraria.Item.buyPrice(0,0,2,0);n.lavaImmune=false;n.noGravity=true;n.noTileCollide=true;n.npcSlots=.8;n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;}
 OnSpawn(npc){const s=CalamityNPCState.Reset(npc);s.phase=0;s.attackTimer=0;}
 SetBestiary(db,entry){try{const t=FlavorTextBestiaryInfoElement.new();t._key=ModLocalization.Translate('Bestiary.Skyfin');entry.Info.Add(t);}catch(e){}}
 SpawnChance(info){return CanSpawnTier1(info,true)?1:0;}
 SpawnNPC(x,y){return SpawnTier1Aquatic(this.Type,x,y,46,22);}
 AI(npc){const s=CalamityNPCState.Get(npc);s.aiThrottle=(N(s.aiThrottle)+1)%4;if(s.aiThrottle!==0)return;const p=TargetPlayer(npc);if(!p)return;const a=NPCCenter(npc),b=PlayerCenter(p);s.attackTimer=N(s.attackTimer)+4;let vx=N(npc.velocity?.X),vy=N(npc.velocity?.Y),phase=Math.floor(N(s.phase));npc.spriteDirection=vx>0?1:-1;
  if(phase===0){const side=(b.x<a.x?1:-1),tx=b.x+side*400,ty=b.y-240,q=Toward(a.x,a.y,tx,ty,10);vx=(vx*29+q.x)/30;vy=(vy*29+q.y)/30;vx+=Clamp(q.x-vx,-1.5,1.5);vy+=Clamp(q.y-vy,-1.5,1.5);if(Len(tx-a.x,ty-a.y)<40||s.attackTimer>150){s.phase=1;s.attackTimer=0;vx*=.65;vy*=.65;}}
  else if(phase===1){vx*=.97;vy*=.97;vx+=Clamp(-vx,-.25,.25);vy+=Clamp(-vy,-.25,.25);if(Len(vx,vy)<1.25||s.attackTimer>50){const q=Toward(a.x,a.y,b.x,b.y,11.5);vx=q.x;vy=q.y;s.phase=2;s.attackTimer=0;}}
  else{const speed=Math.max(8,Len(vx,vy)),want=Math.atan2(b.y-a.y,b.x-a.x),cur=Math.atan2(vy,vx),diff=Math.atan2(Math.sin(want-cur),Math.cos(want-cur)),ang=cur+Clamp(diff,-.0105,.0105);vx=Math.cos(ang)*speed;vy=Math.sin(ang)*speed;if(s.attackTimer>50){s.phase=0;s.attackTimer=0;vy=(vy*.86)-1.1;}}
  SetNPCVelocity(npc,s,vx,vy);npc.rotation=Math.atan2(vy,vx)+(npc.spriteDirection>0?Math.PI:0);}
 FindFrame(npc,h){npc.frameCounter=N(npc.frameCounter)+1;if(npc.frameCounter>=5){npc.frameCounter=0;const r=npc.frame;r.Y=(N(r.Y)+h)%(h*5);npc.frame=r;}}
 OnHitPlayer(npc,target,source,damage){if(N(damage)>0)ApplyIrradiated(target,120);}
 ModifyNPCLoot(loot){AddScaleDrop(loot);}
 OnKill(npc){RegisterTier1Kill();CalamityNPCState.Remove(npc);}
}
