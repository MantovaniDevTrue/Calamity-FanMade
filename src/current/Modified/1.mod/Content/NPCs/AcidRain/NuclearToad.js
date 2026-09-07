import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';
import { CanSpawnTier1, TargetPlayer, NPCCenter, PlayerCenter, ApplyIrradiated, AddScaleDrop, RegisterTier1Kill } from './../../../Core/AcidRainTier1NPC.js';
const { Vector2 }=Modules;const { FlavorTextBestiaryInfoElement }=Terraria.GameContent.Bestiary;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function Clamp(v,a,b){return Math.max(a,Math.min(b,N(v)));}
export class NuclearToad extends ModNPC{
 constructor(){super();this.Texture='NPCs/AcidRain/NuclearToad';this.BestiaryRarityStars=1;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=5;}
 SetDefaults(){const n=this.NPC;n.width=62;n.height=34;n.damage=15;n.lifeMax=60;n.defense=3;n.aiStyle=-1;n.knockBackResist=.7;n.value=Terraria.Item.buyPrice(0,0,1,0);n.lavaImmune=false;n.noGravity=true;n.noTileCollide=false;n.npcSlots=.8;n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;}
 OnSpawn(npc){const s=CalamityNPCState.Reset(npc);s.explosionTimer=0;}
 SetBestiary(db,entry){try{const t=FlavorTextBestiaryInfoElement.new();t._key=ModLocalization.Translate('Bestiary.NuclearToad');entry.Info.Add(t);}catch(e){}}
 SpawnChance(info){return CanSpawnTier1(info,false)?.75:0;}
 AI(npc){const s=CalamityNPCState.Get(npc);s.aiThrottle=(N(s.aiThrottle)+1)%4;if(s.aiThrottle!==0)return;const p=TargetPlayer(npc);let vx=N(npc.velocity?.X)*.96,vy=N(npc.velocity?.Y);if(npc.wet){if(vy>2)vy*=.9;vy=Math.max(-4,vy-.16);}else{if(vy<-2)vy*=.9;vy=Math.min(3,vy+.16);}SetNPCVelocity(npc,s,vx,vy);if(p){const a=NPCCenter(npc),b=PlayerCenter(p),dx=b.x-a.x,dy=b.y-a.y;if(dx*dx+dy*dy<=270*270||N(s.explosionTimer)>0)s.explosionTimer=N(s.explosionTimer)+4;}if(N(s.explosionTimer)>=120){this.Explode(npc);}}
 Explode(npc){const type=N(ModProjectile.getTypeByName('NuclearToadGoo'),0),a=NPCCenter(npc);if(type>0)for(let i=0;i<7;i++){const ang=-Math.PI/2+(Math.random()-.5)*1.58,speed=(8+Math.random()*4)*(.8+Math.random()*.2);try{NewProjectile(null,a.x,a.y,Math.cos(ang)*speed,Math.sin(ang)*speed,type,10,1,-1,0,0,0,null);}catch(e){}}npc.life=0;npc.active=false;npc.netUpdate=true;}
 FindFrame(npc,h){npc.frameCounter=N(npc.frameCounter)+1;if(npc.frameCounter>=4){npc.frameCounter=0;const r=npc.frame;r.Y=(N(r.Y)+h)%(h*5);npc.frame=r;}}
 OnHitPlayer(npc,target,source,damage){if(N(damage)>0)ApplyIrradiated(target,120);}
 ModifyNPCLoot(loot){
  AddScaleDrop(loot);
  try{loot.Add(Terraria.GameContent.ItemDropRules.ItemDropRule.Common(887,100,1,1));}catch(_){}
  // Before Aquatic Scourge, the official drop chance is 1/20.
  // That is the only progression state currently reachable in this pre-HM port.
  try{
   const staff=N(ModItem.getTypeByName('CausticCroakerStaff'),0);
   if(staff>0)loot.Add(Terraria.GameContent.ItemDropRules.ItemDropRule.Common(staff,20,1,1));
  }catch(_){}
 }
 OnKill(npc){RegisterTier1Kill();CalamityNPCState.Remove(npc);}
}
