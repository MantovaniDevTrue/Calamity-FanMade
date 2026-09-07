import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { FillChestByIndex, GetChestByIndex } from './OfficialSchematicRuntime.js';

const HIVE_TILE = 225;
const HONEY_BLOCK = 229;
const LARVA_TILE = 231;
const CHEST_TILE = 21;
const HIVE_WALL = 86;
const HONEY_LIQUID = 2;
const MAX_SEARCH_ATTEMPTS = 128;
const PLAN_MARGIN = 150;
const PlaceChest = Terraria.WorldGen['int PlaceChest(int x, int y, ushort type, bool notNearOtherChests, int style)'];
const PlaceTile = Terraria.WorldGen['bool PlaceTile(int i, int j, int Type, bool mute, bool forced, int plr, int style)'];

function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function I(v,f=0){return Math.floor(N(v,f));}
function Clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function Log(s){try{tl.log(`[CalamityPort GiantHive] ${s}`);}catch(e){}}
function InWorld(x,y,margin=8){return x>=margin&&y>=margin&&x<I(Terraria.Main.maxTilesX)-margin&&y<I(Terraria.Main.maxTilesY)-margin;}
function Active(t){try{return t&&t['bool active()']()===true;}catch(e){return false;}}
function SetActive(t,v){try{t['void active(bool active)'](v===true);}catch(e){}}
function TryCall(t,s,v){try{if(t&&typeof t[s]==='function'){t[s](v);return true;}}catch(e){}return false;}
function TileAt(x,y){try{return Terraria.Main.tile.get_Item(I(x),I(y));}catch(e){return null;}}
function Key(x,y){return `${I(x)},${I(y)}`;}

function TempleBounds(){
    try{
        const g=Terraria.WorldBuilding.GenVars;
        const left=I(g.tLeft,-1),right=I(g.tRight,-1),top=I(g.tTop,-1),bottom=I(g.tBottom,-1);
        if(left>=0&&right>left&&top>=0&&bottom>top)return {left,right,top,bottom};
    }catch(e){}
    return null;
}
function UnderworldLayer(context){
    try{const y=I(Terraria.Main.UnderworldLayer,0);if(y>0)return y;}catch(e){}
    return Math.max(context.rockLayer+220,context.maxY-220);
}
function RectDistance(x,y,r){
    const dx=x<r.left?r.left-x:(x>r.right?x-r.right:0);
    const dy=y<r.top?r.top-y:(y>r.bottom?y-r.bottom:0);
    return Math.sqrt(dx*dx+dy*dy);
}
function CandidateJungleScore(x,y,temple,protectedRect){
    if(!InWorld(x,y,180))return -1;
    if(temple&&RectDistance(x,y,temple)<185)return -1;
    if(protectedRect&&RectDistance(x,y,protectedRect)<165)return -1;
    let solid=0,jungle=0,grass=0,bad=0,lava=0;
    for(let dy=-14;dy<=14;dy+=7){
        for(let dx=-14;dx<=14;dx+=7){
            const t=TileAt(x+dx,y+dy); if(!t)continue;
            const type=I(t.type,0),wall=I(t.wall,0);
            if(Active(t)){solid++;if(type===59||type===60)jungle++;if(type===60)grass++;if(type===226)bad+=8;}
            if(wall===83||wall===87||wall===3)bad+=2;
            if(I(t.liquid,0)>0){try{if(I(t['byte liquidType()'](),0)===1)lava++;}catch(e){}}
        }
    }
    if(solid<8||grass<1)return -1;
    const ratio=jungle/Math.max(1,solid);
    if(ratio<0.58||bad>0||lava>2)return -1;
    return ratio*100+grass*2-solid*0.05;
}
function FindAnchor(context){
    const temple=TempleBounds();
    const vp=context?.vernalPass&&context.vernalPass.generated===true?{left:I(context.vernalPass.left),right:I(context.vernalPass.left)+I(context.vernalPass.width)-1,top:I(context.vernalPass.top),bottom:I(context.vernalPass.top)+I(context.vernalPass.height)-1}:null;
    const under=UnderworldLayer(context);
    const minY=Math.max(context.worldSurface+120,context.rockLayer+20);
    const maxY=Math.min(context.maxY-PLAN_MARGIN-20,under-150);
    if(maxY<=minY)return null;
    let minX=Math.floor(context.maxX*0.18),maxX=Math.floor(context.maxX*0.82);
    if(temple){minX=Math.max(180,temple.left-900);maxX=Math.min(context.maxX-180,temple.right+900);}
    let best=null;
    for(let a=0;a<MAX_SEARCH_ATTEMPTS;a++){
        let x,y;
        if(temple&&a<72){
            const side=(a&1)===0?-1:1;
            const edge=side<0?temple.left:temple.right;
            x=Clamp(edge+side*WorldGenRand.NextInt(220,760),minX,maxX);
            y=WorldGenRand.NextInt(minY,maxY+1);
        }else{
            x=WorldGenRand.NextInt(minX,maxX+1);y=WorldGenRand.NextInt(minY,maxY+1);
        }
        const score=CandidateJungleScore(x,y,temple,vp);
        if(score<0)continue;
        if(!best||score>best.score)best={x,y,score};
        if(score>=85)return {x,y,score,temple,vernalPass:vp};
    }
    return best?{...best,temple,vernalPass:vp}:null;
}

function Put(plan,x,y,code,priority=0){
    x=I(x);y=I(y);if(!InWorld(x,y,5))return;
    const k=Key(x,y),old=plan.get(k);
    if(!old||priority>=old.p)plan.set(k,{x,y,c:code,p:priority});
}
function Hex(plan,cx,cy,size,code,priority){
    const half=Math.floor(size/2);
    for(let dx=-half;dx<=half;dx++){
        const top=Math.floor(Math.abs(dx)/2),bottom=size-Math.floor(Math.abs(dx)/2);
        for(let yy=top;yy<bottom;yy++)Put(plan,cx+dx,cy+yy,code,priority);
    }
}
function Circle(plan,cx,cy,r,code,priority){
    const rr=r*r;
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=rr)Put(plan,cx+dx,cy+dy,code,priority);
}
function Tunnel(plan,x1,y1,x2,y2){
    const dx=x2-x1,dy=y2-y1,steps=Math.max(1,Math.ceil(Math.sqrt(dx*dx+dy*dy)/2));
    for(let s=0;s<=steps;s++){
        const t=s/steps,x=Math.round(x1+dx*t),y=Math.round(y1+dy*t);
        Circle(plan,x,y,6,'hive',2);
        Circle(plan,x,y,3,'air',5);
    }
}
function FarEnough(points,x,y,minDist){
    for(const p of points){const dx=p.x-x,dy=p.y-y;if(dx*dx+dy*dy<minDist*minDist)return false;}return true;
}
function BuildPlan(anchor){
    const plan=new Map(),cx=anchor.x,cy=anchor.y;
    // Official main cell: 110-tile hive hex with a ~90/80-tile hollow interior.
    Hex(plan,cx,cy-30,110,'hive',1);
    Hex(plan,cx,cy-22,90,'air',4);
    Hex(plan,cx,cy-18,80,'airHoney',5);

    // Small Honey Block clusters inside the hive shell, matching MakeCellHoney.
    const honeyClusters=WorldGenRand.NextInt(1,3);
    for(let n=0;n<honeyClusters;n++){
        const hx=cx+WorldGenRand.NextInt(-42,43),hy=cy-15+WorldGenRand.NextInt(-32,33);
        Hex(plan,hx,hy,WorldGenRand.NextInt(7,10),'honeyBlock',6);
    }

    // 3-5 official-style outer cells below/around the central chamber.
    const rooms=[],count=WorldGenRand.NextInt(3,6);
    for(let n=0;n<count;n++){
        let found=null;
        for(let a=0;a<18;a++){
            const angle=WorldGenRand.NextFloat(0,Math.PI);
            const distance=WorldGenRand.NextInt(80,120);
            const x=cx+Math.round(Math.cos(angle)*distance);
            const y=cy+Math.round(Math.sin(angle)*distance);
            if(InWorld(x,y,65)&&FarEnough(rooms,x,y,60)){found={x,y};break;}
        }
        if(!found)continue;
        const radius=WorldGenRand.NextInt(30,45);
        Hex(plan,found.x,found.y-15,radius,'hive',2);
        Hex(plan,found.x,found.y-10,WorldGenRand.NextInt(19,26),'airHoney',5);
        Tunnel(plan,cx,cy+30,found.x,found.y);
        rooms.push({...found,radius});
    }
    // Re-open the central chamber after tunnels, same final ordering as source.
    Hex(plan,cx,cy-22,90,'air',7);
    Hex(plan,cx,cy-18,80,'airHoney',8);
    return {plan,rooms};
}
function ClearTile(t,wall=HIVE_WALL,honey=false){
    SetActive(t,false);t.type=0;t.frameX=-1;t.frameY=-1;t.wall=wall;t.liquid=honey&&WorldGenRand.NextBool(15)?100:0;
    TryCall(t,'void liquidType(int liquidType)',honey&&I(t.liquid)>0?HONEY_LIQUID:0);
    TryCall(t,'void halfBrick(bool halfBrick)',false);TryCall(t,'void slope(byte slope)',0);
}
function SolidTile(t,type){
    SetActive(t,true);t.type=type;t.frameX=-1;t.frameY=-1;t.wall=0;t.liquid=0;
    TryCall(t,'void liquidType(int liquidType)',0);TryCall(t,'void halfBrick(bool halfBrick)',false);TryCall(t,'void slope(byte slope)',0);
}
function ApplyPlan(plan){
    let hive=0,air=0,honeyBlocks=0,honeyLiquid=0;
    for(const cell of plan.values()){
        const t=TileAt(cell.x,cell.y);if(!t)continue;
        if(cell.c==='hive'){SolidTile(t,HIVE_TILE);hive++;}
        else if(cell.c==='honeyBlock'){SolidTile(t,HONEY_BLOCK);honeyBlocks++;}
        else {ClearTile(t,HIVE_WALL,cell.c==='airHoney');air++;if(I(t.liquid)>0)honeyLiquid++;}
    }
    return {modified:plan.size,hive,air,honeyBlocks,honeyLiquid};
}
function SetSupport(x,y){for(let dx=0;dx<2;dx++){const t=TileAt(x+dx,y);if(t)SolidTile(t,HIVE_TILE);}}
function SetHoneyChestTiles(x,y){
    const base=29*36;
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
        const t=TileAt(x+dx,y+dy);if(!t)continue;SetActive(t,true);t.type=CHEST_TILE;t.frameX=base+dx*18;t.frameY=dy*18;t.wall=HIVE_WALL;t.liquid=0;TryCall(t,'void liquidType(int liquidType)',0);TryCall(t,'void halfBrick(bool halfBrick)',false);TryCall(t,'void slope(byte slope)',0);
    }
}
function PlaceHoneyChest(x,y){
    x=I(x);y=I(y);SetSupport(x,y+2);
    let idx=-1;
    try{if(typeof PlaceChest==='function')idx=I(PlaceChest(x,y+1,CHEST_TILE,false,29),-1);}catch(e){}
    if(idx<0){
        SetHoneyChestTiles(x,y);
        try{idx=I(Terraria.Chest['int CreateChest(int X, int Y, int id)'](x,y,-1),-1);}catch(e){}
    }
    return idx;
}
function Choose(a){return a[WorldGenRand.NextInt(0,a.length)];}
export function FillGiantHiveChestByIndex(chestIndex){
    const g=Terraria.WorldBuilding.GenVars;
    let silver=705,gold=706;try{if(I(g.silverBar)===9)silver=21;if(I(g.goldBar)===8)gold=19;}catch(e){}
    const contents=[[Choose([223,887,3017,4426]),1,-1]];
    if(WorldGenRand.NextInt(0,3)<=1)contents.push([Choose([silver,gold]),WorldGenRand.NextInt(7,15)]);else contents.push([73,WorldGenRand.NextInt(3,5)]);
    if(WorldGenRand.NextBool())contents.push([Choose([2345,289,293,2323,0]),WorldGenRand.NextInt(1,4)]);else contents.push([1134,WorldGenRand.NextInt(3,7)]);
    if(WorldGenRand.NextBool())contents.push([209,WorldGenRand.NextInt(4,6)]);else contents.push([331,WorldGenRand.NextInt(3,5)]);
    if(WorldGenRand.NextBool())contents.push([2350,WorldGenRand.NextInt(1,4)]);else contents.push([4388,WorldGenRand.NextInt(18,36)]);
    return FillChestByIndex(chestIndex,contents);
}
function PlaceLarva(x,y){
    x=I(x);y=I(y);
    for(let dx=-1;dx<=1;dx++)for(let dy=-2;dy<=0;dy++){const t=TileAt(x+dx,y+dy);if(t)ClearTile(t,HIVE_WALL,false);}
    for(let dx=-1;dx<=1;dx++){const t=TileAt(x+dx,y+1);if(t)SolidTile(t,HIVE_TILE);}
    let ok=false;try{if(typeof PlaceTile==='function')ok=PlaceTile(x,y,LARVA_TILE,true,true,-1,0)===true;}catch(e){}
    return ok;
}
function BoundsFromPlan(plan){
    let l=1e9,r=-1e9,t=1e9,b=-1e9;for(const c of plan.values()){l=Math.min(l,c.x);r=Math.max(r,c.x);t=Math.min(t,c.y);b=Math.max(b,c.y);}
    return {left:l,top:t,width:r-l+1,height:b-t+1,right:r,bottom:b};
}
export const GiantHiveRuntime={
    Generate(context){
        const started=Date.now();const anchor=FindAnchor(context);
        if(!anchor)return {generated:false,reason:'underground-jungle-anchor-not-found',elapsedMs:Date.now()-started};
        const built=BuildPlan(anchor),stats=ApplyPlan(built.plan),bounds=BoundsFromPlan(built.plan),chests=[];
        for(let i=0;i<built.rooms.length&&chests.length<4;i++){
            const room=built.rooms[i],x=room.x,y=room.y+Math.max(3,Math.floor(room.radius*0.2));
            const idx=PlaceHoneyChest(x,y);
            if(idx>=0){const filled=FillGiantHiveChestByIndex(idx);const c=GetChestByIndex(idx);chests.push({x:c?I(c.x,x):x,y:c?I(c.y,y):y,index:idx,filled});}
        }
        const larvae=[];
        const ly=anchor.y+18;if(PlaceLarva(anchor.x,ly))larvae.push({x:anchor.x,y:ly});
        if(built.rooms.length>0){const r=built.rooms[WorldGenRand.NextInt(0,built.rooms.length)];const y=r.y;if(PlaceLarva(r.x,y))larvae.push({x:r.x,y});}
        const result={generated:true,anchorX:anchor.x,anchorY:anchor.y,jungleScore:anchor.score,left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height,rooms:built.rooms.length,chests,larvae,source:'official-Calamity-GiantHive.cs/mobile-precomputed-plan',elapsedMs:Date.now()-started,...stats};
        Log(`generated=true anchor=${anchor.x},${anchor.y} score=${anchor.score.toFixed(1)} rooms=${result.rooms} chests=${chests.length} larvae=${larvae.length} cells=${stats.modified} honey=${stats.honeyLiquid} elapsed=${result.elapsedMs}ms.`);
        return result;
    }
};
