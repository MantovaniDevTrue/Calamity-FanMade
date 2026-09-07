import { Terraria } from './../TL/ModImports.js';
import { FusionEntityData } from './FusionEntityData.js';

const SUN_OWNER_SLOTS = 255;
const SunSpiritIndex = new Int32Array(SUN_OWNER_SLOTS);
const SunSpiritType = new Int32Array(SUN_OWNER_SLOTS);
SunSpiritIndex.fill(-1); SunSpiritType.fill(-1);
const AntlionCloudExpiry = new Int32Array(200);

function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Tick(){try{return Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(_){return 0;}}
function ReadProjectile(i){if(i<0||i>=1000)return null;try{return Terraria.Main.projectile.get_Item(i)||null;}catch(_){return null;}}

export function SunSpiritState(p){
    return FusionEntityData.GetProjectileBag(p,'sunSpiritTLPro',()=>({power:1,nextTarget:0,target:null,nextShot:0}));
}
export function RegisterSunSpirit(p){
    const owner=I(p&&p.owner); if(owner<0||owner>=SUN_OWNER_SLOTS)return;
    SunSpiritIndex[owner]=I(p.whoAmI); SunSpiritType[owner]=I(p.type);
    const s=SunSpiritState(p); if(!(Number(s.power)>0))s.power=1;
}
export function UnregisterSunSpirit(p){
    const owner=I(p&&p.owner); if(owner<0||owner>=SUN_OWNER_SLOTS)return;
    if(SunSpiritIndex[owner]===I(p.whoAmI)){SunSpiritIndex[owner]=-1;SunSpiritType[owner]=-1;}
}
export function GetSunSpirit(player){
    if(!player)return null; const owner=I(Terraria.PlayerIndex(player)); if(owner<0||owner>=SUN_OWNER_SLOTS)return null;
    const idx=SunSpiritIndex[owner], type=SunSpiritType[owner], p=ReadProjectile(idx);
    try{if(p&&p.active&&I(p.owner)===owner&&I(p.type)===type)return p;}catch(_){}
    SunSpiritIndex[owner]=-1;SunSpiritType[owner]=-1;return null;
}
export function SunSpiritPower(p){const s=p?SunSpiritState(p):null;return s?Math.max(1,I(s.power,1)):0;}
export function IncreaseSunSpiritPower(p,maxPower){
    if(!p)return false; const s=SunSpiritState(p); const max=Math.max(1,I(maxPower,1)); const old=Math.max(1,I(s.power,1));
    if(old>=max)return false; s.power=old+1; try{p.minionSlots=s.power;p.netUpdate=true;}catch(_){} return true;
}
export function MarkAntlionCloud(npc,duration=30){
    const i=I(npc&&npc.whoAmI); if(i<0||i>=200)return; AntlionCloudExpiry[i]=Math.max(AntlionCloudExpiry[i],Tick()+Math.max(1,I(duration,30)));
}
export function AntlionCloudDamageMultiplier(npc){
    const i=I(npc&&npc.whoAmI); if(i<0||i>=200)return 1; return AntlionCloudExpiry[i]>Tick()?0.9:1;
}
export function ClearAntlionCloud(npc){const i=I(npc&&npc.whoAmI);if(i>=0&&i<200)AntlionCloudExpiry[i]=0;}
