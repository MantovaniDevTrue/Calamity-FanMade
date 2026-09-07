import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { AbyssTerrainRuntime } from './AbyssTerrainRuntime.js';

// Phase 13.06.1: official Layer 1/2 Abyss ambience + mobile render fast path.
// Fresh-world only: all placement is performed inside WorldGen.ShimmerCleanUp from the
// cached Abyss geometry. There is intentionally no gameplay recovery scan.
const ECHO_BLOCK = 541; // legacy proxy only
const SOLID_PROXY = 38; // Gray Brick hidden beneath solid coral overlay
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function ResolveTile(name, fallback) { try { const n = I(Terraria.ID.TileID?.[name], -1); if (n >= 0) return n; } catch (_) { } return I(fallback); }
const POT_TILE = ResolveTile('Pots', 28);
const HOST = Object.freeze({
    shale: ResolveTile('AncientObsidianBrick', 683),
    gravel: ResolveTile('AncientCobaltBrick', 685),
    planty: ResolveTile('AncientBlueBrick', 677)
});

function VineDefs(prefix) {
    const out = [];
    let v = 0;
    for (const height of [1, 2, 3]) for (let style = 0; style < 3; style++) {
        v++;
        out.push({ texture: `${prefix}${v}`, width: 1, height, originX: 0, originY: 0, drawYOffset: 0 });
    }
    return out;
}

const DEF = Object.freeze({
    tube: [
        { texture: 'SulphurTubeCoral', width: 3, height: 3, originX: 1, originY: 2, drawYOffset: 2 }
    ],
    shalePile: [1,2,3].map(n => ({ texture: `ShalePile${n}`, width: 3, height: 2, originX: 1, originY: 1, drawYOffset: 2 })),
    pire: [1,2,3].map(n => ({ texture: `SulphurPireCoral${n}`, glow: `SulphurPireCoral${n}Glow`, width: 3, height: 3, originX: 1, originY: 2, drawYOffset: 2, light: [0.46,0.51,0] })),
    fossil: [1,2,3].map(n => ({ texture: `SulphuricFossil${n}`, width: 3, height: 2, originX: 1, originY: 1, drawYOffset: 0 })),
    rib: [
        { texture:'SulphurousRib1', width:1, height:4, originX:0, originY:3, drawYOffset:2 },
        { texture:'SulphurousRib2', width:1, height:3, originX:0, originY:2, drawYOffset:2 },
        { texture:'SulphurousRib3', width:1, height:2, originX:0, originY:1, drawYOffset:2 },
        { texture:'SulphurousRib4', width:1, height:3, originX:0, originY:2, drawYOffset:2 },
        { texture:'SulphurousRib5', width:1, height:1, originX:0, originY:0, drawYOffset:2 }
    ],
    plantPile: [1,2,3].map(n => ({ texture:`PlantyMushPile${n}`, width:3, height:2, originX:1, originY:1, drawYOffset:2 })),
    pearl: [
        { texture:'MassiveRarePearl', width:2, height:1, originX:0, originY:0, drawYOffset:2 }
    ],
    kelp: [
        { texture:'AbyssGiantKelp1', glow:'AbyssGiantKelp1Glow', width:2, height:5, originX:1, originY:4, drawYOffset:2, light:[0.72,0.35,0.08] },
        { texture:'AbyssGiantKelp2', glow:'AbyssGiantKelp2Glow', width:2, height:5, originX:1, originY:4, drawYOffset:2, light:[0.72,0.35,0.08] },
        { texture:'AbyssGiantKelp3', glow:'AbyssGiantKelp3Glow', width:2, height:4, originX:1, originY:3, drawYOffset:2, light:[0.46,0.22,0.05] },
        { texture:'AbyssGiantKelp4', glow:'AbyssGiantKelp4Glow', width:2, height:3, originX:1, originY:2, drawYOffset:2, light:[0.61,0.30,0.07] }
    ],
    gravelPile: [1,2,3].map(n => ({ texture:`GravelPile${n}`, width:3, height:2, originX:1, originY:1, drawYOffset:2 })),
    vent: [1,2,3].map(n => ({ texture:`AbyssVent${n}`, width:2, height:2, originX:0, originY:1, drawYOffset:0 })),
    crate: [1,2,3,4,5,6].map(n => ({ texture:`PirateCrate${n}`, glow:n<=3?`PirateCrate${n}Glow`:null, width:2, height:2, originX:0, originY:1, drawYOffset:2 })),
    // Official AbyssCoral sprite-sheet frames are pre-cropped from the supplied Calamity
    // source asset. Each cell remains a real solid proxy so the rare coral blob has volume.
    coral: [1,2,3,4,5,6,7,8].map(n => ({ texture:`AbyssCoralTile${n}`, width:1, height:1, originX:0, originY:0, drawYOffset:0 })),
    // Pot sheets are split into their three official 2x2 styles. The physical proxy is the
    // vanilla Pot tile with invisible coating, so it remains non-solid and breakable.
    abyssPot: [1,2,3].map(n => ({ texture:`AbyssalPot${n}`, width:2, height:2, originX:0, originY:1, drawYOffset:2 })),
    sulphPot: [1,2,3].map(n => ({ texture:`SulphurousPot${n}`, width:2, height:2, originX:0, originY:1, drawYOffset:4 })),
    // Nine official-derived vine sprites = three lengths (1..3) x three style columns.
    viperVine: VineDefs('ViperVine'),
    sulphVine: VineDefs('SulphurousVine')
});

function MaxX(){return I(Terraria.Main.maxTilesX,4200);} function MaxY(){return I(Terraria.Main.maxTilesY,1200);}
function Rock(){return I(Terraria.Main.rockLayer,500);} function Surface(){return I(Terraria.Main.worldSurface,350);}
function InWorld(x,y,m=3){return x>=m&&y>=m&&x<MaxX()-m&&y<MaxY()-m;}
function Tile(x,y){if(!InWorld(x,y,1))return null;try{return Terraria.Main.tile.get_Item(I(x),I(y));}catch(_){return null;}}
function Active(t){try{return !!t&&t['bool active()']()===true;}catch(_){return false;}}
function SetActive(t,v){try{t['void active(bool active)'](v===true);}catch(_){}}
function TryCall(t,sig,v){try{if(t&&typeof t[sig]==='function'){t[sig](v);return true;}}catch(_){}return false;}
let VisualOccupied=null;
function CellKey(x,y){return `${I(x)},${I(y)}`;}
function Empty(x,y){const t=Tile(x,y);return !!t&&!Active(t)&&!(VisualOccupied?.has(CellKey(x,y)));}
function Solid(x,y){const t=Tile(x,y);return !!t&&Active(t);}
function CanOccupy(left,top,w,h){if(!InWorld(left,top)||!InWorld(left+w-1,top+h-1))return false;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(!Empty(left+xx,top+yy))return false;return true;}
function Supports(left,top,w,h){const y=top+h;for(let x=0;x<w;x++)if(!Solid(left+x,y))return false;return true;}

function ReadLiquid(t){const liquid=I(t?.liquid,0);let liquidType=0;try{liquidType=I(t['byte liquidType()'](),0);}catch(_){}return{liquid,liquidType};}
function ResetShape(t){TryCall(t,'void halfBrick(bool halfBrick)',false);TryCall(t,'void slope(byte slope)',0);}
function SetProxy(x,y){
    const t=Tile(x,y);if(!t)return false;const q=ReadLiquid(t);
    // Decorative Abyss objects are drawn from metadata. Leaving Echo tiles under them made
    // invisible mineable/collidable vanilla cells. Reserve the worldgen cell only in JS.
    SetActive(t,false);t.type=0;t.frameX=0;t.frameY=0;t.liquid=q.liquid;
    TryCall(t,'void liquidType(int liquidType)',q.liquidType);ResetShape(t);
    TryCall(t,'void invisibleBlock(bool invisibleBlock)',false);TryCall(t,'void actuator(bool actuator)',false);TryCall(t,'void inActive(bool inActive)',false);
    VisualOccupied?.add(CellKey(x,y));return true;
}
function SetSolidProxy(x,y){
    const t=Tile(x,y);if(!t)return false;
    SetActive(t,true);t.type=SOLID_PROXY;t.frameX=0;t.frameY=0;t.liquid=0;ResetShape(t);
    TryCall(t,'void invisibleBlock(bool invisibleBlock)',true);TryCall(t,'void actuator(bool actuator)',false);TryCall(t,'void inActive(bool inActive)',false);return true;
}
function SetPotCell(x,y,fx,fy){
    const t=Tile(x,y);if(!t)return false;const q=ReadLiquid(t);
    SetActive(t,true);t.type=POT_TILE;t.frameX=I(fx);t.frameY=I(fy);t.liquid=q.liquid;
    TryCall(t,'void liquidType(int liquidType)',q.liquidType);ResetShape(t);
    TryCall(t,'void invisibleBlock(bool invisibleBlock)',true);TryCall(t,'void actuator(bool actuator)',false);TryCall(t,'void inActive(bool inActive)',false);return true;
}
function Pick(list){return WorldGenRand.NextInt(0,list.length);}
function PushObject(kind,variant,left,top,d,objects){const o={kind,variant:variant+1,left,top,width:d.width,height:d.height,drawYOffset:d.drawYOffset||0};objects.push(o);return o;}
function Place(kind,variant,anchorX,anchorY,objects){
    const list=DEF[kind],d=list?.[variant];if(!d)return null;
    const left=I(anchorX)-d.originX,top=I(anchorY)-d.originY;
    if(!CanOccupy(left,top,d.width,d.height)||!Supports(left,top,d.width,d.height))return null;
    for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++)SetProxy(left+x,top+y);
    return PushObject(kind,variant,left,top,d,objects);
}
function TryPlace(kind,anchorX,anchorY,objects){return Place(kind,Pick(DEF[kind]),anchorX,anchorY,objects);}
function PlacePot(kind,anchorX,anchorY,objects){
    const variant=Pick(DEF[kind]),d=DEF[kind][variant],left=I(anchorX)-d.originX,top=I(anchorY)-d.originY;
    if(!CanOccupy(left,top,2,2)||!Supports(left,top,2,2))return null;
    for(let y=0;y<2;y++)for(let x=0;x<2;x++)SetPotCell(left+x,top+y,x*18,y*18);
    return PushObject(kind,variant,left,top,d,objects);
}
function PlaceHanging(kind,anchorX,anchorY,objects){
    const variant=Pick(DEF[kind]),d=DEF[kind][variant],left=I(anchorX),top=I(anchorY);
    if(!CanOccupy(left,top,1,d.height))return null;
    // The first cell must actually hang from generated material above.
    if(!Solid(left,top-1))return null;
    for(let y=0;y<d.height;y++)SetProxy(left,top+y);
    return PushObject(kind,variant,left,top,d,objects);
}
function PlaceCoralBlob(anchorX,anchorY,objects){
    const cx=I(anchorX),cy=I(anchorY);
    if(!Empty(cx,cy)||!Empty(cx,cy-1))return 0;
    const cells=[];
    for(let dy=-3;dy<=0;dy++)for(let dx=-3;dx<=3;dx++){
        const d2=dx*dx+dy*dy;if(d2>9)continue;
        // Approximate the official Blotches(2, 0.4) modifier while keeping a connected,
        // compact mound. Interior cells are stable; edge cells receive the blotch RNG.
        if(d2>=6&&WorldGenRand.NextFloat()<0.38)continue;
        const x=cx+dx,y=cy+dy;if(!Empty(x,y))continue;
        cells.push({x,y});
    }
    if(cells.length<4)return 0;
    let placed=0;
    for(const c of cells){
        if(!SetSolidProxy(c.x,c.y))continue;
        const variant=Pick(DEF.coral),d=DEF.coral[variant];
        PushObject('coral',variant,c.x,c.y,d,objects);placed++;
    }
    return placed;
}
function Log(s){try{tl.log(`[CalamityPort AbyssAmbient] ${s}`);}catch(_){}}

function Bounds(abyss,sulphurous){
    const maxX=MaxX(),chasm=I(abyss?.chasmX,(sulphurous?.atLeft===true?170:maxX-170)),atLeft=sulphurous?.atLeft===true;
    return{
        left:atLeft?3:Math.max(3,chasm-160),
        right:atLeft?Math.min(maxX-3,chasm+160):maxX-3,
        top:Math.max(5,I(abyss?.fillTop,Rock()-40)),
        bottom:Math.min(MaxY()-5,Rock()+Math.floor(MaxY()*0.143))
    };
}

export const AbyssAmbientWorldgenRuntime={
    Definitions:DEF,
    Encode(objects){try{return JSON.stringify((objects||[]).map(o=>[o.kind,I(o.variant,1),I(o.left),I(o.top),I(o.width),I(o.height),I(o.drawYOffset)]));}catch(_){return'[]';}},
    Generate(context,abyss,sulphurous){
        const started=Date.now(),b=Bounds(abyss,sulphurous),objects=[];
        VisualOccupied=new Set();
        const counts={tube:0,shalePile:0,pire:0,fossil:0,rib:0,plantPile:0,pearl:0,kelp:0,gravelPile:0,vent:0,crate:0,coral:0,coralCells:0,abyssPot:0,sulphPot:0,viperVine:0,sulphVine:0};
        const floors=AbyssTerrainRuntime.GetAmbientFloorCandidates(b.top,b.bottom);
        const floorCells=floors.length;let attempts=0;

        // Official floor objects from Abyss.cs. Existing 13.05 content is preserved exactly;
        // the missing coral/pot passes are appended at the same host cells.
        for(const c of floors){
            const x=I(c.x),y=I(c.y),host=String(c.host||'');
            if(host==='shale'){
                if(WorldGenRand.NextBool(85)){attempts++;if(TryPlace('tube',x,y,objects))counts.tube++;}
                if(WorldGenRand.NextBool(18)){attempts++;if(TryPlace('shalePile',x,y,objects))counts.shalePile++;}
                if(WorldGenRand.NextBool(15)){attempts++;if(TryPlace('pire',x,y,objects))counts.pire++;}
                if(WorldGenRand.NextBool(12)){attempts++;if(TryPlace('fossil',x,y,objects))counts.fossil++;}
                if(WorldGenRand.NextBool(12)){attempts++;if(TryPlace('rib',x,y,objects))counts.rib++;}
            }else if(host==='planty'){
                if(WorldGenRand.NextBool(8)){attempts++;if(TryPlace('plantPile',x,y,objects))counts.plantPile++;}
            }else if(host==='gravel'){
                if(WorldGenRand.NextBool(125)&&Empty(x,y-1)){
                    attempts++;const n=PlaceCoralBlob(x,y,objects);if(n>0){counts.coral++;counts.coralCells+=n;}
                }
                if(WorldGenRand.NextBool(50)){attempts++;if(TryPlace('pearl',x,y,objects))counts.pearl++;}
                if(WorldGenRand.NextBool(15)){attempts++;if(TryPlace('kelp',x,y,objects))counts.kelp++;}
                if(WorldGenRand.NextBool(15)){attempts++;if(TryPlace('plantPile',x,y,objects))counts.plantPile++;}
                if(WorldGenRand.NextBool(15)){attempts++;if(TryPlace('gravelPile',x,y,objects))counts.gravelPile++;}
                if(WorldGenRand.NextBool(45)){attempts++;if(TryPlace('vent',x,y,objects))counts.vent++;}
                if(WorldGenRand.NextBool(17)){attempts++;if(TryPlace('crate',x,y,objects))counts.crate++;}
            }

            // Official AbyssalPots are eligible on Gravel/Pyre/Void below rock. L1/L2 only
            // contains Gravel here; deeper hosts remain for a later layer pass.
            if(host==='gravel'&&y>Rock()&&WorldGenRand.NextBool(5)){
                attempts++;if(PlacePot('abyssPot',x,y,objects))counts.abyssPot++;
            }
            // Included for source fidelity; current L1/L2 bounds normally sit below Surface,
            // so SulphurousPots are expected to be rare/zero until the upper-sea pass is joined.
            if(host==='shale'&&y<Surface()&&WorldGenRand.NextBool(3)){
                attempts++;if(PlacePot('sulphPot',x,y,objects))counts.sulphPot++;
            }
        }

        // Official hanging vines grow from exposed undersides. This uses a second cached-
        // geometry list instead of scanning the L1/L2 rectangle through Main.tile.
        const ceilings=AbyssTerrainRuntime.GetAmbientCeilingCandidates(b.top,b.bottom);
        let vineAttempts=0;
        for(const c of ceilings){
            const x=I(c.x),y=I(c.y),host=String(c.host||'');
            if(host==='planty'&&WorldGenRand.NextBool(2)){
                vineAttempts++;if(PlaceHanging('viperVine',x,y,objects))counts.viperVine++;
            }else if(host==='shale'&&WorldGenRand.NextBool(5)){
                vineAttempts++;if(PlaceHanging('sulphVine',x,y,objects))counts.sulphVine++;
            }
        }

        const result={
            generated:true,version:4,objects,counts,floorCells,ceilingCells:ceilings.length,
            placementAttempts:attempts+vineAttempts,bounds:b,
            source:'official-Abyss.cs-ambient-L1-L2-complete-cached-geometry',
            elapsedMs:Date.now()-started
        };
        VisualOccupied=null;
        Log(`fresh-world L1/L2 complete; floors=${floorCells}, ceilings=${ceilings.length}, attempts=${result.placementAttempts}, objects=${objects.length}, shale[tube=${counts.tube},pile=${counts.shalePile},pire=${counts.pire},fossil=${counts.fossil},rib=${counts.rib},vine=${counts.sulphVine}], plant[pile=${counts.plantPile},vine=${counts.viperVine}], gravel[coral=${counts.coral}/${counts.coralCells}cells,pearl=${counts.pearl},kelp=${counts.kelp},pile=${counts.gravelPile},vent=${counts.vent},crate=${counts.crate},pot=${counts.abyssPot}], elapsed=${result.elapsedMs}ms.`);
        return result;
    }
};
