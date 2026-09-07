import { Terraria, Modules } from './../TL/ModImports.js';
import { ModItem } from './../TL/ModItem.js';
import { ModNPC } from './../TL/ModNPC.js';
import { ModBuff } from './../TL/ModBuff.js';
import { AcidRainTier1Runtime } from './AcidRainTier1Runtime.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './SulphurousSeaTerrainRuntime.js';
import { SpawnAquaticNPC } from './SulphurousSeaEcologyRuntime.js';

const { TileData } = Modules;
let CachedIrradiatedType = 0;
let CachedEventTypes = null;
let CachedEventCountTick = -999999;
let CachedEventCount = 0;
const MAX_ACTIVE_TIER1 = 6;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
export function PlayerAt(index){try{return Terraria.Main.player.get_Item(I(index));}catch(e){return null;}}
export function ProjectileAt(index){try{return Terraria.Main.projectile.get_Item(I(index));}catch(e){return null;}}
export function NPCCenter(npc){return{x:N(npc?.position?.X)+N(npc?.width)*0.5,y:N(npc?.position?.Y)+N(npc?.height)*0.5};}
export function PlayerCenter(player){try{return{x:N(Terraria.PlayerCenterX(player)),y:N(Terraria.PlayerCenterY(player))};}catch(e){return{x:0,y:0};}}
export function TargetPlayer(npc){if(!npc)return null;try{if(I(Terraria.Main.netMode,0)===0){const p=Terraria.Main.LocalPlayer;if(p&&p.active&&!p.dead){const my=I(Terraria.Main.myPlayer,0);if(I(npc.target,-1)!==my)npc.target=my;return p;}}let i=I(npc.target,-1);if(i<0||i>=255){npc.TargetClosest(false);i=I(npc.target,-1);}let p=PlayerAt(i);if(!p||!p.active||p.dead){npc.TargetClosest(false);p=PlayerAt(npc.target);}return p;}catch(e){return null;}}
export function WaterAtSpawn(info){if(info?.Water===true)return true;try{const x=I(info.SpawnTileX),y=I(info.SpawnTileY);for(let o=-4;o<=1;o++){const t=Terraria.Main.tile.get_Item(x,y+o);if(t&&N(t.liquid)>=160)return true;}}catch(e){}return false;}
function ActiveTier1Count(){
    let tick=0;try{tick=I(Terraria.Main.GameUpdateCount,0);}catch(e){}
    if(tick>=CachedEventCountTick&&tick-CachedEventCountTick<20)return CachedEventCount;
    CachedEventCountTick=tick;
    if(!CachedEventTypes){
        CachedEventTypes=[
            I(ModNPC.getTypeByName('AcidEel'),0),
            I(ModNPC.getTypeByName('NuclearToad'),0),
            I(ModNPC.getTypeByName('Radiator'),0),
            I(ModNPC.getTypeByName('Skyfin'),0)
        ];
    }
    let total=0;
    for(const type of CachedEventTypes){
        if(type<=0)continue;
        try{total+=Math.max(0,I(Terraria.NPC.CountNPCS(type),0));}catch(e){}
    }
    CachedEventCount=total;
    return total;
}
let FirstAcceptedSpawnLogged=false;
export function CanSpawnTier1(info,waterRequired=false){
    if(!info||!info.Player)return false;
    if(AcidRainTier1Runtime.Active!==true)return false;
    if(ActiveTier1Count()>=MAX_ACTIVE_TIER1)return false;

    // Acid Rain is an invasion-style event. Unlike ordinary ambient enemies it
    // must not be suppressed by town safety/friendly walls once the event is
    // already active. The event start routine itself prevents overlap with
    // vanilla invasions/events.
    try{
        if(!SulphurousSeaPreviewRuntime.IsCoastalArea()||
           !SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))
            return false;
    }catch(_){return false;}

    // Do not reject aquatic Acid Rain NPCs here. TLPro's vanilla candidate
    // is usually a floor/ledge coordinate even when the ocean is nearby.
    // Acid Eel, Radiator and Skyfin already correct that coordinate exactly
    // once, inside SpawnNPC(), through SpawnAquaticNPC().
    if(!FirstAcceptedSpawnLogged){
        FirstAcceptedSpawnLogged=true;
        try{
            tl.log(`[CalamityPort AcidRainSpawnGate] candidate accepted; waterRequired=${waterRequired}; active=${AcidRainTier1Runtime.Active===true}; activeTier1=${ActiveTier1Count()}.`);
        }catch(_){}
    }
    return true;
}
export function ApplyIrradiated(target,ticks=120){if(!target)return;if(!(CachedIrradiatedType>0))CachedIrradiatedType=N(ModBuff.getTypeByName('Irradiated'),0);const b=CachedIrradiatedType;if(b>0)try{target['void AddBuff(int type, int time, bool fromNetPvP)'](b,I(ticks,120),true);}catch(e){}}
export function AddScaleDrop(loot){const scale=N(ModItem.getTypeByName('SulphuricScale'),0);if(scale>0)loot.Add(ItemDropRule.Common(scale,1,1,2));}
const LoggedAquaticSpawnTypes=new Set();
export function SpawnTier1Aquatic(type,x,y,w,h){
    const idx=SpawnAquaticNPC(type,x,y,w,h);
    const id=I(type,0);
    if(!LoggedAquaticSpawnTypes.has(id)){
        LoggedAquaticSpawnTypes.add(id);
        try{
            let active=false,actual=-1;
            const n=Terraria.Main.npc.get_Item(I(idx,-1));
            if(n){active=n.active===true;actual=I(n.type,-1);}
            tl.log(`[CalamityPort AcidRainAquaticSpawn] type=${id}; index=${I(idx,-1)}; active=${active}; actualType=${actual}.`);
        }catch(_){}
    }
    return idx;
}
export function RegisterTier1Kill(){AcidRainTier1Runtime.OnEnemyKill(1);}
