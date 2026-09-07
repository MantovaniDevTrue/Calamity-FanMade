import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModBuff } from './../../TL/ModBuff.js';

const { TileData } = Modules;
const MAX_PLAYERS = 256;
const ACTIVE_MS = 180;
const ACTIVE_HEADER = 0x20;
function Index(player) {
    try { const i=Math.floor(Number(Terraria.PlayerIndex(player))); if(i>=0&&i<MAX_PLAYERS)return i; } catch(e) { }
    const i=Math.floor(Number(player&&player.whoAmI)); return i>=0&&i<MAX_PLAYERS?i:-1;
}
function IsLocal(player) { return Index(player) === Math.floor(Number(Terraria.Main.myPlayer)); }
function HasBuff(player, type) { if(!player||!(type>0))return false; try{return Number(player['int FindBuffIndex(int type)'](Math.floor(type)))>=0;}catch(e){return false;} }
function IsActiveTile(tile) { try{return !!tile&&tile['bool active()']()===true;}catch(e){return false;} }
function IsGrappling(player) {
    // The official condition is player.grappling[0] == -1. On this TLPro build,
    // resolving methods on the native int[] can trigger an expensive member dump.
    // grapCount is an exposed Player field and is equivalent for this check.
    try { return Math.floor(Number(player.grapCount) || 0) > 0; } catch(e) { return false; }
}
function SetPlant(x,y,type,frameX) {
    try {
        const data=new TileData(x,y),tile=data.tile;
        if(!tile)return false;
        tile.type=Math.floor(type); tile.frameX=Math.floor(frameX); tile.frameY=0; tile.liquid=0;
        try{tile['void halfBrick(bool halfBrick)'](false);}catch(e){}
        try{tile['void slope(byte slope)'](0);}catch(e){}
        try{tile['void active(bool active)'](true);}catch(e){data.sHeader=Number(data.sHeader)|ACTIVE_HEADER;}
        return true;
    } catch(e) { return false; }
}
function TryGrow(player) {
    if(!IsLocal(player)||!player||player.dead)return false;
    if(Math.abs(Number(player.velocity?.Y)||0)>0.001||IsGrappling(player))return false;
    const centerX=Number(player.position?.X||0)+(Number(player.width)||20)*0.5;
    const bottomY=Number(player.position?.Y||0)+(Number(player.height)||42);
    const x=Math.floor(centerX/16), y=Math.floor((bottomY-1)/16);
    if(x<2||y<2||x>=Number(Terraria.Main.maxTilesX)-2||y+1>=Number(Terraria.Main.maxTilesY)-2)return false;
    const walk=new TileData(x,y),ground=new TileData(x,y+1);
    if(IsActiveTile(walk.tile)||Number(walk.liquid)>0||!ground.isSolid)return false;
    const groundType=Number(ground.type)||0;
    if(groundType===0){ if(Math.floor(Math.random()*1000)!==0)return false; return SetPlant(x,y,227,Math.random()<0.5?0:34); }
    if(groundType===2)return SetPlant(x,y,3,144);
    if(groundType===109)return SetPlant(x,y,110,144);
    if(groundType===23)return SetPlant(x,y,24,144);
    if(groundType===199)return SetPlant(x,y,201,270);
    if(groundType===70)return SetPlant(x,y,71,Math.floor(Math.random()*5)*18);
    return false;
}

export class FungalSymbiotePlayer extends ModPlayer {
    constructor(){super();this.ActiveUntilMs=new Array(MAX_PLAYERS).fill(0);this.MushyType=0;}
    OnEnterWorld(player){const i=Index(player);if(i>=0)this.ActiveUntilMs[i]=0;}
    OnRespawn(player){const i=Index(player);if(i>=0)this.ActiveUntilMs[i]=0;}
    UpdateDead(player){const i=Index(player);if(i>=0)this.ActiveUntilMs[i]=0;}
    Enable(player){const i=Index(player);if(i<0)return;this.ActiveUntilMs[i]=Date.now()+ACTIVE_MS;TryGrow(player);}
    IsActive(player){const i=Index(player);return i>=0&&Date.now()<=Number(this.ActiveUntilMs[i]||0);}
    ResolveMushy(){if(!(this.MushyType>0))this.MushyType=Number(ModBuff.getTypeByName('Mushy')||0);return this.MushyType;}
    HasMushy(player){return HasBuff(player,this.ResolveMushy());}
    ModifyWeaponDamage(player,item,damage){this.WeaponDamage=this.IsActive(player)&&this.HasMushy(player)?Number(damage)*1.1:Number(damage);}
}
