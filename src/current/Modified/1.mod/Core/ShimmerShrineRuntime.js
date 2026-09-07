import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { ShimmerShrineSchematic } from './../Data/OfficialSchematics/ShimmerShrineSchematic.js';
import { OfficialSchematicRuntime, FillChestByIndex, ResolveVanillaItemID } from './OfficialSchematicRuntime.js';

const SHIMMER_LIQUID_TYPE = 3;
function N(value, fallback = 0) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function Log(message) { try { tl.log(`[CalamityPort ShimmerShrine] ${message}`); } catch (e) { } }
function InWorld(x, y) { return x >= 2 && y >= 2 && x < N(Terraria.Main.maxTilesX, 4200) - 2 && y < N(Terraria.Main.maxTilesY, 1200) - 2; }
function Tile(x, y) { if (!InWorld(x, y)) return null; try { return Terraria.Main.tile.get_Item(x, y); } catch (e) { try { return Terraria.Main.tile[x][y]; } catch (_) { return null; } } }
function Active(tile) { try { return !!tile && tile['bool active()']() === true; } catch (e) { return false; } }
function LiquidType(tile) { if (!tile) return -1; try { return N(tile['byte liquidType()'](), -1); } catch (e) { return -1; } }
function IsShimmer(tile) { return !!tile && N(tile.liquid, 0) > 0 && LiquidType(tile) === SHIMMER_LIQUID_TYPE; }
function GoldBarItem() {
    let selected = NaN;
    try { selected = Number(Terraria.WorldBuilding.GenVars.gold); } catch (e) { }
    if (!Number.isFinite(selected)) try { selected = Number(Terraria.WorldBuilding.GenVars.goldBar); } catch (e) { }
    if (!Number.isFinite(selected)) try { selected = Number(Terraria.WorldGen.SavedOreTiers.Gold); } catch (e) { }
    return selected === 8 || selected === 19
        ? ResolveVanillaItemID('GoldBar', 19)
        : ResolveVanillaItemID('PlatinumBar', 706);
}
export function FillShimmerShrineChestByIndex(chestIndex) {
    const crystal = WorldGenRand.NextBool() ? ResolveVanillaItemID('LifeCrystal', 29) : ResolveVanillaItemID('ManaCrystal', 109);
    return FillChestByIndex(chestIndex, [
        { type: ResolveVanillaItemID('MagicMirror', 52), stack: 1, prefix: null },
        { type: crystal, stack: 1, prefix: null },
        { type: GoldBarItem(), stack: WorldGenRand.NextInt(5, 16), prefix: null },
        { type: ResolveVanillaItemID('RecallPotion', 4345), stack: WorldGenRand.NextInt(3, 5), prefix: null },
        { type: ResolveVanillaItemID('HealingPotion', 188), stack: WorldGenRand.NextInt(5, 11), prefix: null },
        { type: 4479, stack: WorldGenRand.NextInt(1, 3), prefix: null },
        { type: ResolveVanillaItemID('GoldCoin', 73), stack: WorldGenRand.NextInt(2, 5), prefix: null }
    ]);
}
function GenVarsShimmerX(maxX) {
    try {
        const point = Terraria.WorldBuilding.GenVars.shimmerPosition;
        const x = N(point?.X, -1);
        if (x >= Math.floor(maxX * 0.05) && x <= Math.floor(maxX * 0.95)) return x;
    } catch (e) { }
    return -1;
}
function ScanBounds(ctx, secondary) {
    const maxX = N(ctx.maxX, 4200), maxY = N(ctx.maxY, 1200), surface = N(ctx.worldSurface, Math.floor(maxY * 0.25));
    const y0 = Math.max(40, surface + 60), y1 = Math.min(maxY - 120, Math.floor(maxY * 0.78));
    if (secondary === true) return { x0: Math.floor(maxX * 0.08), x1: Math.floor(maxX * 0.92), y0, y1, step: 6 };
    const dungeonX = N(ctx.dungeonX, Math.floor(maxX * 0.5));
    return dungeonX < maxX * 0.5
        ? { x0: Math.floor(maxX * 0.52), x1: Math.floor(maxX * 0.92), y0, y1, step: 4 }
        : { x0: Math.floor(maxX * 0.08), x1: Math.floor(maxX * 0.48), y0, y1, step: 4 };
}
function StartScan(search, secondary) {
    const b = ScanBounds(search.ctx, secondary);
    search.secondary = secondary === true; search.bounds = b; search.scanX = b.x0; search.scanY = b.y0;
    search.phase = secondary ? 'discover-secondary' : 'discover-primary';
}
function AdvanceScan(search) {
    const b = search.bounds; search.scanX += b.step;
    if (search.scanX > b.x1) { search.scanX = b.x0; search.scanY += b.step; }
    return search.scanY <= b.y1;
}
function StartRefine(search, seedX, seedY) {
    const maxX=N(search.ctx.maxX,4200),maxY=N(search.ctx.maxY,1200);
    search.seedX=seedX;search.seedY=seedY;search.refine={left:Math.max(2,seedX-150),right:Math.min(maxX-3,seedX+150),top:Math.max(2,seedY-110),bottom:Math.min(maxY-3,seedY+110),x:0,y:0,step:2,minX:1e9,maxX:-1,minY:1e9,maxY:-1,count:0};
    search.refine.x=search.refine.left;search.refine.y=search.refine.top;search.phase='refine';
}
function AdvanceRefine(r) { r.x += r.step; if (r.x > r.right) { r.x=r.left; r.y+=r.step; } return r.y<=r.bottom; }
function StartGround(search, x, source) {
    search.shimmerX=N(x);search.anchorSource=source;search.groundY=Math.max(2,N(search.ctx.worldSurface,300)-300);search.phase='ground';
}
function Place(search) {
    const point={x:search.shimmerX,y:search.groundY+28};
    const placed=OfficialSchematicRuntime.Place(ShimmerShrineSchematic,point,'center',FillShimmerShrineChestByIndex,30,true);
    if (!placed.generated) return { generated:false,done:true,reason:placed.reason||'placement-failed',reads:search.reads };
    const result={...placed,anchorX:placed.left,anchorY:placed.top,placementX:point.x,placementY:point.y,shimmerX:search.shimmerX,groundY:search.groundY,source:`CalamityMod/World/ShimmerShrine.cs::PlaceShimmerShrine + Schematics/Shimmer_Shrine.csch + ${search.anchorSource} + delayed-mobile-safe-placement`};
    Log(`generated=true, topLeft=${result.left},${result.top}, placementPoint=${point.x},${point.y}, shimmerX=${search.shimmerX}, groundY=${search.groundY}, chest=${result.chestX},${result.chestY}, filled=${result.chestFilledSlots}, source=${search.anchorSource}, reads=${search.reads}.`);
    return {generated:true,done:true,result};
}
export const ShimmerShrineRuntime={
    Begin(context){
        const ctx={maxX:N(context?.maxX,4200),maxY:N(context?.maxY,1200),worldSurface:N(context?.worldSurface,300),dungeonX:N(context?.dungeonX,2100)};
        const search={ctx,phase:'init',reads:0,secondary:false,anchorSource:'',shimmerX:-1,groundY:-1};
        const x=GenVarsShimmerX(ctx.maxX);
        if(x>=0)StartGround(search,x,'GenVars.shimmerPosition/official-x');else StartScan(search,false);
        return search;
    },
    Step(search,budget=768){
        budget=Math.max(1,N(budget,768));
        while(budget-->0){
            if(search.phase==='discover-primary'||search.phase==='discover-secondary'){
                const x=search.scanX,y=search.scanY,t=Tile(x,y);search.reads++;
                if(IsShimmer(t)){StartRefine(search,x,y);continue;}
                if(!AdvanceScan(search)){
                    if(search.phase==='discover-primary'){StartScan(search,true);continue;}
                    return {generated:false,done:true,reason:'shimmer-liquid-not-found',reads:search.reads};
                }
                continue;
            }
            if(search.phase==='refine'){
                const r=search.refine,t=Tile(r.x,r.y);search.reads++;
                if(IsShimmer(t)){r.count++;r.minX=Math.min(r.minX,r.x);r.maxX=Math.max(r.maxX,r.x);r.minY=Math.min(r.minY,r.y);r.maxY=Math.max(r.maxY,r.y);}
                if(!AdvanceRefine(r)){
                    const x=r.count>0?Math.round((r.minX+r.maxX)*0.5):search.seedX;
                    StartGround(search,x,`incremental-shimmer-liquid-scan:samples=${r.count}`);
                }
                continue;
            }
            if(search.phase==='ground'){
                if(search.groundY>=search.ctx.maxY-90)return {generated:false,done:true,reason:'surface-ground-not-found',reads:search.reads};
                const t=Tile(search.shimmerX,search.groundY);search.reads++;
                if(Active(t)){search.phase='place';continue;}
                search.groundY++;continue;
            }
            if(search.phase==='place')return Place(search);
            return {generated:false,done:true,reason:'invalid-search-phase',reads:search.reads};
        }
        return {generated:false,done:false,phase:search.phase,reads:search.reads};
    }
};
