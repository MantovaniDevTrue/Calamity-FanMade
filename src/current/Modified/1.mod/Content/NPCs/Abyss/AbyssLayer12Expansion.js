import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { CanSpawnLayer, CountNPC } from './../../../Core/AbyssLayer1Runtime.js';
import { GetAbyssAggroRange } from './../../../Core/AbyssAggroRuntime.js';
import { SpawnAquaticNPC, TargetPlayer, PlayerCenter, NPCCenter, SetNPCVelocity, ModeMultiplier, N, Clamp } from './../../../Core/SulphurousSeaEcologyRuntime.js';
import { InitVirtualWorm, UpdateVirtualWorm, GetVirtualWormGeometry } from './../../../Core/SingleEntityWormRuntime.js';
import { AndroidSound } from './../../../Common/Snippets/AndroidSound.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
let ByNPC = null, HurtPlayer = null;
try { ByNPC = Terraria.DataStructures.PlayerDeathReason['PlayerDeathReason ByNPC(int index)']; } catch (_) { }
try { HurtPlayer = Terraria.Player['double Hurt(PlayerDeathReason damageSource, int Damage, int hitDirection, bool pvp, bool quiet, bool Crit, int cooldownCounter, bool dodgeable)']; } catch (_) { }

function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function bestiary(entry,key){try{const e=FlavorTextBestiaryInfoElement.new();e._key=ModLocalization.Translate(key);entry.Info.Add(e);}catch(_){} }
function dist(a,b){const dx=b.x-a.x,dy=b.y-a.y;return{dx,dy,d:Math.sqrt(dx*dx+dy*dy)};}
function addBuff(player,name,ticks){try{const t=I(ModBuff.getTypeByName(name),0);if(t>0)player.AddBuff(t,I(ticks),true);}catch(_){} }
function outOfWater(n,state){if(n.wet)return false;let vx=N(n.velocity?.X)*.94,vy=Math.min(12,N(n.velocity?.Y)+.4);SetNPCVelocity(n,state,vx,vy);n.rotation=Clamp(vy*(N(n.direction,1)||1)*.1,-.3,.3);return true;}
function frame(n,h,count,speed=.15){n.frameCounter=(N(n.frameCounter)+speed)%count;const r=n.frame;r.Y=Math.floor(N(n.frameCounter))*h;n.frame=r;}
function drift(n,s,maxX=2.5,maxY=.4){let vx=N(n.velocity?.X),vy=N(n.velocity?.Y);if(!s.swimDir){s.swimDir=Math.random()<.5?-1:1;s.swimY=Math.random()<.5?-1:1;}if(n.collideX){s.swimDir*=-1;vx*=-1;}if(n.collideY){s.swimY*=-1;vy*=-1;}vx+=s.swimDir*.1;if(Math.abs(vx)>maxX)vx*=.95;vy+=s.swimY*.01;if(vy>maxY){s.swimY=-1;vy*=.95;}if(vy<-maxY){s.swimY=1;vy*=.95;}SetNPCVelocity(n,s,vx,vy);n.direction=vx>=0?1:-1;n.spriteDirection=n.direction;n.rotation=Clamp(vy*n.direction*.1,-.25,.25);}
function passiveSwim(n,s,detectRange,xAccel,yAccel,capX,capY){if(outOfWater(n,s))return;const p=TargetPlayer(n,false);if(n.justHit)n.chaseable=true;let target=null;if(p&&p.active&&!p.dead){target=dist(NPCCenter(n),PlayerCenter(p));if(p.wet&&target.d<GetAbyssAggroRange(p,detectRange))n.chaseable=true;}if(n.chaseable&&target&&p&&p.wet&&!p.dead){const m=ModeMultiplier(),dx=target.dx>=0?1:-1,dy=target.dy>=0?1:-1;let vx=N(n.velocity?.X)+dx*xAccel*m,vy=N(n.velocity?.Y)+dy*yAccel*m;vx=Clamp(vx,-capX*m,capX*m);vy=Clamp(vy,-capY*m,capY*m);if(Math.abs(vy)>.4)vy*=.95;SetNPCVelocity(n,s,vx,vy);n.direction=dx;n.directionY=dy;n.spriteDirection=dx;n.rotation=Clamp(vy*dx*.1,-.25,.25);}else drift(n,s);}
const GlowPos=Vector2.new(),GlowOrigin=Vector2.new(),GlowColorCache=new Array(17);
function CachedGlowColor(alpha){const bucket=Math.max(0,Math.min(16,Math.round(N(alpha)/16)));let c=GlowColorCache[bucket];if(!c){const a=Math.min(255,bucket*16);c=Color.new(255,255,255,a);GlowColorCache[bucket]=c;}return c;}
function loadGlow(self,path){try{self.GlowTexture=tl.texture.load(path);}catch(_){self.GlowTexture=null;} }
function glowDraw(self,n,spriteBatch,screenPos,strength=.5){if(!self.GlowTexture||N(n.alpha)>=255)return;try{const draw=spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];const src=n.frame;GlowOrigin.X=N(src.Width)*.5;GlowOrigin.Y=N(src.Height)*.5;GlowPos.X=N(n.position?.X)+N(n.width)*.5-N(screenPos.X);GlowPos.Y=N(n.position?.Y)+N(n.height)*.5-N(screenPos.Y)+N(n.gfxOffY);const a=Math.max(0,Math.min(255,(255-N(n.alpha))*strength));draw(self.GlowTexture,GlowPos,src,CachedGlowColor(a),N(n.rotation),GlowOrigin,N(n.scale,1),N(n.spriteDirection)===1?SpriteEffects.FlipHorizontally:SpriteEffects.None,0);}catch(_){} }
function dust(n,type,count,scale=1){for(let k=0;k<count;k++)try{NewDust(Vector2.new(N(n.position.X),N(n.position.Y)),I(n.width),I(n.height),type,(Math.random()-.5)*2,(Math.random()-.5)*2,0,Color.White,scale);}catch(_){} }

export class BabyCannonballJellyfish extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/BabyCannonballJellyfish';}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=4;try{Terraria.Main.npcCatchable[this.Type]=true;}catch(_){} }
 SetDefaults(){const n=this.NPC;n.npcSlots=.1;n.noGravity=true;n.chaseable=false;n.aiStyle=-1;n.damage=0;n.width=28;n.height=36;n.defense=0;n.lifeMax=5;n.knockBackResist=1;n.alpha=100;n.HitSound=Terraria.ID.SoundID.NPCHit25;n.DeathSound=Terraria.ID.SoundID.NPCDeath28;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.started=false;}
 SpawnChance(info){return CanSpawnLayer(info,1,this.Type,8,true) ? 0.18:0;}
 SpawnNPC(x,y){return SpawnAquaticNPC(this.Type,x,y,28,36);}
 SetBestiary(db,e){bestiary(e,'Bestiary.BabyCannonballJellyfish');}
 PreAI(n){const s=CalamityNPCState.Get(n);if(!s.started){s.started=true;SetNPCVelocity(n,s,N(n.velocity?.X),-3);}if(n.wet){n.noGravity=true;let vy=N(n.velocity?.Y);if(vy<0)vy+=.1;if(vy>0)vy=0;SetNPCVelocity(n,s,N(n.velocity?.X),vy);}else n.noGravity=false;const c=NPCCenter(n);try{Terraria.Lighting.AddLight(I(c.x/16),I(c.y/16),.26,.85,.65);}catch(_){}return false;}
 FindFrame(n,h){frame(n,h,4,.15);}
 CheckDead(n){const c=NPCCenter(n);try{if(ByNPC&&HurtPlayer){for(let i=0;i<255;i++){let p=null;try{p=Terraria.Main.player.get_Item(i);}catch(_){}if(!p||!p.active||p.dead)continue;const q=PlayerCenter(p),dx=q.x-c.x,dy=q.y-c.y;if(dx*dx+dy*dy<=58*58){const src=ByNPC(I(n.whoAmI));HurtPlayer(p,src,30,N(n.direction,1)>=0?1:-1,false,false,false,-1,true);}}}}catch(_){}dust(n,229,8,1);return true;}
}

export class SlabCrab extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/SlabCrab';this.GlowTexture=null;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=23;}
 PostSetupContent(){loadGlow(this,'Textures/NPCs/Abyss/SlabCrabGlow.png');}
 SetDefaults(){const n=this.NPC;n.width=44;n.height=30;n.damage=20;n.lifeMax=300;n.aiStyle=-1;n.knockBackResist=0;n.value=Terraria.Item.buyPrice(0,0,2,0);n.noGravity=false;n.noTileCollide=false;n.chaseable=false;n.defense=999998;n.HitSound=Terraria.ID.SoundID.NPCHit33;n.DeathSound=Terraria.ID.SoundID.NPCDeath36;n.npcSlots=1;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.crabPhase=0;s.crabTimer=0;s.calm=0;s.spawnGrace=0;}
 SpawnChance(info){return CanSpawnLayer(info,1,this.Type,5,true) ? 0.18:0;}
 SetBestiary(db,e){bestiary(e,'Bestiary.SlabCrab');}
 PreAI(n){const s=CalamityNPCState.Get(n),p=TargetPlayer(n,false);s.spawnGrace=I(s.spawnGrace)+1;n.spriteDirection=-(N(n.direction,1)||1);if(s.spawnGrace<90){n.damage=0;return false;}const q=p?dist(NPCCenter(n),PlayerCenter(p)):null;if(I(s.crabPhase)===0){n.damage=0;n.defense=999998;n.chaseable=false;s.crabTimer=I(s.crabTimer)+1;if(n.justHit||(q&&q.d<150)){s.crabPhase=2;s.crabTimer=0;n.netUpdate=true;}return false;}if(I(s.crabPhase)===2){n.damage=0;n.defense=10;s.crabTimer=I(s.crabTimer)+1;if(s.crabTimer>24){s.crabPhase=3;s.crabTimer=0;n.chaseable=true;}return false;}n.defense=10;n.damage=20;n.chaseable=true;if(!p||p.dead){s.calm=I(s.calm)+1;}else if(q&&q.d>600)s.calm=I(s.calm)+1;else s.calm=Math.max(0,I(s.calm)-1);if(s.calm>180&&Math.abs(N(n.velocity?.Y))<.1){s.crabPhase=0;s.calm=0;s.crabTimer=0;n.chaseable=false;n.damage=0;return false;}if(p){s.crabTimer=I(s.crabTimer)+1;if((n.collideY||Math.abs(N(n.velocity?.Y))<.05)&&s.crabTimer>=Math.max(10,25-Math.floor((1-N(n.life)/Math.max(1,N(n.lifeMax)))*15))){s.crabTimer=0;const dx=PlayerCenter(p).x-NPCCenter(n).x,dir=dx>=0?1:-1;SetNPCVelocity(n,s,dir*7.2,-7);n.direction=dir;n.netUpdate=true;}}return false;}
 FindFrame(n,h){const s=CalamityNPCState.Get(n),r=n.frame;if(I(s.crabPhase)===0){r.Y=0;}else if(I(s.crabPhase)===2){r.Y=Math.min(18,Math.floor(I(s.crabTimer)/3))*h;}else{n.frameCounter=(N(n.frameCounter)+1)%24;r.Y=(19+Math.floor(N(n.frameCounter)/6)%4)*h;}n.frame=r;}
 PostDraw(n,sb,sp){glowDraw(this,n,sb,sp,.65);}
 OnHitPlayer(n,p,src,damage){if(N(damage)>0)addBuff(p,'RiptideDebuff',120);}
 ModifyNPCLoot(loot){try{const t=I(ModItem.getTypeByName('SulphurousShale'),0);if(t>0)loot.Add(ItemDropRule.Common(t,5,10,30));}catch(_){} }
}

export class Cuttlefish extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/Cuttlefish';this.GlowTexture=null;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=5;}
 PostSetupContent(){loadGlow(this,'Textures/NPCs/Abyss/CuttlefishGlow.png');}
 SetDefaults(){const n=this.NPC;n.noGravity=true;n.chaseable=false;n.damage=34;n.width=58;n.height=30;n.defense=8;n.lifeMax=160;n.aiStyle=-1;n.alpha=150;n.value=Terraria.Item.buyPrice(0,0,2,0);n.HitSound=Terraria.ID.SoundID.NPCHit33;n.DeathSound=Terraria.ID.SoundID.NPCDeath28;n.knockBackResist=.3;n.npcSlots=1;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.cuttlePhase=0;s.swimDir=Math.random()<.5?-1:1;s.swimY=Math.random()<.5?-1:1;}
 SpawnChance(info){return CanSpawnLayer(info,2,this.Type,6,true)?0.11:0;}
 SpawnNPC(x,y){return SpawnAquaticNPC(this.Type,x,y,58,30);}
 SetBestiary(db,e){bestiary(e,'Bestiary.Cuttlefish');}
 PreAI(n){const s=CalamityNPCState.Get(n),p=TargetPlayer(n,false);if(outOfWater(n,s))return false;if(I(s.cuttlePhase)===0){n.alpha=150;n.chaseable=false;if(n.justHit)s.cuttlePhase=1;else if(p&&p.wet&&!p.dead){const d=dist(NPCCenter(n),PlayerCenter(p));if(d.d<GetAbyssAggroRange(p,160))s.cuttlePhase=1;}if(I(s.cuttlePhase)===0){drift(n,s,1,.9);return false;}s.fade=-16;}if(I(s.cuttlePhase)===1){n.alpha=Math.max(0,I(n.alpha)-10);s.fade=I(s.fade)+1;if(s.fade>=0){s.cuttlePhase=2;n.chaseable=true;}return false;}if(p&&p.wet&&!p.dead){const d=dist(NPCCenter(n),PlayerCenter(p)),m=ModeMultiplier();let vx=N(n.velocity?.X)+Math.sign(d.dx||1)*.2*m,vy=N(n.velocity?.Y)+Math.sign(d.dy||1)*.15*m;vx=Clamp(vx,-5*m,5*m);vy=Clamp(vy,-4*m,4*m);SetNPCVelocity(n,s,vx,vy);n.direction=vx>=0?1:-1;n.spriteDirection=n.direction;n.rotation=Clamp(vx*.08,-.35,.35);}else drift(n,s,1.5,.8);return false;}
 FindFrame(n,h){frame(n,h,5,n.chaseable?.15:.075);}
 PostDraw(n,sb,sp){glowDraw(this,n,sb,sp,.5);}
 OnHitPlayer(n,p,src,damage){if(N(damage)>0)try{p.AddBuff(Terraria.ID.BuffID.Darkness,300,true);}catch(_){} }
 ModifyNPCLoot(loot){try{const coating=I(ModItem.getTypeByName('AnechoicCoating'),0),ink=I(ModItem.getTypeByName('InkBomb'),0);if(coating>0)loot.Add(ItemDropRule.Common(coating,2,1,1));loot.Add(ItemDropRule.Common(Terraria.ID.ItemID.Blindfold,100,1,1));if(ink>0)loot.Add(ItemDropRule.Common(ink,10,1,1));}catch(_){} }
}

export class Laserfish extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/Laserfish';this.GlowTexture=null;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=6;try{Terraria.ID.NPCID.Sets.NeedsExpertScaling[this.Type]=true;}catch(_){} }
 PostSetupContent(){loadGlow(this,'Textures/NPCs/Abyss/LaserfishGlow.png');}
 SetDefaults(){const n=this.NPC;n.noGravity=true;n.damage=0;n.width=58;n.height=32;n.defense=20;n.lifeMax=600;n.aiStyle=-1;n.value=Terraria.Item.buyPrice(0,0,10,0);n.HitSound=Terraria.ID.SoundID.NPCHit51;n.DeathSound=Terraria.ID.SoundID.NPCDeath26;n.knockBackResist=.65;n.chaseable=false;n.npcSlots=1;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.swimDir=Math.random()<.5?-1:1;s.swimY=Math.random()<.5?-1:1;s.laserTimer=0;}
 SpawnChance(info){if(CanSpawnLayer(info,3,this.Type,6,true))return Terraria.Main.remixWorld===true?10.8:0.22;return CanSpawnLayer(info,2,this.Type,6,true)?0.11:0;}
 SpawnNPC(x,y){return SpawnAquaticNPC(this.Type,x,y,58,32);}
 SetBestiary(db,e){bestiary(e,'Bestiary.Laserfish');}
 PreAI(n){const s=CalamityNPCState.Get(n);passiveSwim(n,s,160,.15,.15,4,4);if(n.chaseable){s.laserTimer=N(s.laserTimer)+ModeMultiplier();if(s.laserTimer>=120){s.laserTimer=0;const p=TargetPlayer(n,false);if(p&&p.active&&!p.dead&&p.wet&&Terraria.Main.netMode!==1){const a=NPCCenter(n),b=PlayerCenter(p),dx=b.x-a.x+(Math.random()*40-20),dy=b.y-a.y+(Math.random()*40-20),d=Math.sqrt(dx*dx+dy*dy)||1,sp=5,damage=Terraria.Main.masterMode?34:(Terraria.Main.expertMode?40:50);try{const idx=NewProjectile(null,a.x+(N(n.spriteDirection)===1?25:-25),a.y+(dy>0?5:-5),dx/d*sp,dy/d*sp,Terraria.ID.ProjectileID.EyeBeam,damage,0,I(Terraria.Main.myPlayer),0,0,0,null);if(idx>=0&&idx<1000){let pr=null;try{pr=Terraria.Main.projectile.get_Item(idx);}catch(_){}if(pr){pr.hostile=true;pr.friendly=false;pr.tileCollide=true;}}}catch(_){} }} }return false;}
 FindFrame(n,h){if(!n.wet){n.frameCounter=0;return;}frame(n,h,6,n.chaseable?.15:.075);}
 PostDraw(n,sb,sp){glowDraw(this,n,sb,sp,.5);}
 ModifyNPCLoot(loot){try{const t=I(ModItem.getTypeByName('MysteriousCircuitry'),0);if(t>0)loot.Add(ItemDropRule.Common(t,2,1,2));}catch(_){} }
}

export class LuminousCorvina extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/LuminousCorvina';this.GlowTexture=null;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=8;}
 PostSetupContent(){loadGlow(this,'Textures/NPCs/Abyss/LuminousCorvinaGlow.png');}
 SetDefaults(){const n=this.NPC;n.noGravity=true;n.damage=10;n.width=68;n.height=58;n.defense=18;n.lifeMax=800;n.aiStyle=-1;n.value=Terraria.Item.buyPrice(0,0,10,0);n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;n.knockBackResist=.85;n.chaseable=false;n.npcSlots=1;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.swimDir=Math.random()<.5?-1:1;s.swimY=Math.random()<.5?-1:1;s.corvinaHit=false;s.screamTimer=0;}
 SpawnChance(info){return CanSpawnLayer(info,2,this.Type,5,true) ? 0.11:0;}
 SpawnNPC(x,y){return SpawnAquaticNPC(this.Type,x,y,68,58);}
 SetBestiary(db,e){bestiary(e,'Bestiary.LuminousCorvina');}
 PreAI(n){const s=CalamityNPCState.Get(n);if(n.justHit){s.corvinaHit=true;n.chaseable=true;}if(outOfWater(n,s))return false;const p=TargetPlayer(n,false);if(s.corvinaHit&&p&&p.wet&&!p.dead){const q=dist(NPCCenter(n),PlayerCenter(p));s.screamTimer=I(s.screamTimer)+1;const limit=ModeMultiplier()>=2?60:(ModeMultiplier()>1?120:180);if(q.d<700&&s.screamTimer===limit){AndroidSound.PlayExclusive('corvina-scream','Common/Sounds/CorvinaScream.ogg',.9,N(n.Center.X),N(n.Center.Y),1600,120,0,true);addBuff(p,'FishAlert',360);}if(s.screamTimer>=limit+60)s.screamTimer=0;}drift(n,s,.2,.3);const c=NPCCenter(n);try{Terraria.Lighting.AddLight(I(c.x/16),I(c.y/16),.2,.55,.7);}catch(_){}return false;}
 FindFrame(n,h){frame(n,h,8,.12);}
 PostDraw(n,sb,sp){glowDraw(this,n,sb,sp,.75);}
 OnHitPlayer(n,p,src,damage){if(N(damage)>0)addBuff(p,'RiptideDebuff',180);}
 ModifyNPCLoot(loot){try{const t=I(ModItem.getTypeByName('Voidstone'),0);if(t>0)loot.Add(ItemDropRule.Common(t,1,8,15));}catch(_){} }
}

export class Viperfish extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/Viperfish';this.GlowTexture=null;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=4;}
 PostSetupContent(){loadGlow(this,'Textures/NPCs/Abyss/ViperfishGlow.png');}
 SetDefaults(){const n=this.NPC;n.noGravity=true;n.damage=75;n.width=76;n.height=36;n.defense=10;n.lifeMax=400;n.aiStyle=-1;n.value=Terraria.Item.buyPrice(0,0,4,0);n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;n.knockBackResist=.85;n.chaseable=false;n.npcSlots=1;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.swimDir=Math.random()<.5?-1:1;s.swimY=Math.random()<.5?-1:1;}
 SpawnChance(info){if(CanSpawnLayer(info,3,this.Type,7,true))return Terraria.Main.remixWorld===true?13.5:0.275;return CanSpawnLayer(info,2,this.Type,7,true)?0.22:0;}
 SpawnNPC(x,y){return SpawnAquaticNPC(this.Type,x,y,76,36);}
 SetBestiary(db,e){bestiary(e,'Bestiary.Viperfish');}
 PreAI(n){const s=CalamityNPCState.Get(n);passiveSwim(n,s,160,.25,.15,6,6);return false;}
 FindFrame(n,h){if(!n.wet){n.frameCounter=0;return;}frame(n,h,4,n.chaseable?.15:.075);}
 PostDraw(n,sb,sp){glowDraw(this,n,sb,sp,.5);}
 OnHitPlayer(n,p,src,damage){if(N(damage)>0)addBuff(p,'RiptideDebuff',120);}
 ModifyNPCLoot(loot){try{const t=I(ModItem.getTypeByName('DepthCrusher'),0);if(t>0)loot.Add(ItemDropRule.Common(t,10,1,1));}catch(_){} }
}

export class OarfishHead extends ModNPC{
 constructor(){super();this.Texture='NPCs/Abyss/OarfishHead';this.BodyTexture=null;this.TailTexture=null;this.DrawPos=null;this.BodyOrigin=null;this.TailOrigin=null;this.BestiaryRarityStars=3;}
 PostSetupContent(){try{this.BodyTexture=tl.texture.load('Textures/NPCs/Abyss/OarfishBody.png');this.TailTexture=tl.texture.load('Textures/NPCs/Abyss/OarfishTail.png');this.DrawPos=Vector2.new();this.BodyOrigin=Vector2.new(29.5,8);this.TailOrigin=Vector2.new(29.5,8);}catch(_){this.BodyTexture=null;this.TailTexture=null;} }
 SetDefaults(){const n=this.NPC;n.damage=60;n.width=59;n.height=38;n.defense=5;n.lifeMax=4000;n.aiStyle=-1;n.knockBackResist=0;n.value=Terraria.Item.buyPrice(0,0,10,0);n.behindTiles=true;n.noGravity=true;n.noTileCollide=true;n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;n.netAlways=true;n.npcSlots=2;n.chaseable=false;}
 OnSpawn(n){const s=CalamityNPCState.Reset(n);s.detectsPlayer=false;s.patrolX=0;s.patrolY=0;s.wormInit=false;const p=TargetPlayer(n,true);if(p){const c=PlayerCenter(p);s.patrolX=c.x;s.patrolY=c.y;}if(Math.abs(N(n.velocity?.X))+Math.abs(N(n.velocity?.Y))<.1)SetNPCVelocity(n,s,Math.random()<.5?-3:3,0);InitVirtualWorm(n,s,41,16,512);s.wormInit=true;try{tl.log('[CalamityPort SingleWorm] Oarfish uses 1 real NPC + 41 virtual visual segments (40 body + tail).');}catch(_){} }
 SpawnChance(info){if(CountNPC(this.Type)>0)return 0;if(CanSpawnLayer(info,3,this.Type,1,true))return Terraria.Main.remixWorld===true?5.4:0.11;return CanSpawnLayer(info,2,this.Type,1,true)?0.055:0;}
 SpawnNPC(x,y){return SpawnAquaticNPC(this.Type,x,y,59,38);}
 SetBestiary(db,e){bestiary(e,'Bestiary.OarfishHead');}
 PreAI(n){
  const s=CalamityNPCState.Get(n),p=TargetPlayer(n,true);
  if(!p||p.dead)return false;
  const a=NPCCenter(n),pc=PlayerCenter(p),d=dist(a,pc);
  if(n.justHit||d.d<GetAbyssAggroRange(p,160))s.detectsPlayer=true;
  n.chaseable=s.detectsPlayer===true;
  if(d.d>5600){n.active=false;return false;}

  // Calamity's Oarfish intentionally has noTileCollide=true. The bug in the
  // first single-entity pass was the simplified steering: it could accumulate
  // a sideways drift until the head left the world. Keep the official tile
  // phasing, but use the original worm steering math and add a hard world-edge
  // recovery guard for TLPro/mobile.
  const worldW=Math.max(640,N(Terraria.Main.maxTilesX,4200)*16);
  const worldH=Math.max(480,N(Terraria.Main.maxTilesY,1200)*16);
  const edge=96;
  let tx,ty;
  if(s.detectsPlayer){tx=pc.x;ty=pc.y;}
  else{
    if(!N(s.patrolX)&&!N(s.patrolY)){s.patrolX=pc.x;s.patrolY=pc.y;}
    tx=N(s.patrolX);ty=N(s.patrolY)+300;
    if(Math.abs(a.x-tx)<250)tx+=N(n.velocity?.X)>=0?300:-300;
  }

  // Never steer toward an invalid coordinate. If the head reaches the outer
  // safety band, force its target back toward the player/interior immediately.
  tx=Clamp(tx,edge,worldW-edge);
  ty=Clamp(ty,edge,worldH-edge);
  const outside=a.x<edge||a.x>worldW-edge||a.y<edge||a.y>worldH-edge;
  if(outside){
    tx=Clamp(pc.x,edge*2,worldW-edge*2);
    ty=Clamp(pc.y,edge*2,worldH-edge*2);
    s.patrolX=pc.x;s.patrolY=pc.y;
  }

  let speed=s.detectsPlayer?4.5:3;
  let turn=s.detectsPlayer?.075:.05;
  let vx=N(n.velocity?.X),vy=N(n.velocity?.Y);
  let vl=Math.sqrt(vx*vx+vy*vy);
  const maxSpeed=speed*1.3,minSpeed=speed*.7;
  if(vl>0){
    if(vl>maxSpeed){vx=vx/vl*maxSpeed;vy=vy/vl*maxSpeed;}
    else if(vl<minSpeed){vx=vx/vl*minSpeed;vy=vy/vl*minSpeed;}
  }

  // Match the official Oarfish head: snap target/head to tile coordinates,
  // then use the branchy worm steering instead of a generic seek vector.
  let targetX=Math.floor(tx/16)*16-Math.floor(a.x/16)*16;
  let targetY=Math.floor(ty/16)*16-Math.floor(a.y/16)*16;
  const targetDistance=Math.sqrt(targetX*targetX+targetY*targetY);
  if(targetDistance>0.001){
    const scale=speed/targetDistance;
    targetX*=scale;targetY*=scale;
    const absX=Math.abs(targetX),absY=Math.abs(targetY);
    const sameDirection=(vx>0&&targetX>0)||(vx<0&&targetX<0)||(vy>0&&targetY>0)||(vy<0&&targetY<0);
    if(sameDirection){
      if(vx<targetX)vx+=turn;else if(vx>targetX)vx-=turn;
      if(vy<targetY)vy+=turn;else if(vy>targetY)vy-=turn;
      if(Math.abs(targetY)<speed*.2&&((vx>0&&targetX<0)||(vx<0&&targetX>0)))vy+=vy>0?turn*2:-turn*2;
      if(Math.abs(targetX)<speed*.2&&((vy>0&&targetY<0)||(vy<0&&targetY>0)))vx+=vx>0?turn*2:-turn*2;
    }else if(absX>absY){
      if(vx<targetX)vx+=turn*1.1;else if(vx>targetX)vx-=turn*1.1;
      if(Math.abs(vx)+Math.abs(vy)<speed*.5)vy+=vy>0?turn:-turn;
    }else{
      if(vy<targetY)vy+=turn*1.1;else if(vy>targetY)vy-=turn*1.1;
      if(Math.abs(vx)+Math.abs(vy)<speed*.5)vx+=vx>0?turn:-turn;
    }
  }

  // Emergency clamp only if a native update already pushed the head beyond
  // the playable rectangle. This is not part of normal movement and prevents
  // a virtual body from following an invalid off-world head forever.
  const pos=n.position;
  const halfW=N(n.width,59)*.5,halfH=N(n.height,38)*.5;
  if(a.x<24){pos.X=24-halfW;vx=Math.abs(vx)||speed;}
  else if(a.x>worldW-24){pos.X=worldW-24-halfW;vx=-Math.abs(vx||speed);}
  if(a.y<24){pos.Y=24-halfH;vy=Math.abs(vy)||speed;}
  else if(a.y>worldH-24){pos.Y=worldH-24-halfH;vy=-Math.abs(vy||speed);}

  SetNPCVelocity(n,s,vx,vy);
  n.rotation=Math.atan2(vy,vx)+Math.PI*.5;
  n.spriteDirection=vx<0?-1:1;
  n.alpha=Math.max(0,I(n.alpha)-42);
  UpdateVirtualWorm(n,s,41,16,512);
  return false;
 }
 PreDraw(n,sb,screenPos){const s=CalamityNPCState.Get(n),g=GetVirtualWormGeometry(s);if(!g||!this.BodyTexture||!this.TailTexture||!this.DrawPos)return true;try{const draw=sb['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];const alpha=Math.max(0,255-I(n.alpha)),bucket=Math.max(0,Math.min(16,Math.round(alpha/16)));if(!this.WormColorCache)this.WormColorCache=new Array(17);let color=this.WormColorCache[bucket];if(!color){color=Color.new(205,225,235,Math.min(255,bucket*16));this.WormColorCache[bucket]=color;}const scale=N(n.scale,1),sw=I(Terraria.Main.screenWidth,1920),sh=I(Terraria.Main.screenHeight,1080),margin=96;for(let i=g.count-1;i>=0;i--){this.DrawPos.X=N(g.x[i])-N(screenPos.X);this.DrawPos.Y=N(g.y[i])-N(screenPos.Y)+N(n.gfxOffY);if(this.DrawPos.X<-margin||this.DrawPos.X>sw+margin||this.DrawPos.Y<-margin||this.DrawPos.Y>sh+margin)continue;const tail=i===g.count-1;draw(tail?this.TailTexture:this.BodyTexture,this.DrawPos,null,color,N(g.rotation[i]),tail?this.TailOrigin:this.BodyOrigin,scale,SpriteEffects.None,0);} }catch(_){}return true;}
 OnHitPlayer(n,p,src,damage){if(N(damage)>0)addBuff(p,'CrushDepth',120);}
 HitEffect(n,dir){dust(n,5,N(n.life)<=0?10:3,1);}
 OnKill(n){CalamityNPCState.Remove(n);}
}
