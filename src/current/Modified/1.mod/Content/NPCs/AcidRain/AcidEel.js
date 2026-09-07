import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';
import { CanSpawnTier1, SpawnTier1Aquatic, TargetPlayer, NPCCenter, PlayerCenter, ApplyIrradiated, AddScaleDrop, RegisterTier1Kill } from './../../../Core/AcidRainTier1NPC.js';
const { Vector2 }=Modules;const { FlavorTextBestiaryInfoElement }=Terraria.GameContent.Bestiary;
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function Clamp(v,a,b){return Math.max(a,Math.min(b,N(v)));}
export class AcidEel extends ModNPC{
 constructor(){super();this.Texture='NPCs/AcidRain/AcidEelBestiary';this.BestiaryRarityStars=1;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=6;}
 SetDefaults(){const n=this.NPC;n.width=20;n.height=20;n.damage=20;n.lifeMax=45;n.defense=4;n.knockBackResist=.9;n.value=Terraria.Item.buyPrice(0,0,2,0);n.aiStyle=-1;n.noGravity=true;n.noTileCollide=false;n.lavaImmune=false;n.npcSlots=.7;n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;}
 SetBestiary(db,entry){try{const t=FlavorTextBestiaryInfoElement.new();t._key=ModLocalization.Translate('Bestiary.AcidEel');entry.Info.Add(t);}catch(e){}}
 SpawnChance(info){return CanSpawnTier1(info,true)?1:0;}
 SpawnNPC(x,y){return SpawnTier1Aquatic(this.Type,x,y,20,20);}
 AI(npc){const s=CalamityNPCState.Get(npc);s.aiThrottle=(N(s.aiThrottle)+1)%4;if(s.aiThrottle!==0)return;const p=TargetPlayer(npc);let vx=N(npc.velocity?.X),vy=N(npc.velocity?.Y);if(npc.wet&&p){const a=NPCCenter(npc),b=PlayerCenter(p),dir=(b.x>=a.x?1:-1);npc.direction=dir;npc.spriteDirection=dir;vx=(vx*24+dir*12)/25;const dy=b.y-a.y;vy=Clamp(vy+Clamp(dy*.0025,-.12,.12),-4.5,4.5);if(npc.collideX){npc.direction*=-1;vx=-vx*.7;}}else{vx*=.95;vy=Clamp(vy+.15,-14,14);npc.rotation*=.9;}SetNPCVelocity(npc,s,vx,vy);npc.rotation=Clamp(Math.atan2(vy,Math.max(.01,Math.abs(vx)))*(npc.direction||1),-.5,.5);}
 FindFrame(npc,h){npc.frameCounter=N(npc.frameCounter)+1;if(npc.frameCounter>=5){npc.frameCounter=0;const r=npc.frame;r.Y=(N(r.Y)+h)%(h*6);npc.frame=r;}}
 OnHitPlayer(npc,target,source,damage){if(N(damage)>0)ApplyIrradiated(target,120);}
 ModifyNPCLoot(loot){AddScaleDrop(loot);}
 OnKill(npc){RegisterTier1Kill();CalamityNPCState.Remove(npc);}
}
