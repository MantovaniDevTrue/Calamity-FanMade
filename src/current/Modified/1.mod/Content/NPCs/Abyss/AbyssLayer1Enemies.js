import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { CanSpawnLayer1, CanSpawnLayer, TargetPlayer, PlayerCenter, NPCCenter, MoveToward, ApplyElectrified, ApplyPoisoned } from './../../../Core/AbyssLayer1Runtime.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';
const { Vector2 }=Modules;
const { ItemDropRule }=Terraria.GameContent.ItemDropRules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function frame(npc,h,count,speed=.15){npc.frameCounter=N(npc.frameCounter)+speed;if(npc.frameCounter>=count)npc.frameCounter-=count;npc.frame.Y=I(npc.frameCounter)*h;}
function setVelocity(npc,state,x,y){const vx=N(x),vy=N(y);try{let v=state&&state.velocityScratch;if(!v){v=Vector2.new();if(state)state.velocityScratch=v;}v.X=vx;v.Y=vy;npc.velocity=v;}catch(e){npc.velocity=Vector2.new(vx,vy);}}
function outOfWater(npc,state=null){if(npc.wet)return false;state=state||CalamityNPCState.Get(npc);const vx=N(npc.velocity?.X)*.98,vy=Math.min(10,N(npc.velocity?.Y)+.22);setVelocity(npc,state,vx,vy);npc.rotation+=vx*.08;return true;}
function drift(npc,state,max=1.2){let vx=N(npc.velocity?.X),vy=N(npc.velocity?.Y);if(!state.dir){state.dir=Math.random()<.5?-1:1;state.dirY=Math.random()<.5?-1:1;}vx+=state.dir*.02;vy+=state.dirY*.012;if(Math.abs(vx)>max)vx*=.96;if(Math.abs(vy)>.9)vy*=.97;if(npc.collideX){state.dir*=-1;vx*=-.8;}if(npc.collideY){state.dirY*=-1;vy*=-.8;}setVelocity(npc,state,vx,vy);npc.direction=vx>=0?1:-1;npc.spriteDirection=npc.direction;}
function bestiary(entry,key){try{const e=Terraria.GameContent.Bestiary.FlavorTextBestiaryInfoElement.new();e._key=ModLocalization.Translate(key);entry.Info.Add(e);}catch(e){}}

export class BoxJellyfish extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/BoxJellyfish';}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=4;}
 SetDefaults(){const n=this.NPC;n.noGravity=true;n.damage=44;n.width=30;n.height=33;n.defense=8;n.lifeMax=100;n.aiStyle=-1;n.value=Terraria.Item.buyPrice(0,0,1,0);n.knockBackResist=.6;n.HitSound=Terraria.ID.SoundID.NPCHit25;n.DeathSound=Terraria.ID.SoundID.NPCDeath28;n.npcSlots=.8;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.dir=Math.random()<.5?-1:1;s.dirY=-1;}
 SpawnChance(info){if(CanSpawnLayer1(info,this.Type,7))return 0.45;if(info&&info.Ocean&&!info.PlayerSafe&&!SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))return 0.01;return 0;}
 SetBestiary(db,entry){bestiary(entry,'Bestiary.BoxJellyfish');}
 PreAI(n){if(outOfWater(n))return false;const s=CalamityNPCState.Get(n),p=TargetPlayer(n);if(p&&p.wet&&!p.dead){const a=NPCCenter(n),b=PlayerCenter(p),dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy);if(d<520){MoveToward(n,b.x,b.y,8,10);n.rotation=Math.atan2(N(n.velocity?.Y),N(n.velocity?.X))+Math.PI/2;return false;}}drift(n,s,1);n.rotation=N(n.velocity?.X)*.4;return false;}
 FindFrame(n,h){frame(n,h,4,.15);}
 OnHitPlayer(n,target,src,damage){if(N(damage)>0)ApplyElectrified(target,120);}
 ModifyNPCLoot(loot){try{loot.Add(ItemDropRule.Common(1303,30,1,1));}catch(e){} }
}

export class CannonballJellyfish extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/CannonballJellyfish';}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=4;}
 SetDefaults(){const n=this.NPC;n.noGravity=true;n.damage=50;n.width=54;n.height=76;n.defense=0;n.lifeMax=400;n.aiStyle=-1;n.knockBackResist=0;n.value=Terraria.Item.buyPrice(0,0,4,0);n.HitSound=Terraria.ID.SoundID.NPCHit25;n.DeathSound=Terraria.ID.SoundID.NPCDeath28;n.npcSlots=1.2;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.angered=false;s.pulse=0;n.chaseable=false;setVelocity(n,s,0,-2.5);}
 SpawnChance(info){return CanSpawnLayer1(info,this.Type,3)?0.20:0;}
 SetBestiary(db,entry){bestiary(entry,'Bestiary.CannonballJellyfish');}
 PreAI(n){const s=CalamityNPCState.Get(n);if(n.justHit)s.angered=true;n.chaseable=s.angered===true;if(outOfWater(n))return false;if(s.angered){const p=TargetPlayer(n);if(p){const c=PlayerCenter(p);MoveToward(n,c.x,c.y,11,7);n.rotation=Math.atan2(N(n.velocity?.Y),N(n.velocity?.X))+Math.PI/2;return false;}}s.pulse=I(s.pulse)+1;let vy=N(n.velocity?.Y)+.1;if(s.pulse%28===0)vy=-1.35;setVelocity(n,s,N(n.velocity?.X)*.96,Math.max(-2,Math.min(2,vy)));return false;}
 FindFrame(n,h){frame(n,h,4,1/7);}
 ModifyNPCLoot(loot){try{loot.Add(ItemDropRule.Common(166,1,1,1));loot.Add(ItemDropRule.Common(887,100,1,1));loot.Add(ItemDropRule.Common(1303,30,1,1));}catch(e){} }
}

export class MorayEel extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/MorayEel';}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=6;}
 SetDefaults(){const n=this.NPC;n.noGravity=true;n.damage=55;n.width=136;n.height=40;n.defense=8;n.lifeMax=360;n.aiStyle=-1;n.value=Terraria.Item.buyPrice(0,0,4,0);n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;n.knockBackResist=.75;n.chaseable=false;n.npcSlots=1;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.aggro=false;s.dir=Math.random()<.5?-1:1;s.dirY=1;}
 SpawnChance(info){if(CanSpawnLayer1(info,this.Type,5))return 0.40;if(info&&info.Ocean&&!info.PlayerSafe&&!SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))return 0.01;return 0;}
 SetBestiary(db,entry){bestiary(entry,'Bestiary.MorayEel');}
 PreAI(n){if(outOfWater(n))return false;const s=CalamityNPCState.Get(n),p=TargetPlayer(n);if(p){const a=NPCCenter(n),b=PlayerCenter(p),dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy);if(n.justHit||d<160)s.aggro=true;if(s.aggro){n.chaseable=true;MoveToward(n,b.x,b.y,6,8);n.rotation=Math.atan2(N(n.velocity?.Y),N(n.velocity?.X));return false;}}n.chaseable=false;drift(n,s,1.1);n.rotation=N(n.velocity?.Y)*.08*(n.direction||1);return false;}
 FindFrame(n,h){frame(n,h,6,n.chaseable?.15:.075);}
 OnHitPlayer(n,target,src,damage){if(N(damage)>0)ApplyElectrified(target,120);}
 ModifyNPCLoot(loot){try{loot.Add(ItemDropRule.Common(187,15,1,1));}catch(e){} }
}

export class ToxicMinnow extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/ToxicMinnow';}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=4;}
 SetDefaults(){const n=this.NPC;n.noGravity=true;n.damage=20;n.width=80;n.height=40;n.defense=20;n.lifeMax=300;n.aiStyle=-1;n.value=Terraria.Item.buyPrice(0,0,4,0);n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;n.knockBackResist=.15;n.chaseable=false;n.npcSlots=1;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.aggro=false;s.dir=Math.random()<.5?-1:1;s.dirY=Math.random()<.5?-1:1;}
 SpawnChance(info){if(CanSpawnLayer(info,2,this.Type,5,true))return 0.36;return CanSpawnLayer1(info,this.Type,5)?0.15:0;}
 SetBestiary(db,entry){bestiary(entry,'Bestiary.ToxicMinnow');}
 PreAI(n){if(outOfWater(n))return false;const s=CalamityNPCState.Get(n),p=TargetPlayer(n);if(n.justHit)s.aggro=true;if(s.aggro&&p){n.chaseable=true;const c=PlayerCenter(p);MoveToward(n,c.x,c.y,5.5,12);}else{n.chaseable=false;drift(n,s,1.25);}n.rotation=N(n.velocity?.Y)*.08*(n.direction||1);return false;}
 FindFrame(n,h){frame(n,h,4,.15);}
 OnHitPlayer(n,target,src,damage){if(N(damage)>0)ApplyPoisoned(target,240);}
 CheckDead(n){const type=I(ModProjectile.getTypeByName('ToxicMinnowCloud'),0);if(type>0){const c=NPCCenter(n),base=Math.atan2(N(n.velocity?.Y),N(n.velocity?.X));for(let i=0;i<8;i++){const a=base+Math.PI*2*i/8,v=4.2;try{NewProjectile(null,c.x,c.y,Math.cos(a)*v,Math.sin(a)*v,type,20,0,I(Terraria.Main.myPlayer),0,0,0,null);}catch(e){}}}return true;}
 ModifyNPCLoot(loot){try{loot.Add(ItemDropRule.Common(887,100,1,1));}catch(e){} }
}
