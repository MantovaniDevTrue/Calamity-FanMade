import { Terraria } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { CanSpawnTier1, SpawnTier1Aquatic, PlayerAt, NPCCenter, PlayerCenter, ApplyIrradiated, AddScaleDrop, RegisterTier1Kill } from './../../../Core/AcidRainTier1NPC.js';
const { FlavorTextBestiaryInfoElement }=Terraria.GameContent.Bestiary;function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
export class Radiator extends ModNPC{
 constructor(){super();this.Texture='NPCs/AcidRain/Radiator';this.BestiaryRarityStars=1;}
 SetStaticDefaults(){Terraria.Main.npcFrameCount[this.Type]=4;}
 SetDefaults(){const n=this.NPC;n.aiStyle=67;n.damage=10;n.width=24;n.height=24;n.defense=5;n.lifeMax=50;n.knockBackResist=.8;n.value=Terraria.Item.buyPrice(0,0,1,0);n.lavaImmune=false;n.noGravity=false;n.noTileCollide=false;n.npcSlots=.65;n.HitSound=Terraria.ID.SoundID.NPCHit1;n.DeathSound=Terraria.ID.SoundID.NPCDeath1;}
 SetBestiary(db,entry){try{const t=FlavorTextBestiaryInfoElement.new();t._key=ModLocalization.Translate('Bestiary.Radiator');entry.Info.Add(t);}catch(e){}}
 SpawnChance(info){return CanSpawnTier1(info,true)?1:0;}
 SpawnNPC(x,y){return SpawnTier1Aquatic(this.Type,x,y,24,24);}
 OnSpawn(npc){const s=CalamityNPCState.Reset(npc);s.auraTick=0;}
 AI(npc){const s=CalamityNPCState.Get(npc);s.auraTick=N(s.auraTick)+1;if(s.auraTick<30)return;s.auraTick=0;const p=PlayerAt(Terraria.Main.myPlayer);if(!p||!p.active||p.dead)return;const a=NPCCenter(npc),b=PlayerCenter(p),dx=b.x-a.x,dy=b.y-a.y;if(dx*dx+dy*dy<40000){ApplyIrradiated(p,20);try{p['void AddBuff(int type, int time, bool fromNetPvP)'](20,16,false);}catch(e){}}}
 FindFrame(npc,h){npc.frameCounter=N(npc.frameCounter)+1;if(npc.frameCounter>8){npc.frameCounter=0;const r=npc.frame;r.Y=N(r.Y)+h;if(r.Y>h*2)r.Y=0;npc.frame=r;}}
 ModifyNPCLoot(loot){AddScaleDrop(loot);try{loot.Add(Terraria.GameContent.ItemDropRules.ItemDropRule.NormalvsExpert(887,100,50));}catch(e){try{loot.Add(Terraria.GameContent.ItemDropRules.ItemDropRule.Common(887,100,1,1));}catch(_){}}}
 OnKill(npc){RegisterTier1Kill();CalamityNPCState.Remove(npc);}
}
