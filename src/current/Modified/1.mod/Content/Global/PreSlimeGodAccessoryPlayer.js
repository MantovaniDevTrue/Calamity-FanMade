import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { ModItem } from './../../TL/ModItem.js';
import { IsStealthStrike, IsRogueItem } from './../../Core/RogueRuntime.js';
import { FusionEntityData } from './../../Core/FusionEntityData.js';

const { Vector2 } = Modules;
const MAX_PLAYERS = 256;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let StaticDischarge=0, BrainRot=0, BurningBlood=0, Crumbling=0, MarniteHitbox=0, IlmerisSparkProj=0, JewelSpike=0, EnergyOrb=0, AmuletEnergy=0, PinkAura=0, BlueAura=0, LifeJellyItem=0, CleansingJellyItem=0;
function Buff(name){ let v=0; if(name==='StaticDischarge')v=StaticDischarge;else if(name==='BrainRot')v=BrainRot;else if(name==='BurningBlood')v=BurningBlood;else if(name==='Crumbling')v=Crumbling;if(!(v>0))v=Number(ModBuff.getTypeByName(name)||0);if(name==='StaticDischarge')StaticDischarge=v;else if(name==='BrainRot')BrainRot=v;else if(name==='BurningBlood')BurningBlood=v;else if(name==='Crumbling')Crumbling=v;return v; }
function Proj(name){ let v=0; if(name==='MarniteRepulsionHitbox')v=MarniteHitbox;else if(name==='IlmerisElectricSpark')v=IlmerisSparkProj;else if(name==='JewelSpike')v=JewelSpike;else if(name==='EnergyOrb')v=EnergyOrb;else if(name==='AmuletEnergy')v=AmuletEnergy;else if(name==='PinkJellyAuraTL')v=PinkAura;else if(name==='BlueJellyAuraTL')v=BlueAura;if(!(v>0))v=Number(ModProjectile.getTypeByName(name)||0);if(name==='MarniteRepulsionHitbox')MarniteHitbox=v;else if(name==='IlmerisElectricSpark')IlmerisSparkProj=v;else if(name==='JewelSpike')JewelSpike=v;else if(name==='EnergyOrb')EnergyOrb=v;else if(name==='AmuletEnergy')AmuletEnergy=v;else if(name==='PinkJellyAuraTL')PinkAura=v;else if(name==='BlueJellyAuraTL')BlueAura=v;return v; }
function Id(player){try{const i=Math.floor(Number(Terraria.PlayerIndex(player)));if(i>=0&&i<MAX_PLAYERS)return i;}catch(_){}try{const i=Math.floor(Number(player.whoAmI));if(i>=0&&i<MAX_PLAYERS)return i;}catch(_){}return -1;}
function Center(player){try{return Terraria.PlayerCenter(player);}catch(_){}return Vector2.new(Number(player.position.X)+Number(player.width)*.5,Number(player.position.Y)+Number(player.height)*.5);}
function Velocity(player){try{return Terraria.PlayerVelocity(player);}catch(_){}return player.velocity;}
function Source(){try{return null;}catch(_){return null;}}
function NativeGet(arr,i,def=0){if(!arr)return def;try{const v=arr.get_Item(Math.floor(Number(i)));return v===undefined||v===null?def:v;}catch(_){}try{const fn=arr['Object GetValue(int index)'];if(typeof fn==='function'){const v=fn(Math.floor(Number(i)));return v===undefined||v===null?def:v;}}catch(_){}return def;}
function NativeSet(arr,i,v){if(!arr)return false;try{arr.set_Item(Math.floor(Number(i)),v);return true;}catch(_){}try{const fn=arr['void SetValue(Object value, int index)'];if(typeof fn==='function'){fn(v,Math.floor(Number(i)));return true;}}catch(_){}return false;}
function ProjectileAt(i){if(!(i>=0))return null;try{return Terraria.Main.projectile.get_Item(Math.floor(Number(i)));}catch(_){}return null;}
function BestClass(player){let m=1;try{m=Math.max(m,Number(player.meleeDamage)||1);}catch(_){}try{m=Math.max(m,Number(player.rangedDamage)||1);}catch(_){}try{m=Math.max(m,Number(player.magicDamage)||1);}catch(_){}try{m=Math.max(m,Number(player.minionDamage)||1);}catch(_){}const r=ModPlayer.getByName('CalamityPlayerState');if(r)m=Math.max(m,1+Math.max(0,Number(r.RogueDamageBonus)||0));return m;}
function DistSq(a,b){const dx=Number(a.X)-Number(b.X),dy=Number(a.Y)-Number(b.Y);return dx*dx+dy*dy;}
function IsMinion(p){if(!p)return false;try{if(p.minion===true||p.sentry===true)return true;}catch(_){}const type=Math.floor(Number(p.type)||0);try{if(NativeGet(Terraria.ID.ProjectileID.Sets.MinionShot,type,false)===true)return true;}catch(_){}try{if(NativeGet(Terraria.ID.ProjectileID.Sets.SentryShot,type,false)===true)return true;}catch(_){}return false;}
function IsDashing(player){try{if(Number(player.timeSinceLastDashStarted)===1)return true;}catch(_){}try{if(Number(player.dashDelay)===-1&&Math.abs(Number(Velocity(player).X))>5.5)return true;}catch(_){}return false;}
function AddAllDamage(player,amount){try{player.meleeDamage=Number(player.meleeDamage||1)+amount;}catch(_){}try{player.rangedDamage=Number(player.rangedDamage||1)+amount;}catch(_){}try{player.magicDamage=Number(player.magicDamage||1)+amount;}catch(_){}try{player.minionDamage=Number(player.minionDamage||1)+amount;}catch(_){}const r=ModPlayer.getByName('CalamityPlayerState');if(r)r.RogueDamageBonus=Number(r.RogueDamageBonus||0)+amount;}
function AddAllCrit(player,amount){try{player.meleeCrit=Number(player.meleeCrit||0)+amount;}catch(_){}try{player.rangedCrit=Number(player.rangedCrit||0)+amount;}catch(_){}try{player.magicCrit=Number(player.magicCrit||0)+amount;}catch(_){}const r=ModPlayer.getByName('CalamityPlayerState');if(r)r.RogueCritBonus=Number(r.RogueCritBonus||0)+amount;}
function SetBuffImmune(player,type){if(!(type>0))return;try{NativeSet(player.buffImmune,type,true);}catch(_){} }
function ClearDebuffs(player){let cleared=0,len=44;try{len=Math.max(1,Number(player.buffType.Length)||44);}catch(_){}for(let x=len-1;x>=0;x--){const t=Number(NativeGet(player.buffType,x,0))||0;if(!(t>0))continue;let deb=false;try{deb=NativeGet(Terraria.Main.debuff,t,false)===true;}catch(_){}if(!deb)continue;try{player.ClearBuff(t);cleared++;}catch(_){}}return cleared;}
function ArmorType(player,slot){try{const item=NativeGet(player.armor,slot,null);return item?Number(item.type)||0:0;}catch(_){return 0;}}
function AccessoryType(name){let v=name==='LifeJelly'?LifeJellyItem:CleansingJellyItem;if(!(v>0))v=Number(ModItem.getTypeByName(name)||0);if(name==='LifeJelly')LifeJellyItem=v;else CleansingJellyItem=v;return v;}
function HasEquippedAccessory(player,name){const t=AccessoryType(name);if(!(t>0))return false;let len=20;try{len=Math.max(1,Math.floor(Number(player.armor.Length)||20));}catch(_){}for(let slot=0;slot<len;slot++){const it=NativeGet(player.armor,slot,null);if(it&&Number(it.type)===t)return true;}return false;}
function VictideSet(player){const body=Number(ModItem.getTypeByName('VictideBreastplate')||0),legs=Number(ModItem.getTypeByName('VictideGreaves')||0);if(!(body>0&&legs>0))return false;const h=ArmorType(player,0),b=ArmorType(player,1),l=ArmorType(player,2);if(b!==body||l!==legs)return false;for(const n of ['VictideHeadMagic','VictideHeadSummon','VictideHeadMelee','VictideHeadRanged','VictideHeadRogue'])if(h===Number(ModItem.getTypeByName(n)||-1))return true;return false;}

export class PreSlimeGodAccessoryPlayer extends ModPlayer {
    constructor(){
        super();
        this.Flags=Array.from({length:MAX_PLAYERS},()=>Object.create(null)); this.Visible=Array.from({length:MAX_PLAYERS},()=>Object.create(null));
        this.CounterCooldown=new Array(MAX_PLAYERS).fill(0); this.GiantPostHit=new Array(MAX_PLAYERS).fill(0); this.FishPower=new Array(MAX_PLAYERS).fill(0); this.FishTimer=new Array(MAX_PLAYERS).fill(0);
        this.RaiderTimer=new Array(MAX_PLAYERS).fill(0); this.SandVeil=new Array(MAX_PLAYERS).fill(0); this.SandCooldown=new Array(MAX_PLAYERS).fill(0); this.SpiritTimer=new Array(MAX_PLAYERS).fill(0); this.SpiritMode=new Array(MAX_PLAYERS).fill(0);
        this.BeeCooldown=new Array(MAX_PLAYERS).fill(0); this.BeePending=new Array(MAX_PLAYERS).fill(false); this.JellyBatteryCooldown=new Array(MAX_PLAYERS).fill(0);
        this.CleanseAura=new Array(MAX_PLAYERS).fill(0); this.CleanseAvailable=new Array(MAX_PLAYERS).fill(false); this.CleanseX=new Array(MAX_PLAYERS).fill(0); this.CleanseY=new Array(MAX_PLAYERS).fill(0);
        this.LifeAura=new Array(MAX_PLAYERS).fill(0); this.LifeX=new Array(MAX_PLAYERS).fill(0); this.LifeY=new Array(MAX_PLAYERS).fill(0); this.LastHealTick=new Array(MAX_PLAYERS).fill(-9999);
        this.MarniteIndex=new Array(MAX_PLAYERS).fill(-1); this.LastDashState=new Array(MAX_PLAYERS).fill(false); this.JumpLatch=new Array(MAX_PLAYERS).fill(false); this.SpringCooldown=new Array(MAX_PLAYERS).fill(0);
        this.SeaTimer=new Array(MAX_PLAYERS).fill(0); this.SeaOrbs=Array.from({length:MAX_PLAYERS},()=>[]);
    }
    ResetPersistent(player){const i=Id(player);if(i<0)return;this.Flags[i]=Object.create(null);this.Visible[i]=Object.create(null);this.CounterCooldown[i]=0;this.GiantPostHit[i]=0;this.FishPower[i]=0;this.FishTimer[i]=0;this.RaiderTimer[i]=0;this.SandVeil[i]=0;this.SandCooldown[i]=0;this.SpiritTimer[i]=0;this.SpiritMode[i]=0;this.BeeCooldown[i]=0;this.BeePending[i]=false;this.JellyBatteryCooldown[i]=0;this.CleanseAura[i]=0;this.CleanseAvailable[i]=false;this.LifeAura[i]=0;this.MarniteIndex[i]=-1;this.LastDashState[i]=false;this.JumpLatch[i]=false;this.SpringCooldown[i]=0;this.SeaTimer[i]=0;this.SeaOrbs[i]=[];}
    OnEnterWorld(player){this.ResetPersistent(player);} OnRespawn(player){this.ResetPersistent(player);} UpdateDead(player){this.ResetPersistent(player);}
    ResetEffects(player){const i=Id(player);if(i<0)return;this.Flags[i]=Object.create(null);this.Visible[i]=Object.create(null);}
    Enable(player,name,visible=true){const i=Id(player);if(i<0)return;this.Flags[i][name]=true;this.Visible[i][name]=visible===true;}
    Has(player,name){const i=Id(player);return i>=0&&this.Flags[i][name]===true;}
    ApplyFishStocks(player){const i=Id(player);if(i<0)return;let p=Math.max(-2,Math.min(2,Number(this.FishPower[i])||0));if(++this.FishTimer[i]>=60){this.FishTimer[i]=0;const extreme=Math.abs(p)>1.5,small=Math.random()<.25?.55:0,big=Math.random()<(extreme?1/7:1/10)?1.8:0,dir=Math.random()<.5?-1:1;p=Math.max(-2,Math.min(2,p+(.1+Math.random()*.1+Math.max(small,big))*dir));this.FishPower[i]=p;}AddAllDamage(player,.15*p);AddAllCrit(player,10*p);player.statDefense=Number(player.statDefense||0)+Math.trunc(10*p);player.endurance=Number(player.endurance||0)+.1*p;player.lifeRegen=Number(player.lifeRegen||0)+Math.trunc(6*p);player.pickSpeed=Number(player.pickSpeed||1)-.25*p;player.fishingSkill=Number(player.fishingSkill||0)+Math.trunc(50*p);player.luck=Number(player.luck||0)+.55*p;}
    UpdateEquips(player){
        const i=Id(player);if(i<0)return;
        if(this.Flags[i].ArchaicPowder)player.pickSpeed=Math.max(.1,Number(player.pickSpeed||1)-.25);else if(this.Flags[i].AncientFossil)player.pickSpeed=Math.max(.1,Number(player.pickSpeed||1)-.10);
        if(this.Flags[i].ShieldoftheOcean){if(player.wet===true)player.statDefense=Number(player.statDefense||0)+5;if(VictideSet(player)){player.moveSpeed=Number(player.moveSpeed||0)+.10;player.lifeRegen=Number(player.lifeRegen||0)+2;}}
        if(this.SandVeil[i]>0){player.statDefense=Number(player.statDefense||0)+3;try{player.runAcceleration=Number(player.runAcceleration||.08)*1.75;}catch(_){} }
        if(this.SpiritTimer[i]>0){if(this.SpiritMode[i]===1)player.minionDamage=Number(player.minionDamage||1)+.10;else if(this.SpiritMode[i]===2)player.statDefense=Number(player.statDefense||0)+2;else if(this.SpiritMode[i]===3)player.lifeRegen=Number(player.lifeRegen||0)+1;}
        if(this.Flags[i].TheBee&&Number(player.statLife)>=Number(player.statLifeMax2)){AddAllDamage(player,Math.max(0,Number(player.endurance||0))/2);}
        if(this.Flags[i].UnholyTonic)SetBuffImmune(player,Buff('BrainRot'));if(this.Flags[i].ViciousTonic)SetBuffImmune(player,Buff('BurningBlood'));
        if(this.Flags[i].RadiantOoze&&this.Visible[i].RadiantOoze){try{const c=Center(player);Terraria.Lighting.AddLight(c,1,1,.6);}catch(_){} }
    }
    UpdateLifeRegen(player){const i=Id(player);if(i<0)return;if(this.Flags[i].RadiantOoze){const max=Math.max(1,Number(player.statLifeMax2)||1),ratio=Math.max(0,Math.min(1,Number(player.statLife)/max)),boost=Math.round(5+(1-5)*ratio);player.lifeRegen=Number(player.lifeRegen||0)+boost;}if(this.LifeAura[i]>0){const c=Center(player),a=Vector2.new(this.LifeX[i],this.LifeY[i]);if(DistSq(c,a)<165*165)player.lifeRegen=Number(player.lifeRegen||0)+4;}}
    ModifyWeaponCrit(player,item,crit){const i=Id(player);this.WeaponCrit=Number(crit);if(i>=0&&this.RaiderTimer[i]>0&&IsRogueItem(item))this.WeaponCrit+=15;}
    FreeDodge(player,damageSource,damage,hitDirection,pvp,quiet,crit,cooldownCounter,dodgeable){const i=Id(player);if(i<0||!this.Flags[i].CounterScarf||this.CounterCooldown[i]>0)return false;if(IsDashing(player)){this.CounterCooldown[i]=1800;try{player.immune=true;player.immuneTime=Math.max(30,Number(player.immuneTime)||0);}catch(_){}return true;}return false;}
    ModifyHurt(player,modifiers){const i=Id(player);if(i<0)return;if(this.Flags[i].TheBee&&this.BeeCooldown[i]<=0&&Number(player.statLife)>=Number(player.statLifeMax2)){const d=Math.max(1,Math.floor(Number(modifiers.damage)||0));modifiers.damage=Math.max(1,Math.floor(d*.5));this.BeePending[i]=true;}}
    OnHurt(player,damageSource,damage,hitDirection,pvp,quiet,crit,cooldownCounter,dodgeable){const i=Id(player);if(i<0||!(Number(damage)>0))return;if(this.Flags[i].GiantShell)this.GiantPostHit[i]=180;if(this.BeePending[i]){this.BeePending[i]=false;this.BeeCooldown[i]=360;}if(this.Flags[i].IlmerisSpark)this.SpawnIlmeris(player);}
    SpawnIlmeris(player){
        const t=Proj('IlmerisElectricSpark'),i=Id(player);if(!(t>0&&i>=0))return;
        const c=Center(player),dmg=Math.max(1,Math.floor(6*BestClass(player))),vel=Terraria.PlayerVelocity(player);
        const spread=45*.0174,start=Math.atan2(Number(vel.X)||0,Number(vel.Y)||0)-spread/2,delta=spread/8;
        for(let n=0;n<4;n++){
            const a=start+delta*(n+n*n)/2+32*n,sx=Math.sin(a)*5,sy=Math.cos(a)*5;
            try{NewProjectile(Source(),c,Vector2.new(sx,sy),t,dmg,1.25,i,0,1,0,null);}catch(_){}
            try{NewProjectile(Source(),c,Vector2.new(-sx,-sy),t,dmg,1.25,i,0,1,0,null);}catch(_){}
        }
    }
    OnHitNPCWithProj(player,npc,p){const i=Id(player);if(i<0||!npc||!p)return;const minion=IsMinion(p);if(minion){if(this.Flags[i].VoltaicJelly&&Math.random()<.2){const b=Buff('StaticDischarge');if(b>0)try{npc.AddBuff(b,60,false);}catch(_){}}if(this.Flags[i].SpiritGlyph){this.SpiritMode[i]=1+Math.floor(Math.random()*3);this.SpiritTimer[i]=120;}if(this.Flags[i].JellyChargedBattery&&this.JellyBatteryCooldown[i]<=0&&Number(p.type)!==Proj('EnergyOrb')){this.SpawnEnergyOrb(player,p);this.JellyBatteryCooldown[i]=60;}}
        if(IsStealthStrike(p)){if(this.Flags[i].RaidersTalisman)this.RaiderTimer[i]=600;if(this.Flags[i].RottenDogtooth){const cr=Buff('Crumbling');try{npc.AddBuff(cr>0?cr:Terraria.ID.BuffID.Ichor,150,false);}catch(_){}}if(this.Flags[i].ScuttlersJewel&&Number(p.type)!==Proj('JewelSpike'))this.SpawnJewel(player,npc);}
    }
    SpawnEnergyOrb(player,p){const t=Proj('EnergyOrb'),i=Id(player);if(!(t>0&&i>=0))return;let c=Center(player);try{const fn=p&&p['Rectangle getRect()'];if(typeof fn==='function'){const r=fn();if(r)c=Vector2.new(Number(r.X)+Number(r.Width)*.5,Number(r.Y)+Number(r.Height)*.5);}}catch(_){}const dmg=Math.max(1,Math.floor(15*Math.max(1,Number(player.minionDamage)||1)));const a=Math.random()*Math.PI*2;try{NewProjectile(Source(),c,Vector2.new(Math.cos(a)*4,Math.sin(a)*4),t,dmg,0,i,0,0,0,null);}catch(_){} }
    SpawnJewel(player,npc){const t=Proj('JewelSpike'),i=Id(player);if(!(t>0&&i>=0))return;let c=null;try{c=Terraria.NPCCenter(npc);}catch(_){c=Vector2.new(Number(npc.position.X)+Number(npc.width)*.5,Number(npc.position.Y)+Number(npc.height)*.5);}const dmg=Math.max(1,Math.floor(16*(1+Math.max(0,Number(ModPlayer.getByName('CalamityPlayerState')?.RogueDamageBonus)||0))));try{NewProjectile(Source(),c,Vector2.Zero,t,dmg,0,i,0,0,0,null);}catch(_){} }
    SpawnJellyAura(player,name,item){
        const i=Id(player),t=Proj(name);if(i<0||!(t>0))return -1;
        const c=Center(player);let source=Source();
        try{source=player.GetProjectileSource_Item(item)||source;}catch(_){}
        try{if(!source)source=player.GetSource_ItemUse(item);}catch(_){}
        try{
            // Keep the aura on TLPro's native projectile renderer. A tiny controller
            // hitbox avoids the expensive custom draw path, and its position is never
            // rewritten every frame because that can make modded projectiles disappear.
            const spawnPos=Vector2.new(Number(c.X)-1,Number(c.Y)-1);
            return NewProjectile(source,spawnPos,Vector2.Zero,t,0,0,i,0,0,0,null);
        }catch(_){return -1;}
    }
    TriggerJellyAura(player,item,forcedHeal=0){
        let heal=Number(forcedHeal)||0;if(!(heal>0)){try{heal=Number(item.healLife)||0;}catch(_){}}if(!(heal>0))return;
        const i=Id(player);if(i<0)return;let tick=0;try{tick=Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(_){}
        if(tick===this.LastHealTick[i])return;this.LastHealTick[i]=tick;
        const c=Center(player);
        // UpdateAccessory normally set the flags before ItemCheck, but Android/TLPro
        // can reorder some item-use callbacks. Confirm the equipped item directly as
        // a fallback so vanilla healing potions always trigger the Calamity aura.
        const cleansing=this.Flags[i].CleansingJelly||HasEquippedAccessory(player,'CleansingJelly');
        const life=this.Flags[i].LifeJelly||HasEquippedAccessory(player,'LifeJelly');
        if(cleansing){this.CleanseAura[i]=1800;this.CleanseAvailable[i]=true;this.CleanseX[i]=Number(c.X);this.CleanseY[i]=Number(c.Y);this.SpawnJellyAura(player,'BlueJellyAuraTL',item);}
        if(life){this.LifeAura[i]=1800;this.LifeX[i]=Number(c.X);this.LifeY[i]=Number(c.Y);this.SpawnJellyAura(player,'PinkJellyAuraTL',item);}
    }
    // TLPro only forwards OnConsumeItem for many modded consumables. Vanilla healing
    // potions use Terraria's native consume path, but UseItem is still called at the
    // real start of the use. Catch both paths and deduplicate them by GameUpdateCount.
    UseItem(player,item){this.TriggerJellyAura(player,item);return true;}
    OnConsumeItem(player,item){this.TriggerJellyAura(player,item);}
    // ApplyLifeAndOrMana is the most reliable path for vanilla healing items on Android.
    // GetHealLife is invoked from that native hook, so it is the final authoritative
    // trigger for the jelly auras; UseItem/OnConsumeItem remain as fast-path fallbacks.
    GetHealLife(player,item,healValue){const h=Number(healValue)||0;if(h>0)this.TriggerJellyAura(player,item,h);return healValue;}
    PostUpdate(player){const i=Id(player);if(i<0)return;for(const arr of [this.CounterCooldown,this.GiantPostHit,this.RaiderTimer,this.SandVeil,this.SandCooldown,this.SpiritTimer,this.BeeCooldown,this.JellyBatteryCooldown,this.CleanseAura,this.LifeAura,this.SpringCooldown])if(arr[i]>0)arr[i]--;
        const dash=IsDashing(player);if(dash&&!this.LastDashState[i]){if(this.Flags[i].GiantShell&&this.GiantPostHit[i]<=0){const v=Velocity(player);player.velocity=Vector2.new(Number(v.X)*.9,Number(v.Y));}if(this.Flags[i].SandCloak){if(this.SandVeil[i]>0){this.SandVeil[i]=0;this.SandCooldown[i]=900;}else if(this.SandCooldown[i]<=0)this.SandVeil[i]=900;}if(this.Flags[i].SeaSpiritAmulet)this.ReleaseSeaOrbs(player);}this.LastDashState[i]=dash;
        if(this.CleanseAura[i]>0&&this.CleanseAvailable[i]){const c=Center(player),a=Vector2.new(this.CleanseX[i],this.CleanseY[i]);if(DistSq(c,a)<165*165&&ClearDebuffs(player)>0)this.CleanseAvailable[i]=false;}
        this.UpdateMarnite(player);this.UpdateSeaSpirit(player);this.UpdateSpring(player);
    }
    UpdateMarnite(player){const i=Id(player);if(i<0)return;let p=ProjectileAt(this.MarniteIndex[i]);if(!this.Flags[i].MarniteRepulsionShield){if(p&&p.active&&Number(p.type)===Proj('MarniteRepulsionHitbox'))p.active=false;this.MarniteIndex[i]=-1;return;}if(p&&p.active&&Number(p.type)===Proj('MarniteRepulsionHitbox')&&Number(p.owner)===i)return;const t=Proj('MarniteRepulsionHitbox');if(!(t>0))return;try{this.MarniteIndex[i]=NewProjectile(Source(),Center(player),Vector2.Zero,t,5,12,i,0,0,0,null);}catch(_){} }
    UpdateSpring(player){const i=Id(player);if(i<0)return;const jump=player.controlJump===true,up=player.controlUp===true;let grounded=false;try{grounded=Math.abs(Number(Velocity(player).Y))<.01;}catch(_){}if(this.Flags[i].SpringStool&&jump&&!this.JumpLatch[i]&&up&&grounded&&this.SpringCooldown[i]<=0){const v=Velocity(player),g=Number(player.gravDir)||1;player.velocity=Vector2.new(Number(v.X),-20*g);this.SpringCooldown[i]=1200;try{player.jump=0;}catch(_){}}this.JumpLatch[i]=jump;}
    UpdateSeaSpirit(player){const i=Id(player);if(i<0)return;const list=this.SeaOrbs[i];for(let x=list.length-1;x>=0;x--){const p=ProjectileAt(list[x]);if(!p||!p.active||Number(p.type)!==Proj('AmuletEnergy')||Number(p.owner)!==i)list.splice(x,1);}if(!this.Flags[i].SeaSpiritAmulet)return;if(++this.SeaTimer[i]<75||list.length>=8)return;this.SeaTimer[i]=0;const t=Proj('AmuletEnergy');if(!(t>0))return;const a=Math.random()*Math.PI*2;try{const idx=NewProjectile(Source(),Center(player),Vector2.new(Math.cos(a)*3,Math.sin(a)*3),t,12,0,i,list.length,0,0,null);if(idx>=0)list.push(idx);}catch(_){} }
    ReleaseSeaOrbs(player){const i=Id(player);if(i<0)return;for(const idx of this.SeaOrbs[i]){const p=ProjectileAt(idx);if(p&&p.active&&Number(p.type)===Proj('AmuletEnergy')){try{const st=FusionEntityData.GetProjectileBag(p,'amuletEnergy',()=>({slot:0,mode:0,time:0,target:-1}));st.mode=5;st.time=0;p.netUpdate=true;}catch(_){}}}this.SeaTimer[i]=-225;}
}
