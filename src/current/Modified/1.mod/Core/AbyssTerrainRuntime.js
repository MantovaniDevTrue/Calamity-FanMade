import { Terraria, Modules } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime, SulphurousSeaAnchorTiles, SulphurousSeaAnchorWalls } from './SulphurousSeaTerrainRuntime.js';

const { TileData } = Modules;
const PREFIX = 'calamity:abyss:terrain:';
// v22 adds a fresh-world synchronous path for ShimmerCleanUp. New worlds now build the
// Sulphurous Sea -> Abyss chain before first entry, using the same geometry/material plan as
// the validated v21 runtime while writing through Main.tile.get_Item (the proven worldgen path).
// Existing worlds keep the incremental v21 migration/recovery path unchanged.
const VERSION = 23;
const CELLS_PER_TICK = 320;
const ACTIVE_TILE = 0x20;
const NEWTEXT = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];

const PROTECTED = new Set([4,10,11,13,14,15,16,18,21,26,31,33,34,35,42,49,50,55,77,79,85,88,89,90,93,101,102,103,104,125,126,128,132,133,134,136,139,149,165,171,172,173,174,178,184,185,186,187,201,207,209,212,215,216,217,218,219,220,227,228,231,233,235,236,237,238,239,240,241,242,245,246,247,254,269,270,271,314,334,335,336,337,338,339,349,354,355,356,359,360,361,362,363,364,372,373,374,375,376,377,378,379,380,386,387,388,389,390,391,392,393,394,395,410,411,425,440,441,453,454,455,456,457,458,459,460,461,462,463,464,465,466,467,468,470,471,475,487,488,489,490,491,493,494,497,499,506,509,510,511,520,521,529,530,538,539,540,542,543,544,545,546,547,548,549,550,551,552,553,554,555,556,557,558,559,560,561,562,563,564,565,566,567,568,569,570,571,572,573,574,575,576,577,578,579,580,581,582,583,584,585,586,587,588,589,590,591,592,593,594,595,596,597,598,599,600,601,602,603,604,605,606,607,608,609,610,611,612,613,614,615,616,617,618,619,620,621,622,623]);
// Terraria mobile can place Dungeon branches farther toward the ocean than the
// desktop worldgen layout Calamity normally assumes. Protect every Dungeon
// brick/wall family before the Abyss conversion pass so the Abyss never eats
// rooms, corridors, cracked bricks or their background walls.
const DUNGEON_TILES = new Set([41, 43, 44, 481, 482, 483]);
const DUNGEON_WALLS = new Set([
    7, 8, 9, 17, 18, 19,
    94, 95, 96, 97, 98, 99,
    100, 101, 102, 103, 104, 105
]);
// Mobile-safe Dungeon separation. Do not scan Main.tile here: this file is called
// from fresh-world generation while Terraria is still building the native tile array.
// Main.dungeonX is already available at this point and is enough to keep the Abyss on
// the ocean side while per-cell Dungeon brick/wall checks protect unusual branches.
const DUNGEON_GUARD_BUFFER = 320;
const DungeonGuard = { key: '', l: -1, r: -1, dungeonX: -1, logged: false };


function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function B(v) { if (v === true) return true; if (v === false || v == null) return false; try { const n = Number(v); if (Number.isFinite(n)) return n !== 0; } catch (e) { } return String(v).toLowerCase() === 'true'; }
function ResolveTile(name, fallback) { try { const v = I(Terraria.ID.TileID?.[name], -1); if (v > 0) return v; } catch (e) { } return I(fallback); }

const LEGACY_FOSSIL = I(SulphurousSeaAnchorTiles.shale, 404);
const LEGACY_V6 = ResolveTile('ObsidianBrick', 75);
// Obscure vanilla solids used only as physical storage. Each official Abyss material keeps
// a distinct slot so its world texture and map identity can stay stable at the same time.
// The visual system replaces these slots with the official Calamity textures and overrides
// their MapHelper colors with the exact AddMapEntry colors from the official tile classes.
const SHALE = ResolveTile('AncientObsidianBrick', 683);
const GRAVEL = ResolveTile('AncientCobaltBrick', 685);
const PYRE = ResolveTile('AncientGoldBrick', 680);
const LEGACY_PYRE_HOT = ResolveTile('AncientHellstoneBrick', 684);
const VOID = ResolveTile('MercuryBrick', 674);
// Dedicated non-worldgen vanilla brick slots for the official special Abyss island clumps.
const PLANTY = ResolveTile('AncientBlueBrick', 677);
const SCORIA = ResolveTile('AncientGreenBrick', 678);
const MOLTEN = ResolveTile('AncientPinkBrick', 679);
// v9 used SHALE (683) for all four layers. These aliases remain so worlds made by older
// phases are recognized during the automatic v10 migration.
const LEGACY_GRAVEL = GRAVEL;
const LEGACY_PYRE = LEGACY_PYRE_HOT;
const LEGACY_VOID = VOID;
export const AbyssTerrainProxyTiles = Object.freeze({
    Shale: SHALE, Gravel: GRAVEL, PyreMantle: PYRE, Voidstone: VOID,
    PlantyMush: PLANTY, ScoriaOre: SCORIA, PyreMantleMolten: MOLTEN,
    LegacyShale: LEGACY_FOSSIL, LegacyV6: LEGACY_V6, LegacyGravel: LEGACY_GRAVEL, LegacyPyreMantle: LEGACY_PYRE, LegacyVoidstone: LEGACY_VOID
});

// Rare wall slots. They are never relied on for behavior; they only give each depth its own
// native wall slot so the official unsafe-wall art can be rendered without one global texture.
const WALL_SHALE = 231, WALL_GRAVEL = 232, WALL_PYRE = 233, WALL_VOID = 234;
export const AbyssTerrainProxyWalls = Object.freeze({ Shale: WALL_SHALE, Gravel: WALL_GRAVEL, PyreMantle: WALL_PYRE, Voidstone: WALL_VOID });

const KIND = Object.freeze({ NONE: 0, SHALE: 1, WATER: 2, GRAVEL: 3, PYRE: 4, VOID: 5, PLANTY: 6, SCORIA: 7, MOLTEN: 8 });
function Key(n) { return PREFIX + String(n); }
function Tell(s, r = 80, g = 200, b = 235) { try { NEWTEXT(String(s), r, g, b); } catch (e) { } }
function MaxX() { return I(Terraria.Main.maxTilesX, 4200); }
function MaxY() { return I(Terraria.Main.maxTilesY, 1200); }
function Surface() { return I(Terraria.Main.worldSurface, 350); }
function SurfaceLow() { try { const n = I(Terraria.WorldBuilding?.GenVars?.worldSurfaceLow, -1); if (n > 20) return n; } catch (e) { } return Surface(); }
function Rock() { return I(Terraria.Main.rockLayer, 500); }
function InWorld(x, y) { return x >= 3 && y >= 3 && x < MaxX() - 3 && y < MaxY() - 3; }
function AtLeft() { return SulphurousSeaPreviewRuntime.AtLeft === true; }
function OfficialChasmX() { return AtLeft() ? 170 : MaxX() - 170; }
const MouthCache = { key: '', x: -1, y: -1 };
function SeaMouthKey() { return `${Seed()}:${MaxX()}:${MaxY()}:${AtLeft()?1:0}:${I(SulphurousSeaPreviewRuntime.BoundsLeft)}:${I(SulphurousSeaPreviewRuntime.BoundsRight)}:${I(SulphurousSeaPreviewRuntime.BoundsTop)}:${I(SulphurousSeaPreviewRuntime.BoundsBottom)}`; }
const SEA_TILE_SET = new Set([I(SulphurousSeaAnchorTiles.sand), I(SulphurousSeaAnchorTiles.sandstone), I(SulphurousSeaAnchorTiles.hardened), I(SulphurousSeaAnchorTiles.shale)]);
const SEA_WALL_SET = new Set([I(SulphurousSeaAnchorWalls.sand), I(SulphurousSeaAnchorWalls.sandstone), I(SulphurousSeaAnchorWalls.hardened), I(SulphurousSeaAnchorWalls.shale)]);
function SeaMaterialNeighbor(x,y) {
    for (const q of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0]]) {
        try { const d = new TileData(I(x)+q[0],I(y)+q[1]); if ((Active(d) && SEA_TILE_SET.has(I(d.type))) || SEA_WALL_SET.has(I(d.wall))) return true; } catch(e){}
    }
    return false;
}
function FindSeaMouth() {
    const key=SeaMouthKey(); if(MouthCache.key===key&&MouthCache.x>0)return{x:MouthCache.x,y:MouthCache.y};
    MouthCache.key=key; MouthCache.x=-1; MouthCache.y=-1;
    const l=Math.max(8,I(SulphurousSeaPreviewRuntime.BoundsLeft,8)), r=Math.min(MaxX()-9,I(SulphurousSeaPreviewRuntime.BoundsRight,OfficialChasmX()+160));
    const t=Math.max(35,I(SulphurousSeaPreviewRuntime.BoundsTop,Surface()-55)), b=Math.min(MaxY()-10,I(SulphurousSeaPreviewRuntime.BoundsBottom,StartYForMouth()+180));
    const official=OfficialChasmX();
    for(let y=b;y>=t;y-=2){
        let bestRun=null, runStart=-1, runEnd=-1;
        for(let x=l;x<=r;x+=2){
            let wet=false; try{const d=new TileData(x,y); wet=!Active(d)&&N(d.liquid)>=160&&SeaMaterialNeighbor(x,y);}catch(e){}
            if(wet){if(runStart<0)runStart=x;runEnd=x;}
            else if(runStart>=0){if(runEnd-runStart>=6){const cx=I((runStart+runEnd)/2);const score=(runEnd-runStart)-Math.abs(cx-official)*.03;if(!bestRun||score>bestRun.score)bestRun={x:cx,score};}runStart=runEnd=-1;}
        }
        if(runStart>=0&&runEnd-runStart>=6){const cx=I((runStart+runEnd)/2);const score=(runEnd-runStart)-Math.abs(cx-official)*.03;if(!bestRun||score>bestRun.score)bestRun={x:cx,score};}
        if(bestRun){MouthCache.x=bestRun.x;MouthCache.y=y;return{x:bestRun.x,y};}
    }
    MouthCache.x=official; MouthCache.y=-1; return{x:official,y:-1};
}
function StartYForMouth(){return Math.max(Surface()+25,I((I(SulphurousSeaPreviewRuntime.BoundsTop,Surface()-55)+Surface())/2+90));}

// The mouth detector is allowed to choose an anchor only once. Once terrain has been
// generated, the saved anchor is authoritative. During the v10 -> v11 migration we also
// look just beyond the currently saved edge for the characteristic v9 unified-proxy seam:
// tile 683 at deep layers paired with the old Gravel/Pyre/Void wall IDs. This lets an
// already-tested v10 world recover the exact v9/pre-Abyss mouth anchor even though v10 may
// already have overwritten WorldDB.chasmX with its shifted value.
const AnchorState = { key: '', x: -1, source: 'unset', recoverLegacy: false };
function ValidAnchorX(x) { x = I(x, -1); return x >= 24 && x <= MaxX() - 24; }
function SavedChasmX() {
    try { const x = I(WorldDB.get(Key('chasmX')), -1); return ValidAnchorX(x) ? x : -1; } catch (e) { return -1; }
}
function DetectedChasmX() { const q = FindSeaMouth(); return q && ValidAnchorX(q.x) ? I(q.x) : OfficialChasmX(); }
function LegacyAnchorSampleYs() {
    const h = MaxY(), top = FillTop(), bottom = FillBottom() - 1, rock = Rock();
    const raw = [rock + h * .035, rock + h * .08, rock + h * .18, rock + h * .235, rock + h * .285, bottom - 18];
    const out = [];
    for (const yy of raw) { const y = Math.max(top + 8, Math.min(bottom - 8, I(yy))); if (!out.includes(y)) out.push(y); }
    return out;
}
function LegacyV9SeamScore(x, ys) {
    let score = 0;
    for (const y of ys) {
        if (!InWorld(x, y)) continue;
        try {
            const d = new TileData(x, y), w = I(d.wall);
            // v9 used SHALE/683 as the physical tile for every depth, while its wall still
            // encoded the real layer. In v10/v11 these deep wall/tile combinations cannot
            // be produced by the normal four-material fill.
            if (Active(d) && I(d.type) === SHALE && (w === WALL_GRAVEL || w === WALL_PYRE || w === WALL_VOID)) score++;
        } catch (e) { }
    }
    return score;
}
function RecoverLegacyAnchor(baseX) {
    baseX = I(baseX, OfficialChasmX());
    const ys = LegacyAnchorSampleYs(), reach = 220, need = Math.max(2, Math.min(3, ys.length));
    if (AtLeft()) {
        const edge = Math.min(MaxX() - 4, baseX + 160);
        let outer = -1, hits = 0, gap = 0;
        for (let x = edge; x <= Math.min(MaxX() - 4, edge + reach); x++) {
            if (LegacyV9SeamScore(x, ys) >= need) { outer = x; hits++; gap = 0; }
            else if (outer >= 0 && ++gap > 10 && hits >= 4) break;
        }
        if (outer >= edge + 3 && hits >= 4) { const x = outer + 1 - 160; if (ValidAnchorX(x) && Math.abs(x - baseX) <= reach + 8) return x; }
    } else {
        const edge = Math.max(3, baseX - 160);
        let outer = -1, hits = 0, gap = 0;
        for (let x = edge - 1; x >= Math.max(3, edge - reach); x--) {
            if (LegacyV9SeamScore(x, ys) >= need) { outer = x; hits++; gap = 0; }
            else if (outer >= 0 && ++gap > 10 && hits >= 4) break;
        }
        if (outer >= 3 && outer <= edge - 3 && hits >= 4) { const x = outer + 160; if (ValidAnchorX(x) && Math.abs(x - baseX) <= reach + 8) return x; }
    }
    return -1;
}
function AnchorKey() { return `${Seed()}:${MaxX()}:${MaxY()}:${AtLeft()?1:0}:${AnchorState.recoverLegacy?1:0}`; }
function ChasmX() {
    const key = AnchorKey();
    if (AnchorState.key === key && ValidAnchorX(AnchorState.x)) return AnchorState.x;
    if (FreshWorldContext.active) {
        AnchorState.key = key; AnchorState.x = OfficialChasmX(); AnchorState.source = 'official-fresh-worldgen';
        return AnchorState.x;
    }
    // PlaceAbyss does not detect a sea mouth: its X is fixed at 170 / maxTilesX-170.
    // Preserve a previously generated test world's saved anchor only so migrating that same
    // world cannot leave another destructive side strip. A world that has never generated
    // the Abyss has no saved anchor and therefore always takes the official value.
    const saved = SavedChasmX();
    const x = ValidAnchorX(saved) ? saved : OfficialChasmX();
    AnchorState.key = key;
    AnchorState.x = I(x);
    AnchorState.source = ValidAnchorX(saved) ? 'saved-migration' : 'official';
    return AnchorState.x;
}
function AbyssBottom() { return MaxY() - 350; }
function FillTop() { return Math.max(3, I(Rock() - MaxY() / 15 + 35) + 1); }
function FillBottom() { return Math.min(MaxY() - 3, MaxY() - 200); }
function BaseRegionLeft() { return AtLeft() ? 3 : Math.max(3, ChasmX() - 160); }
function BaseRegionRight() { return AtLeft() ? Math.min(MaxX() - 3, ChasmX() + 160) : MaxX() - 3; }
function DungeonCellValues(type, wall) {
    return DUNGEON_TILES.has(I(type)) || DUNGEON_WALLS.has(I(wall));
}
function DungeonX() {
    let x = Math.floor(MaxX() * 0.5);
    try {
        const q = I(Terraria.Main.dungeonX, x);
        if (q > 20 && q < MaxX() - 20) x = q;
    } catch (_) { }
    return x;
}
function DungeonGuardKey() {
    return `${Seed()}:${MaxX()}:${MaxY()}:${AtLeft()?1:0}:${ChasmX()}:${DungeonX()}`;
}
function EnsureDungeonGuard() {
    const key = DungeonGuardKey();
    if (DungeonGuard.key === key && DungeonGuard.l >= 0 && DungeonGuard.r > DungeonGuard.l)
        return DungeonGuard;

    const baseL = BaseRegionLeft(), baseR = BaseRegionRight();
    const dungeonX = DungeonX();
    let l = baseL, r = baseR;

    // Keep a wide ocean-side buffer from the Dungeon entrance without touching Main.tile.
    // The chasm keeps a minimum usable width even on pathological seeds.
    if (AtLeft()) {
        const wanted = dungeonX - DUNGEON_GUARD_BUFFER;
        r = Math.min(baseR, Math.max(ChasmX() + 80, wanted));
    } else {
        const wanted = dungeonX + DUNGEON_GUARD_BUFFER;
        l = Math.max(baseL, Math.min(ChasmX() - 80, wanted));
    }

    l = Math.max(3, Math.min(l, MaxX() - 4));
    r = Math.max(l + 1, Math.min(r, MaxX() - 3));

    DungeonGuard.key = key;
    DungeonGuard.l = l;
    DungeonGuard.r = r;
    DungeonGuard.dungeonX = dungeonX;

    if (!DungeonGuard.logged) {
        DungeonGuard.logged = true;
        try {
            tl.log(`[CalamityPort AbyssDungeonGuard] coordinate-only; side=${AtLeft()?'left':'right'}; dungeonX=${dungeonX}; base=${baseL}..${baseR}; region=${l}..${r}; buffer=${DUNGEON_GUARD_BUFFER}.`);
        } catch (_) { }
    }
    return DungeonGuard;
}
function RegionLeft() { return EnsureDungeonGuard().l; }
function RegionRight() { return EnsureDungeonGuard().r; }
function Seed() { let s = I(Terraria.Main.worldID, 1); try { s ^= I(Terraria.Main.ActiveWorldFileData?.Seed, 0); } catch (e) { } return s | 0; }
function Hash(x, y, s = 0) { let h = (I(x) * 374761393 + I(y) * 668265263 + Seed() * 69069 + I(s) * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function RNG(s) { let q = (I(s, 1) | 0) || 1; return { next() { q ^= q << 13; q ^= q >>> 17; q ^= q << 5; return (q >>> 0) / 4294967296; }, int(a, b) { a = I(a); b = I(b); return b <= a ? a : a + Math.floor(this.next() * (b - a)); }, bool(n = 2) { return this.int(0, n) === 0; } }; }
function NativeBoolAt(a, i) { i = I(i, -1); if (!a || i < 0) return false; try { if (typeof a.get_Item === 'function') return B(a.get_Item(i)); } catch (e) { } try { const g = a['bool get_Item(int index)']; if (typeof g === 'function') return B(g(i)); } catch (e) { } return false; }
// Worldgen safety tables are immutable for the lifetime of a loaded mod. Cache the tiny
// per-ID answers so hundreds of thousands of Abyss cells do not cross the IL2CPP bridge
// just to ask tileFrameImportant/wallHouse the same questions over and over.
const FrameImportantCache = new Map();
const HouseWallCache = new Map();
function FrameImportant(t) {
    t = I(t);
    if (FrameImportantCache.has(t)) return FrameImportantCache.get(t) === true;
    let value = false; try { value = NativeBoolAt(Terraria.Main.tileFrameImportant, t); } catch (e) { value = false; }
    FrameImportantCache.set(t, value === true); return value === true;
}
function ProxyWall(w) { w = I(w); return w === WALL_SHALE || w === WALL_GRAVEL || w === WALL_PYRE || w === WALL_VOID; }
function HouseWall(w) {
    w = I(w); if (ProxyWall(w) || w <= 0) return false;
    if (HouseWallCache.has(w)) return HouseWallCache.get(w) === true;
    let value = false; try { value = NativeBoolAt(Terraria.Main.wallHouse, w); } catch (e) { value = false; }
    HouseWallCache.set(w, value === true); return value === true;
}
function Active(d) { return (I(d.sHeader) & ACTIVE_TILE) !== 0; }
function SetActive(d, v) { let h = I(d.sHeader); d.sHeader = v ? (h | ACTIVE_TILE) : (h & ~ACTIVE_TILE); }
function TryColor(d, c) { try { const t = d?.tile; if (t && typeof t['void color(byte color)'] === 'function') { t['void color(byte color)'](I(c)); return true; } } catch (e) { } return false; }
function TryWallColor(d, c) { try { const t = d?.tile; if (t && typeof t['void wallColor(byte wallColor)'] === 'function') { t['void wallColor(byte wallColor)'](I(c)); return true; } } catch (e) { } return false; }
function SetWater(d, a = 255) { d.liquid = Math.max(0, Math.min(255, I(a))); try { const t = d.tile; if (t && typeof t['void liquidType(int liquidType)'] === 'function') t['void liquidType(int liquidType)'](0); } catch (e) { } }
function Safe(d) { const t = I(d.type), w = I(d.wall); if (DungeonCellValues(t, w) || HouseWall(w)) return false; if (Active(d) && (PROTECTED.has(t) || FrameImportant(t))) return false; return true; }
function SulphReady() { try { if (B(SulphurousSeaTerrainRuntime.Generated)) return true; } catch (e) { } try { return String(SulphurousSeaTerrainRuntime.GetStatus()).includes('generated=true'); } catch (e) { return false; } }
function Proxy(kind) { if (kind === KIND.GRAVEL) return GRAVEL; if (kind === KIND.PYRE) return PYRE; if (kind === KIND.VOID) return VOID; if (kind === KIND.PLANTY) return PLANTY; if (kind === KIND.SCORIA) return SCORIA; if (kind === KIND.MOLTEN) return MOLTEN; return SHALE; }
function WallProxy(kind) { if (kind === KIND.GRAVEL) return WALL_GRAVEL; if (kind === KIND.PYRE) return WALL_PYRE; if (kind === KIND.VOID) return WALL_VOID; return WALL_SHALE; }
function LegacyProxy(t) { t = I(t); return t === LEGACY_FOSSIL || t === LEGACY_V6 || t === SHALE || t === GRAVEL || t === PYRE || t === VOID || t === PLANTY || t === SCORIA || t === MOLTEN || t === LEGACY_GRAVEL || t === LEGACY_PYRE || t === LEGACY_VOID; }

function BackgroundKind(x, y) {
    if (x < RegionLeft() || x >= RegionRight() || y < FillTop() || y >= FillBottom()) return KIND.NONE;
    const rock = Rock(), h = MaxY(), yy = N(y);
    if (yy > rock + h * .27) return KIND.VOID;
    if (yy > rock + h * .268) return Hash(x, y, 201) < .5 ? KIND.VOID : KIND.PYRE;
    if (yy > rock + h * .145) return KIND.PYRE;
    if (yy > rock + h * .143) return Hash(x, y, 202) < .5 ? KIND.PYRE : KIND.GRAVEL;
    if (yy >= rock - 10 && yy <= rock) return Hash(x, y, 203) < .5 ? KIND.GRAVEL : KIND.SHALE;
    if (yy <= rock - 10) return KIND.SHALE;
    return KIND.GRAVEL;
}

function SetMaterial(d, kind, wallKind = kind) {
    if (!Safe(d) || kind <= 0 || kind === KIND.WATER) return false;
    SetActive(d, true);
    d.type = Proxy(kind);
    d.frameX = -1; d.frameY = -1;
    // Special clumps replace only the tile in the official source. Keep the wall belonging
    // to the host island/layer instead of inventing a separate Planty/Scoria/Molten wall.
    d.wall = WallProxy(wallKind);
    d.liquid = 0;
    // Keep tile paint clear. v10 handles the minimap through MapHelper's official
    // Calamity colors instead of Terraria paint, which avoids the old neon band artifact.
    TryColor(d, 0); TryWallColor(d, 0);
    return true;
}
function Carve(d, wallKind) {
    if (!Safe(d)) return false;
    SetActive(d, false); d.frameX = 0; d.frameY = 0;
    if (!HouseWall(d.wall) && (!ProxyWall(d.wall) || I(d.wall) === 0)) d.wall = WallProxy(wallKind || KIND.SHALE);
    TryColor(d, 0); TryWallColor(d, 0); SetWater(d, 255); return true;
}

// Official Sulphurous Sea helpers used only to reconstruct the three ChasmGenerator probe
// columns. PlaceSulphurSea lays down a solid sand block before PlaceAbyss runs, but the TLPro
// mobile sea foundation is deliberately less invasive and may leave those columns as water.
// Without this model the ocean probe falls all the way to FillTop(), producing the narrow neck
// seen in v19 instead of the official seafloor entrance.
const SulphProbeCache = { key: '', yStart: -1, starts: [-1, -1, -1] };
const FreshWorldContext = { active: false, yStart: -1 };
function OfficialSulphWidth() { const x = MaxX(); return x === 4200 ? 370 : (x === 6400 ? 445 : Math.max(280, I(x / 16.8))); }
function SulphProbeKey() { return `${Seed()}:${MaxX()}:${MaxY()}:${AtLeft()?1:0}:${SurfaceLow()}:${Rock()}:${ChasmX()}`; }
function FindOfficialSulphYStart() {
    const key = SulphProbeKey(); if (SulphProbeCache.key === key && SulphProbeCache.yStart > 0) return SulphProbeCache.yStart;
    SulphProbeCache.key = key; SulphProbeCache.yStart = -1; SulphProbeCache.starts = [-1, -1, -1];
    if (FreshWorldContext.active && FreshWorldContext.yStart > 0) {
        SulphProbeCache.yStart = I(FreshWorldContext.yStart);
        return SulphProbeCache.yStart;
    }
    const w = OfficialSulphWidth();
    let localX = w + 1;
    const firstY = Math.max(20, SurfaceLow() - 20), stop = Math.min(MaxY() - 10, firstY + 900);
    // Mirrors DetermineYStart(): search just inland from the sea, moving one tile toward the
    // world edge if the first floor is Ebonstone. TileID.Ebonstone = 25.
    for (let attempt = 0; attempt < 48; attempt++, localX++) {
        const x = AtLeft() ? localX : (MaxX() - 1 - localX);
        if (!InWorld(x, firstY)) continue;
        for (let y = firstY; y <= stop; y++) {
            try {
                const d = new TileData(x, y);
                if (!Active(d)) continue;
                if (I(d.type) === 25) break;
                SulphProbeCache.yStart = y; return y;
            } catch (e) { }
        }
    }
    // The preview's coastal anchor is the safest fallback if the vanilla lookup is unavailable.
    SulphProbeCache.yStart = Math.max(35, I(SulphurousSeaPreviewRuntime.BoundsTop, Surface() - 55) + 55);
    return SulphProbeCache.yStart;
}
function OfficialSulphBlockDepth(yStart) {
    const x = MaxX(), factor = x === 4200 ? .8 : (x === 6400 ? .85 : .925);
    return Math.max(1, I((Rock() + 112 - I(yStart)) * factor));
}

const SulphWaterProfileCache = { key: '', openWidth: 0, top: 0, surface: 0, maxBottom: 0, totalSand: 0, smooth: 0 };
function OfficialSulphTopWaterProfile() {
    const yStart = FindOfficialSulphYStart();
    const biomeWidth = OfficialSulphWidth();
    const blockDepth = OfficialSulphBlockDepth(yStart);
    const key = `${SulphProbeKey()}:${yStart}:${biomeWidth}:${blockDepth}`;
    if (SulphWaterProfileCache.key === key && SulphWaterProfileCache.openWidth > 0) return SulphWaterProfileCache;
    // Source RNG ranges: Next(32,45), NextFloat(.26,.39). We cannot recover the desktop
    // genRand state after world creation, so use one stable world-seed draw for each value.
    const totalSand = 32 + Math.floor(Hash(biomeWidth, yStart, 11201) * 13);
    const openWidth = Math.max(1, Math.floor((biomeWidth - totalSand) * .795));
    const smooth = .26 + Hash(yStart, biomeWidth, 11202) * (.39 - .26);
    const top = yStart - 20;
    const surface = top + 12; // GenerateShallowTopWater clears liquid through top + DepthForWater.
    const maxTopDepth = Math.max(1, I(blockDepth * .125));
    const maxBottom = Math.min(MaxY() - 4, top + maxTopDepth * 2 + 2);
    SulphWaterProfileCache.key = key; SulphWaterProfileCache.openWidth = openWidth;
    SulphWaterProfileCache.top = top; SulphWaterProfileCache.surface = surface;
    SulphWaterProfileCache.maxBottom = maxBottom; SulphWaterProfileCache.totalSand = totalSand;
    SulphWaterProfileCache.smooth = smooth; return SulphWaterProfileCache;
}
function SulphLocalX(worldX) { return AtLeft() ? I(worldX) : I(MaxX() - 1 - worldX); }
function OfficialSulphTopWaterBottom(worldX) {
    const p = OfficialSulphTopWaterProfile(), localX = SulphLocalX(worldX);
    if (localX < 1 || localX >= p.openWidth) return p.surface;
    const u = Math.max(0, Math.min(1, 1 - localX / Math.max(1, p.openWidth)));
    const factor = Math.pow(Math.max(0, Math.sin(u * Math.PI * .5)), p.smooth);
    const maxTopDepth = Math.max(1, I(OfficialSulphBlockDepth(FindOfficialSulphYStart()) * .125));
    return Math.min(MaxY() - 4, p.top + I(maxTopDepth * factor * 2));
}
function SulphMouthBounds() {
    const p = OfficialSulphTopWaterProfile();
    if (AtLeft()) return { l: 3, r: Math.min(MaxX() - 3, p.openWidth + 2), t: Math.max(3, p.surface), b: p.maxBottom + 1 };
    return { l: Math.max(3, MaxX() - p.openWidth - 2), r: MaxX() - 3, t: Math.max(3, p.surface), b: p.maxBottom + 1 };
}
function IsSulphMouthCell(x, y) {
    const p = OfficialSulphTopWaterProfile(), lx = SulphLocalX(x);
    if (lx < 1 || lx >= p.openWidth || y < p.surface) return false;
    return y < OfficialSulphTopWaterBottom(x);
}
function CarveSulphMouthCell(d, y) {
    if (!Safe(d)) return false;
    SetActive(d, false); d.frameX = 0; d.frameY = 0; SetWater(d, 255); TryColor(d, 0);
    // The source applies UnsafeSulphurousSandWall 22-24 tiles below water cells once deep
    // enough. Keep existing walls here; the visual/material systems already own sea walls and
    // replacing them during a migration would be more destructive than the missing water was.
    return true;
}
function OfficialSulphProbeFloor(pass) {
    pass = I(pass);
    const key = SulphProbeKey(); if (SulphProbeCache.key !== key) FindOfficialSulphYStart();
    if (SulphProbeCache.starts[pass] > 0) return SulphProbeCache.starts[pass];
    const i = ChasmX() + (pass === 1 ? -22 : (pass === 2 ? 22 : 0));
    const probeX = i + (AtLeft() ? 125 : -125);
    const localX = AtLeft() ? probeX : (MaxX() - 1 - probeX);
    const biomeWidth = OfficialSulphWidth(), width = biomeWidth + 1;
    const baseStart = Math.max(20, SurfaceLow() + (pass === 0 ? 65 : 0));
    const yStart = FindOfficialSulphYStart();
    if (localX < 1 || localX >= width) { SulphProbeCache.starts[pass] = -1; return -1; }

    const blockDepth = OfficialSulphBlockDepth(yStart);
    const u = Math.max(0, Math.min(1, 1 - localX / width));
    const sandFactor = Math.pow(Math.max(0, Math.sin(u * Math.PI * .5)), .24);
    const sandBottom = yStart + I(blockDepth * sandFactor);
    if (sandBottom <= baseStart) { SulphProbeCache.starts[pass] = -1; return -1; }

    // GenerateShallowTopWater may clear the top of the sand block. Use the exact source
    // equations with deterministic world-seed parameters for the two RNG values. On small
    // worlds the three Abyss probe columns are beyond the open-water width, so this naturally
    // resolves to YStart / worldSurfaceLow+65 exactly as on desktop.
    const totalSand = 32 + Math.floor(Hash(pass, localX, 9201) * 13); // Next(32,45)
    const openWidth = Math.floor((biomeWidth - totalSand) * .795);
    let firstSolid = Math.max(baseStart, yStart);
    if (localX >= 1 && localX < openWidth) {
        const maxTopDepth = I(blockDepth * .125);
        const waterU = Math.max(0, Math.min(1, 1 - localX / Math.max(1, openWidth)));
        const smooth = .26 + Hash(localX, pass, 9202) * (.39 - .26);
        const waterFactor = Math.pow(Math.max(0, Math.sin(waterU * Math.PI * .5)), smooth);
        const waterBottom = (yStart - 20) + I(maxTopDepth * waterFactor * 2);
        firstSolid = Math.max(firstSolid, waterBottom);
    }
    if (firstSolid >= sandBottom) { SulphProbeCache.starts[pass] = -1; return -1; }
    SulphProbeCache.starts[pass] = firstSolid; return firstSolid;
}
function IsPreAbyssProbeSolid(d) {
    if (!d || !Active(d)) return false;
    const t = I(d.type);
    // Ignore our own generated Abyss storage tiles when rebuilding an existing world.
    return !LegacyProxy(t);
}

// ChasmGenerator runs after PlaceAbyss has filled its side region. First honor any real
// pre-Abyss solid that survived above FillTop. If TLPro's lighter Sulphurous Sea omitted the
// official sand foundation at the +/-125 probe column, reconstruct the floor from the source
// GenerateSandBlock / GenerateShallowTopWater profile. Only then may the filled Abyss rectangle
// act as the fallback floor. This changes the entrance only; the v19 deep chasm is untouched.
function StartProbe(pass) {
    const i = ChasmX() + (pass === 1 ? -22 : (pass === 2 ? 22 : 0));
    const probeX = i + (AtLeft() ? 125 : -125);
    const start = Math.max(20, SurfaceLow() + (pass === 0 ? 65 : 0));
    const fillTop = FillTop();
    if (FreshWorldContext.active) {
        // During ShimmerCleanUp the official-style Sulphurous foundation already exists in
        // Main.tile. Use the real probe column just like ChasmGenerator instead of modeling it.
        for (let y = start; y < Math.min(fillTop, AbyssBottom() + 80); y++) {
            try {
                const t = Terraria.Main.tile.get_Item(probeX, y);
                if (t && t['bool active()']() === true && !LegacyProxy(I(t.type)))
                    return y;
            } catch (e) { }
        }
        const filledStart = Math.max(start, fillTop);
        if (probeX >= RegionLeft() && probeX < RegionRight() && filledStart < FillBottom()) return filledStart;
        return start;
    }
    const beforeFillEnd = Math.min(fillTop - 1, AbyssBottom() + 80, MaxY() - 5);
    for (let y = start; y <= beforeFillEnd; y++) {
        try { const d = new TileData(probeX, y); if (IsPreAbyssProbeSolid(d)) return y; } catch (e) { }
    }
    const modeled = OfficialSulphProbeFloor(pass);
    if (modeled >= start && modeled < fillTop) return modeled;
    const filledStart = Math.max(start, fillTop);
    if (probeX >= RegionLeft() && probeX < RegionRight() && filledStart < FillBottom()) return filledStart;
    const stop = Math.min(MaxY() - 5, AbyssBottom() + 80);
    for (let y = filledStart; y <= stop; y++) {
        try { const d = new TileData(probeX, y); if (Active(d)) return y; } catch (e) { }
    }
    return start;
}
function SmallHoleLimit() { return MaxY() > 2100 ? 1950 : (MaxY() > 1500 ? 1360 : 790); }
function AddSpan(rows, y, l, r) {
    y = I(y); if (y < 0 || y >= MaxY()) return;
    if (r < l) { const q = l; l = r; r = q; }
    let a = rows[y];
    if (!a) { rows[y] = [[l, r]]; return; }

    // BuildWater adds thousands of heavily-overlapping diamonds. Keeping each row as an
    // already-merged interval list avoids allocating/sorting tens of thousands of temporary
    // [left,right] arrays at the end. Most calls hit one of these O(1) fast paths.
    const last = a[a.length - 1];
    if (l > last[1] + 1) { a.push([l, r]); return; }
    if (l >= last[0] && l <= last[1] + 1) { if (r > last[1]) last[1] = r; return; }

    let i = 0;
    while (i < a.length && a[i][1] + 1 < l) i++;
    if (i >= a.length) { a.push([l, r]); return; }
    let nl = l, nr = r, j = i;
    while (j < a.length && a[j][0] <= nr + 1) {
        if (a[j][0] < nl) nl = a[j][0];
        if (a[j][1] > nr) nr = a[j][1];
        j++;
    }
    if (j === i) a.splice(i, 0, [nl, nr]);
    else a.splice(i, j - i, [nl, nr]);
}
function MergeRows(rows) { return rows; }

function AddDiamond(rows, cx, cy, r, pass, salt, outer = false, startY = 0) {
    // v25 BuildWater fast path. The old planner iterated every X coordinate inside the
    // guaranteed 92.5% core even though those cells can never fail the source test.
    // Emit that core as one span and evaluate only the two 7.5% uncertainty fringes.
    // The first gated outer rows (rel 8..15) retain the exact per-cell path because their
    // second hash can punch holes through the otherwise-guaranteed core.
    const minFactor = .925, maxFactor = 1.075;
    const y0 = Math.max(0, Math.floor(cy - r * maxFactor));
    const y1 = Math.min(MaxY() - 1, Math.ceil(cy + r * maxFactor));
    const geomSalt = 3001 + salt + pass * 977;
    const gateSalt = 7001 + salt + pass * 131;
    for (let y = y0; y <= y1; y++) {
        const dy = Math.abs(y - cy);
        const maxHalf = r * maxFactor - dy;
        if (maxHalf <= 0) continue;
        const coreHalf = Math.max(0, r * minFactor - dy);
        const leftMax = Math.ceil(cx - maxHalf), rightMax = Math.floor(cx + maxHalf);
        const leftCore = Math.ceil(cx - coreHalf), rightCore = Math.floor(cx + coreHalf);
        const rel = y - startY;
        if (outer && rel <= 7) continue;

        if (outer && rel <= 15) {
            let run = -1;
            for (let x = leftMax; x <= rightMax; x++) {
                const ax = Math.abs(x - cx);
                let inside;
                if (x >= leftCore && x <= rightCore) inside = true;
                else {
                    const jitter = (Math.floor(Hash(x, y, geomSalt) * 11) - 5) * .015;
                    inside = ax + dy < r * (1 + jitter);
                }
                if (inside) {
                    const gate = 7 + Math.floor(Hash(x, y, gateSalt) * 9);
                    inside = rel > gate;
                }
                if (inside) { if (run < 0) run = x; }
                else if (run >= 0) { AddSpan(rows, y, run, x - 1); run = -1; }
            }
            if (run >= 0) AddSpan(rows, y, run, rightMax);
            continue;
        }

        // When the guaranteed core is sub-pixel thin there is no integer core span.
        // Scan the tiny whole row exactly rather than adding special cases.
        if (leftCore > rightCore) {
            let run = -1;
            for (let x = leftMax; x <= rightMax; x++) {
                const jitter = (Math.floor(Hash(x, y, geomSalt) * 11) - 5) * .015;
                const inside = Math.abs(x - cx) + dy < r * (1 + jitter);
                if (inside) { if (run < 0) run = x; }
                else if (run >= 0) { AddSpan(rows, y, run, x - 1); run = -1; }
            }
            if (run >= 0) AddSpan(rows, y, run, rightMax);
            continue;
        }

        let run = -1;
        for (let x = leftMax; x < leftCore; x++) {
            const jitter = (Math.floor(Hash(x, y, geomSalt) * 11) - 5) * .015;
            const inside = Math.abs(x - cx) + dy < r * (1 + jitter);
            if (inside) { if (run < 0) run = x; }
            else if (run >= 0) { AddSpan(rows, y, run, x - 1); run = -1; }
        }
        if (run >= 0) AddSpan(rows, y, run, leftCore - 1);

        AddSpan(rows, y, leftCore, rightCore);

        run = -1;
        for (let x = rightCore + 1; x <= rightMax; x++) {
            const jitter = (Math.floor(Hash(x, y, geomSalt) * 11) - 5) * .015;
            const inside = Math.abs(x - cx) + dy < r * (1 + jitter);
            if (inside) { if (run < 0) run = x; }
            else if (run >= 0) { AddSpan(rows, y, run, x - 1); run = -1; }
        }
        if (run >= 0) AddSpan(rows, y, run, rightMax);
    }
}

const Geo = { key: '', water: null, islands: null, connector: null };
function GKey() { return `${Seed()}:${MaxX()}:${MaxY()}:${AtLeft() ? 1 : 0}:${Rock()}:${ChasmX()}:${I(SulphurousSeaPreviewRuntime.BoundsTop)}:${I(SulphurousSeaPreviewRuntime.BoundsBottom)}`; }

function BuildRecoveryConnector() {
    // Deliberately disabled in v13. PlaceAbyss only invokes its three ChasmGenerator passes;
    // there is no fourth hand-built tunnel from the Sulphurous Sea mouth.
    // Phase 13.13.0.5: do not rebuild/probe the Abyss geometry for diagnostic-only connector
    // coordinates. The old targetY calculation called StartProbe three times even though
    // used=false, which could force a multi-second Main.tile/TileData scan on Android.
    return { used: false, sourceX: -1, sourceY: -1, targetX: ChasmX(), targetY: -1 };
}

function BuildWater() {
    const key = GKey(); if (Geo.key === key && Geo.water) return Geo.water;
    const rows = new Array(MaxY());
    for (let pass = 0; pass < 3; pass++) {
        const rng = RNG((Seed() ^ ((pass + 1) * 0x45d9f3b)) | 0);
        const i = ChasmX() + (pass === 1 ? -22 : (pass === 2 ? 22 : 0));
        const j = StartProbe(pass);
        let px = i, py = j;
        let dx = rng.int(-1, 2) * .1;
        const dy = rng.int(3, 8) * .2 + .5;
        let width = rng.int(5, 7) + 20;
        let maxSize = AbyssBottom();
        let guard = 0;
        while (width > 0 && guard++ < 2400) {
            if (maxSize > 0) {
                width += rng.int(0, 10); width -= rng.int(0, 10);
                if (maxSize > SmallHoleLimit()) width = Math.max(7, Math.min(45, width));
                else { width = Math.max(30, Math.min(70, width)); if (maxSize === 1 && width < 50) width = 50; }
            } else if (py > AbyssBottom()) width -= rng.int(0, 5) + 8;
            if (py > AbyssBottom() && maxSize > 0) maxSize = 0;
            maxSize -= 1;
            if (maxSize > 5) AddDiamond(rows, px, py, width * .5, pass, 401 + guard, false, j);
            px += dx; py += dy;
            dx += rng.int(-1, 2) * .01;
            dx = Math.max(-.02, Math.min(.02, dx));
            AddDiamond(rows, px, py, width * 1.1, pass, 701 + guard, true, j);
        }
    }
    MergeRows(rows);
    Geo.key = key; Geo.water = rows; Geo.islands = null;
    return rows;
}
function InRows(rows, x, y) { const a = rows[I(y)]; if (!a) return false; for (const q of a) if (x >= q[0] && x <= q[1]) return true; return false; }

// v24 geometry planner: island construction used to allocate one JS Array object for every
// single island cell and then sort/merge those objects row-by-row. On Android that pure-JS
// allocation/sort stage was the largest part of the ~5s geometry phase. The source writes
// island cells sequentially, so a byte grid can keep the final kind/wall for each coordinate
// directly. For a given (x,y), the old stable x-sort also made the last inserted singleton win;
// therefore this produces the same final topology/material identity without the allocation storm.
function NewIslandGrid() {
    const h = MaxY(), w = MaxX();
    return { w, h, cells: new Array(h), min: new Int32Array(h), max: new Int32Array(h), touched: [] };
}
function IslandCode(kind, wallKind) { return ((I(wallKind, kind) & 15) << 4) | (I(kind) & 15); }
function IslandCellSet(grid, x, y, kind, wallKind = kind) {
    x = I(x); y = I(y);
    if (y < 0 || y >= grid.h || x < 3 || x >= grid.w - 3) return false;
    let row = grid.cells[y];
    if (!row) {
        row = grid.cells[y] = new Uint8Array(grid.w);
        grid.min[y] = x; grid.max[y] = x; grid.touched.push(y);
    } else {
        if (x < grid.min[y]) grid.min[y] = x;
        if (x > grid.max[y]) grid.max[y] = x;
    }
    row[x] = IslandCode(kind, wallKind);
    return true;
}
function IslandRowHasAny(grid, x, y) {
    y = I(y); x = I(x);
    if (y < 0 || y >= grid.h || x < 0 || x >= grid.w) return false;
    const row = grid.cells[y]; return !!row && row[x] !== 0;
}
function IslandGridToRows(grid) {
    const rows = new Array(grid.h);
    for (const y of grid.touched) {
        const src = grid.cells[y]; if (!src) continue;
        const l = grid.min[y], r = grid.max[y];
        const out = []; let code = 0, run = -1;
        for (let x = l; x <= r; x++) {
            const c = src[x];
            if (c === code) continue;
            if (code !== 0 && run >= 0) out.push([run, x - 1, code & 15, (code >> 4) & 15]);
            code = c; run = c !== 0 ? x : -1;
        }
        if (code !== 0 && run >= 0) out.push([run, r, code & 15, (code >> 4) & 15]);
        if (out.length) rows[y] = out;
    }
    return rows;
}
function IslandRowsAdd(rows, cx, cy, minW, maxW, minW2, maxW2, kind, hasChest, hasClumps, hasScoria, rng, salt = 0) {
    // Direct topology port of Abyss.AbyssIsland. The base body is the source's flattened
    // ellipse trail, including the same initial horizontal shove and -0.2 vertical drift.
    // v24 stores the final per-cell identity in a compact byte grid instead of allocating
    // [x,x,kind,wall] arrays for every cell.
    const worldW = rows.w, worldH = rows.h;
    let width = rng.int(minW, maxW), small = rng.int(minW, maxW) / 5;
    let ox = N(cx), oy = N(cy), vx = rng.int(-20, 21) * .2, tries = 0;
    while (vx > -2 && vx < 2 && tries++ < 32) vx = rng.int(-20, 21) * .2;
    let vy = rng.int(-20, -10) * .02, guard = 0;
    let minX = worldW, maxX = -1, minY = worldH, maxY = -1;
    while (width > 0 && small > 0 && guard++ < 96) {
        width -= rng.int(0, 4); small -= 1;
        const extra = width * rng.int(minW, maxW) * .01, r = Math.max(0, extra * .4);
        const x0 = Math.max(3, Math.floor(ox - width * .5)), x1 = Math.min(worldW - 4, Math.ceil(ox + width * .5));
        let yoff = oy + 1;
        for (let x = x0; x < x1; x++) {
            if (rng.bool(2)) yoff += rng.int(-1, 2);
            yoff = Math.max(oy, Math.min(oy + 2, yoff));
            const xdist = Math.abs(x - ox); if (xdist >= r) continue;
            const ydist = Math.sqrt(Math.max(0, r * r - xdist * xdist)) / 3;
            const yt = Math.max(Math.floor(yoff) + 1, Math.ceil(oy - ydist)), yb = Math.floor(oy + ydist);
            for (let y = yt; y <= yb; y++) {
                if (y < 0 || y >= worldH) continue;
                IslandCellSet(rows, x, y, kind, kind);
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
        ox += vx; oy += vy;
        vx += rng.int(-20, 21) * .05; vx = Math.max(-1, Math.min(1, vx));
        if (vy > .2) vy = -.2; if (vy < -.2) vy = -.2;
    }
    if (maxX < minX || maxY < minY) return { minX: I(cx), maxX: I(cx), minY: I(cy), maxY: I(cy) };

    // Source lines 830-875: every AbyssIsland receives small surface clusters. hasClumps
    // only decides whether a 1/3 roll changes the cluster material; it does NOT gate the
    // clusters themselves.
    let m = minX + rng.int(0, 5), clusterGuard = 0;
    while (m < maxX && clusterGuard++ < 96) {
        let islandTileY = maxY, findGuard = 0;
        while (islandTileY >= minY && !IslandRowHasAny(rows, m, islandTileY) && findGuard++ < 128) islandTileY--;
        if (islandTileY < minY) { m += rng.int(1, 4); continue; }
        islandTileY += rng.int(-3, 4);
        const radius = rng.int(4, 8);
        let placedKind = kind;
        if (hasClumps && rng.bool(3)) {
            if (kind !== KIND.PYRE) placedKind = hasScoria ? KIND.SCORIA : KIND.PLANTY;
            else placedKind = hasScoria ? KIND.SCORIA : KIND.MOLTEN;
        }
        const x0 = Math.max(3, m - radius), x1 = Math.min(worldW - 4, m + radius);
        const y0 = Math.max(3, islandTileY - radius), y1 = Math.min(worldH - 4, islandTileY + radius);
        for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= y1; y++) {
                if (y <= minY) continue;
                const xd = Math.abs(x - m), yd = Math.abs(y - islandTileY) * 2;
                const plus = Math.floor(Hash(x, y, 1701 + salt + clusterGuard) * 2), rr = radius + plus;
                if (xd * xd + yd * yd >= rr * rr) continue;
                IslandCellSet(rows, x, y, placedKind, kind);
            }
        }
        const hi = Math.max(radius + 1, Math.floor(radius * 1.5));
        m += rng.int(radius, hi);
    }

    // Consume the source's otherwise-topology-neutral second-width random setup so later
    // island choices stay aligned with the desktop sequence.
    const minSmall2 = Math.max(1, I(minW2 / 8)), maxSmall2 = Math.max(minSmall2 + 1, I(maxW2 / 8));
    rng.int(minW2, maxW2); rng.int(minSmall2, maxSmall2);
    return { minX, maxX, minY, maxY };
}
function BuildIslands() {
    const key = GKey(); if (Geo.key === key && Geo.islands) return Geo.islands;
    const rows = NewIslandGrid(), rng = RNG((Seed() ^ 0x6a09e667) | 0), cx = ChasmX(), rock = Rock(), h = rows.h;
    const chestAnchors = []; let count = 0;
    // PlaceSnailFossil first creates a second Voidstone island at bottom + 47.
    IslandRowsAdd(rows, cx, AbyssBottom() + 47, 55, 75, 35, 45, KIND.VOID, false, false, false, rng, 10); count++;
    // Single island directly under the Terminus shrine.
    IslandRowsAdd(rows, cx, AbyssBottom() + 5, 65, 75, 40, 45, KIND.VOID, false, false, false, rng, 11); count++;

    // Sulphuric Depths islands: exact source case layout and size pairs.
    const yStart = I(SulphurousSeaPreviewRuntime.BoundsTop, Surface() - 55);
    for (let y = Math.max(20, I((yStart + Surface()) / 2 + 90)); y <= rock - 25; y++) {
        const off = rng.int(15, 22), rp = rng.int(35, 80), c = rng.int(0, 5);
        if (c === 0) {
            IslandRowsAdd(rows, cx - rp - 10, y + 15, 60, 65, 45, 55, KIND.SHALE, false, false, false, rng, 100 + y);
            IslandRowsAdd(rows, cx, y, 60, 65, 45, 55, KIND.SHALE, false, false, false, rng, 200 + y);
            IslandRowsAdd(rows, cx + rp + 10, y + 15, 60, 65, 45, 55, KIND.SHALE, false, false, false, rng, 300 + y); count += 3;
        } else if (c === 1) {
            IslandRowsAdd(rows, cx - rp, y + 10, 60, 85, 30, 35, KIND.SHALE, false, false, false, rng, 400 + y);
            IslandRowsAdd(rows, cx, y + 15, 60, 85, 30, 35, KIND.SHALE, false, false, false, rng, 500 + y);
            IslandRowsAdd(rows, cx + rp, y, 60, 85, 30, 35, KIND.SHALE, false, false, false, rng, 600 + y); count += 3;
        } else if (c === 2) {
            IslandRowsAdd(rows, cx - rp, y + 15, 55, 65, 30, 35, KIND.SHALE, false, false, false, rng, 700 + y);
            IslandRowsAdd(rows, cx + rng.int(15, 30), y + 15, 60, 85, 30, 35, KIND.SHALE, false, false, false, rng, 800 + y); count += 2;
        } else if (c === 3) {
            IslandRowsAdd(rows, cx - rng.int(15, 30), y + 10, 55, 65, 30, 35, KIND.SHALE, false, false, false, rng, 900 + y);
            IslandRowsAdd(rows, cx + rp, y + 15, 60, 85, 30, 35, KIND.SHALE, false, false, false, rng, 1000 + y); count += 2;
        } else {
            IslandRowsAdd(rows, cx - rp, y, 60, 75, 30, 40, KIND.SHALE, false, false, false, rng, 1100 + y);
            IslandRowsAdd(rows, cx + rp, y + 5, 60, 75, 30, 40, KIND.SHALE, false, false, false, rng, 1200 + y); count += 2;
        }
        y += off;
    }

    // Murky Waters islands. Save the same one anchor per vertical group that desktop later
    // feeds into AbyssChest; the extra chest-support island is added after the void-island pass.
    let y2 = rock, maxIs = h > 2100 ? 20 : (h > 1500 ? 16 : 11);
    for (let n = 0; n < maxIs; n++) {
        const anchorY = y2, off = rng.int(18, 25), rp = rng.int(45, 80), c = rng.int(0, 5); let anchorX = cx;
        if (c === 0) {
            IslandRowsAdd(rows, cx - rp - 10, y2 + 15, 60, 65, 30, 35, KIND.GRAVEL, false, true, false, rng, 2000 + n * 10);
            IslandRowsAdd(rows, cx, y2, 60, 65, 30, 35, KIND.GRAVEL, true, true, true, rng, 2001 + n * 10);
            IslandRowsAdd(rows, cx + rp + 10, y2 + 15, 60, 65, 30, 35, KIND.GRAVEL, false, true, false, rng, 2002 + n * 10); count += 3;
        } else if (c === 1) {
            IslandRowsAdd(rows, cx - rp, y2 + 10, 60, 65, 30, 35, KIND.GRAVEL, false, true, true, rng, 2010 + n * 10);
            IslandRowsAdd(rows, cx, y2 + 15, 60, 65, 30, 35, KIND.GRAVEL, true, true, false, rng, 2011 + n * 10);
            IslandRowsAdd(rows, cx + rp, y2, 60, 65, 30, 35, KIND.GRAVEL, false, true, false, rng, 2012 + n * 10); anchorX += 30; count += 3;
        } else if (c === 2) {
            IslandRowsAdd(rows, cx - rp - 20, y2, 55, 65, 30, 35, KIND.GRAVEL, false, true, true, rng, 2020 + n * 10);
            IslandRowsAdd(rows, cx + 15, y2 + 15, 55, 65, 30, 35, KIND.GRAVEL, false, true, false, rng, 2021 + n * 10);
            IslandRowsAdd(rows, cx + rp + 20, y2 + 10, 55, 65, 30, 35, KIND.GRAVEL, false, true, false, rng, 2022 + n * 10); anchorX -= 30; count += 3;
        } else if (c === 3) {
            IslandRowsAdd(rows, cx - rp, y2 + 15, 60, 65, 30, 45, KIND.GRAVEL, false, true, false, rng, 2030 + n * 10);
            IslandRowsAdd(rows, cx - 15, y2 + 5, 60, 65, 30, 45, KIND.GRAVEL, false, true, false, rng, 2031 + n * 10);
            IslandRowsAdd(rows, cx + rp, y2, 60, 65, 30, 45, KIND.GRAVEL, true, true, true, rng, 2032 + n * 10); anchorX += 25; count += 3;
        } else {
            IslandRowsAdd(rows, cx - rp, y2, 60, 75, 30, 40, KIND.GRAVEL, true, true, false, rng, 2040 + n * 10);
            IslandRowsAdd(rows, cx, y2 + 15, 60, 75, 30, 40, KIND.GRAVEL, false, true, false, rng, 2041 + n * 10);
            IslandRowsAdd(rows, cx + rp, y2 + 5, 60, 75, 30, 40, KIND.GRAVEL, false, true, false, rng, 2042 + n * 10); anchorX -= 25; count += 3;
        }
        chestAnchors.push({ x: anchorX, y: anchorY });
        y2 += off; if (y2 >= rock + h * .145 - 10) break;
    }

    // Thermal Vents islands.
    for (let y = Math.floor(rock + h * .145); y <= Math.floor(rock + h * .27); y++) {
        const off = rng.int(18, 30), rp = rng.int(40, 75), sourceHasScoria = rng.bool(2), c = rng.int(0, 4);
        if (c === 0) {
            IslandRowsAdd(rows, cx - rp - 10, y + 15, 55, 65, 45, 55, KIND.PYRE, false, true, false, rng, 3000 + y);
            IslandRowsAdd(rows, cx, y, 60, 65, 45, 55, KIND.PYRE, false, true, true, rng, 3100 + y);
            IslandRowsAdd(rows, cx + rp + 10, y + 15, 60, 65, 45, 55, KIND.PYRE, false, true, true, rng, 3200 + y); count += 3;
        } else if (c === 1) {
            IslandRowsAdd(rows, cx - rp, y + 10, 60, 75, 30, 35, KIND.PYRE, false, true, true, rng, 3300 + y);
            IslandRowsAdd(rows, cx, y + 15, 75, 85, 30, 35, KIND.PYRE, false, true, false, rng, 3400 + y);
            IslandRowsAdd(rows, cx + rp, y, 55, 85, 30, 35, KIND.PYRE, false, true, false, rng, 3500 + y); count += 3;
        } else if (c === 2) {
            IslandRowsAdd(rows, cx - rp - 20, y, 55, 65, 30, 35, KIND.PYRE, false, true, true, rng, 3600 + y);
            IslandRowsAdd(rows, cx - 20, y + 15, 60, 70, 30, 35, KIND.PYRE, false, true, false, rng, 3700 + y);
            IslandRowsAdd(rows, cx + rp + 20, y + 10, 65, 70, 30, 35, KIND.PYRE, false, true, true, rng, 3800 + y); count += 3;
        } else {
            IslandRowsAdd(rows, cx - rp, y + 15, 60, 75, 30, 55, KIND.PYRE, false, true, true, rng, 3900 + y);
            IslandRowsAdd(rows, cx + 20, y + 5, 60, 75, 30, 55, KIND.PYRE, false, true, false, rng, 4000 + y);
            IslandRowsAdd(rows, cx + rp, y, 60, 75, 30, 55, KIND.PYRE, false, true, true, rng, 4100 + y); count += 3;
        }
        y += off; if (y >= rock + h * .27 - 10) break;
    }

    // Void islands lining the layer-4 walls.
    for (let y = Math.floor(rock + h * .275); y <= AbyssBottom() - 20; y++) {
        if (rng.bool(8)) {
            const c = rng.int(0, 3), l = c === 0 || c === 2, r = c === 1 || c === 2;
            if (l) { IslandRowsAdd(rows, cx - rng.int(70, 78), y, 65, 85, 35, 45, KIND.VOID, false, false, false, rng, 5000 + y); count++; }
            if (r) { IslandRowsAdd(rows, cx + rng.int(70, 78), y, 65, 85, 35, 45, KIND.VOID, false, false, false, rng, 5100 + y); count++; }
            y += rng.int(20, 32);
        }
    }

    // AbyssChest begins by placing one extra Gravel island at every recorded layer-2 anchor.
    // Chests/loot remain handled by their own future content pass, but the terrain topology is
    // part of PlaceAbyss and therefore belongs here.
    for (let n = 0; n < chestAnchors.length; n++) {
        const a = chestAnchors[n];
        IslandRowsAdd(rows, a.x, a.y + 2, 55, 75, 35, 45, KIND.GRAVEL, false, true, false, rng, 6000 + n); count++;
    }

    const packedRows = IslandGridToRows(rows); const out = { rows: packedRows, count, chestAnchors: chestAnchors.length, chestAnchorList: chestAnchors.map(a => ({ x: I(a.x), y: I(a.y) })) }; Geo.key = key; Geo.islands = out; return out;
}
function IslandKind(x, y) { const a = BuildIslands().rows[I(y)]; if (!a) return null; for (const q of a) if (x >= q[0] && x <= q[1]) return { kind: I(q[2]), wallKind: I(q[3], I(q[2])) }; return null; }
function IslandTop() { const rows = BuildIslands().rows; for (let y = 0; y < rows.length; y++) if (rows[y]?.length) return y; return FillTop(); }
function WaterTop() { const rows = BuildWater(); for (let y = 0; y < rows.length; y++) if (rows[y]?.length) return y; return FillTop(); }
function ContentTop() { return Math.max(3, Math.min(FillTop(), IslandTop(), WaterTop()) - 4); }
function ContentBottom() { return Math.min(MaxY() - 3, FillBottom()); }

function LegacySweepBounds() {
    // v9 could leave unified SHALE/683 columns just beyond a later shifted region edge.
    // Scan only the Abyss-side edge envelope, never the whole world. The retype itself is
    // additionally gated by the impossible v9-only tile/wall pair, so normal terrain is untouched.
    const pad = 240;
    if (AtLeft()) return { l: 3, r: Math.min(MaxX() - 3, RegionRight() + pad), t: FillTop(), b: FillBottom() };
    return { l: Math.max(3, RegionLeft() - pad), r: MaxX() - 3, t: FillTop(), b: FillBottom() };
}
function PhaseBounds(phase) {
    if (phase === 0) return { l: RegionLeft(), r: RegionRight(), t: FillTop(), b: FillBottom() }; // material fill
    if (phase === 5) return LegacySweepBounds(); // migration-only v9 unified-proxy retype
    if (phase === 6) return SulphMouthBounds(); // official GenerateShallowTopWater connection
    return { l: RegionLeft(), r: RegionRight(), t: ContentTop(), b: ContentBottom() }; // carve/islands/cleanup/component cleanup
}
function PhaseTotal(phase) { const q = PhaseBounds(phase); return Math.max(0, (q.r - q.l) * (q.b - q.t)); }
function CellFor(phase, index) { const q = PhaseBounds(phase), w = q.r - q.l; return { x: q.l + (index % w), y: q.t + Math.floor(index / w) }; }

function AdjacentOpen(x, y) {
    let open = 0;
    for (const q of [[1,0],[-1,0],[0,1],[0,-1]]) { try { const d = new TileData(x + q[0], y + q[1]); if (!Active(d)) open++; } catch (e) { } }
    return open;
}

function AbyssBaseProxy(t) { t = I(t); return t === SHALE || t === GRAVEL || t === PYRE || t === VOID; }
function AbyssInitialCleanupProxy(t) { t = I(t); return AbyssBaseProxy(t) || t === PLANTY || t === SCORIA; }
// Phase-4 component bookkeeping is kept in one compact byte per content-region cell instead of
// JavaScript Sets. On Android this avoids hundreds of thousands of boxed keys while still letting
// the official <75-tile AbyssCleanup rule run incrementally without repeating 75-tile probes.
const CleanupState = { marks: null, l: 0, t: 0, w: 0, h: 0 };
function ResetCleanupState(init = false) {
    CleanupState.marks = null; CleanupState.l = CleanupState.t = CleanupState.w = CleanupState.h = 0;
    if (!init) return;
    const q = PhaseBounds(4), w = Math.max(0, q.r - q.l), h = Math.max(0, q.b - q.t);
    CleanupState.l = q.l; CleanupState.t = q.t; CleanupState.w = w; CleanupState.h = h;
    CleanupState.marks = new Uint8Array(Math.max(0, w * h));
}
function CleanupMarkIndex(x, y) {
    const dx = I(x) - CleanupState.l, dy = I(y) - CleanupState.t;
    if (dx < 0 || dy < 0 || dx >= CleanupState.w || dy >= CleanupState.h) return -1;
    return dy * CleanupState.w + dx;
}
function CleanupMarkGet(x, y) { const i = CleanupMarkIndex(x, y); return i < 0 || !CleanupState.marks ? 0 : CleanupState.marks[i]; }
function CleanupMarkSet(x, y, v) { const i = CleanupMarkIndex(x, y); if (i >= 0 && CleanupState.marks) CleanupState.marks[i] = I(v); }
function TouchesKnownLarge(x, y) { return CleanupMarkGet(x + 1, y) === 2 || CleanupMarkGet(x - 1, y) === 2 || CleanupMarkGet(x, y + 1) === 2 || CleanupMarkGet(x, y - 1) === 2; }
function ClearAbyssCellAt(x, y) {
    if (!InWorld(x, y)) return false;
    try {
        const d = new TileData(x, y);
        if (!Active(d) || !AbyssBaseProxy(d.type) || !Safe(d)) return false;
        SetActive(d, false); d.frameX = 0; d.frameY = 0; SetWater(d, 255); TryColor(d, 0);
        return true;
    } catch (e) { return false; }
}
// Source AbyssCleanup recursively gathers a four-neighbor component and deletes it when the
// component contains 1..74 Abyss blocks. This bounded iterative equivalent stops as soon as the
// component reaches the official 75-tile keep threshold. Large-component marks then propagate
// through adjacent cells during the normal row-major pass, keeping the hot path mobile-safe.
function CleanupSmallComponent(seedX, seedY) {
    if (CleanupMarkGet(seedX, seedY) !== 0) return 0;
    let sd = null; try { sd = new TileData(seedX, seedY); } catch (e) { }
    if (!sd || !Active(sd) || !AbyssBaseProxy(sd.type)) { CleanupMarkSet(seedX, seedY, 1); return 0; }
    if (TouchesKnownLarge(seedX, seedY)) { CleanupMarkSet(seedX, seedY, 2); return 0; }
    const key = (x, y) => `${I(x)},${I(y)}`;
    const queue = [[seedX, seedY]], local = [], localSet = new Set([key(seedX, seedY)]); let head = 0, large = false;
    while (head < queue.length) {
        const q = queue[head++], x = q[0], y = q[1]; local.push([x, y]);
        if (local.length >= 75 || CleanupMarkGet(x, y) === 2) { large = true; break; }
        for (const dxy of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = x + dxy[0], ny = y + dxy[1]; if (!InWorld(nx, ny)) continue;
            const mk = CleanupMarkGet(nx, ny); if (mk === 2) { large = true; break; } if (mk === 1) continue;
            const nk = key(nx, ny); if (localSet.has(nk)) continue;
            let d = null; try { d = new TileData(nx, ny); } catch (e) { }
            if (!d || !Active(d) || !AbyssBaseProxy(d.type)) continue;
            localSet.add(nk); queue.push([nx, ny]);
        }
        if (large) break;
    }
    if (large || local.length >= 75) {
        for (const q of local) CleanupMarkSet(q[0], q[1], 2);
        for (let n = head; n < queue.length; n++) CleanupMarkSet(queue[n][0], queue[n][1], 2);
        return 0;
    }
    let cleared = 0;
    for (const q of local) { CleanupMarkSet(q[0], q[1], 1); if (ClearAbyssCellAt(q[0], q[1])) cleared++; }
    return cleared;
}
function NativeTileAt(x, y) {
    try { return Terraria.Main.tile.get_Item(I(x), I(y)); } catch (e) { return null; }
}
function NativeTileActive(t) {
    if (!t) return false;
    try { return t['bool active()']() === true; } catch (e) { return false; }
}
function NativeTileSetActive(t, v) {
    if (!t) return false;
    try { t['void active(bool active)'](v === true); return true; } catch (e) { return false; }
}
function NativeTileCall(t, signature, value) {
    try { const f = t?.[signature]; if (typeof f === 'function') { f(value); return true; } } catch (e) { }
    return false;
}
function NativeSafe(t) {
    if (!t) return false;
    const type = I(t.type), wall = I(t.wall);
    if (DungeonCellValues(type, wall) || HouseWall(wall)) return false;
    if (NativeTileActive(t) && (PROTECTED.has(type) || FrameImportant(type))) return false;
    return true;
}
function NativeSetWater(t, amount = 255) {
    if (!t) return;
    t.liquid = Math.max(0, Math.min(255, I(amount)));
    NativeTileCall(t, 'void liquidType(int liquidType)', 0);
}
function NativeSetMaterial(t, kind, wallKind = kind) {
    if (!NativeSafe(t) || kind <= 0 || kind === KIND.WATER) return false;
    NativeTileSetActive(t, true);
    t.type = Proxy(kind); t.frameX = -1; t.frameY = -1; t.wall = WallProxy(wallKind); t.liquid = 0;
    NativeTileCall(t, 'void liquidType(int liquidType)', 0);
    NativeTileCall(t, 'void color(byte color)', 0); NativeTileCall(t, 'void wallColor(byte wallColor)', 0);
    NativeTileCall(t, 'void halfBrick(bool halfBrick)', false); NativeTileCall(t, 'void slope(byte slope)', 0);
    return true;
}
function NativeCarve(t, wallKind) {
    if (!NativeSafe(t)) return false;
    NativeTileSetActive(t, false); t.frameX = 0; t.frameY = 0;
    if (!HouseWall(I(t.wall)) && (!ProxyWall(I(t.wall)) || I(t.wall) === 0)) t.wall = WallProxy(wallKind || KIND.SHALE);
    NativeTileCall(t, 'void color(byte color)', 0); NativeTileCall(t, 'void wallColor(byte wallColor)', 0); NativeSetWater(t, 255);
    return true;
}
function NativeAdjacentOpen(x, y) {
    let open = 0;
    for (const q of [[1,0],[-1,0],[0,1],[0,-1]]) if (!NativeTileActive(NativeTileAt(x + q[0], y + q[1]))) open++;
    return open;
}
function MergeExcludedRowIntervals(waterRows, islandRows, y, left, right) {
    const raw = [];
    const w = waterRows[I(y)];
    if (w) for (const q of w) {
        const a = Math.max(left, I(q[0])), b = Math.min(right - 1, I(q[1]));
        if (b >= a) raw.push([a, b]);
    }
    const ir = islandRows[I(y)];
    if (ir) for (const q of ir) {
        const a = Math.max(left, I(q[0])), b = Math.min(right - 1, I(q[1]));
        if (b >= a) raw.push([a, b]);
    }
    if (!raw.length) return raw;
    raw.sort((a,b)=>a[0]-b[0]);
    const out=[]; let c=raw[0].slice();
    for(let i=1;i<raw.length;i++){
        const q=raw[i];
        if(q[0] <= c[1]+1) c[1]=Math.max(c[1],q[1]);
        else { out.push(c); c=q.slice(); }
    }
    out.push(c); return out;
}

// Fresh-world mobile cleanup: one native read per cell, then all adjacency/component
// decisions happen in typed JS arrays. This replaces the previous 4-neighbour native
// reads for every active tile plus a second full native component scan.
function DirectCleanupFreshSnapshot(bounds) {
    const w=Math.max(0,bounds.r-bounds.l), h=Math.max(0,bounds.b-bounds.t), total=w*h;
    if(!(w>0&&h>0)) return {cleaned:0,small:0,reads:0};
    const active=new Uint8Array(total), base=new Uint8Array(total), initial=new Uint8Array(total), safe=new Uint8Array(total), wall=new Uint16Array(total), liquid=new Uint8Array(total);
    const at=(x,y)=>(x<bounds.l||x>=bounds.r||y<bounds.t||y>=bounds.b)?-1:(y-bounds.t)*w+(x-bounds.l);
    let reads=0, cleaned=0, small=0;
    for(let y=bounds.t;y<bounds.b;y++) for(let x=bounds.l;x<bounds.r;x++){
        const i=at(x,y), t=NativeTileAt(x,y); reads++;
        if(!t) continue;
        const a=NativeTileActive(t), ty=I(t.type), wa=I(t.wall), li=I(t.liquid);
        active[i]=a?1:0; base[i]=a&&AbyssBaseProxy(ty)?1:0; initial[i]=a&&AbyssInitialCleanupProxy(ty)?1:0;
        wall[i]=Math.max(0,Math.min(65535,wa)); liquid[i]=Math.max(0,Math.min(255,li));
        safe[i]=(!HouseWall(wa) && !(a && (PROTECTED.has(ty)||FrameImportant(ty))))?1:0;
    }
    const clearMask=new Uint8Array(total), waterMask=new Uint8Array(total);
    for(let y=bounds.t;y<bounds.b;y++) for(let x=bounds.l;x<bounds.r;x++){
        const i=at(x,y); if(i<0||HouseWall(wall[i])) continue;
        if(!active[i]) { if(wall[i]>0&&liquid[i]<255) waterMask[i]=1; continue; }
        if(!base[i]||!safe[i]) continue;
        let open=0;
        for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const j=at(x+d[0],y+d[1]); if(j<0||!active[j]) open++;}
        if((initial[i]&&open===4)||(base[i]&&open>=3)) clearMask[i]=1;
    }
    for(let y=bounds.t;y<bounds.b;y++) for(let x=bounds.l;x<bounds.r;x++){
        const i=at(x,y); if(!clearMask[i]) continue;
        const t=NativeTileAt(x,y); if(!t) continue;
        NativeTileSetActive(t,false); t.frameX=0; t.frameY=0; NativeSetWater(t,255);
        active[i]=0; base[i]=0; liquid[i]=255; cleaned++;
    }
    // Small components, using the updated snapshot only.
    const marks=new Uint8Array(total);
    for(let y=bounds.t;y<bounds.b;y++) for(let x=bounds.l;x<bounds.r;x++){
        const si=at(x,y); if(si<0||marks[si]||!active[si]||!base[si]) { if(si>=0&&marks[si]===0) marks[si]=1; continue; }
        let touchesLarge=false;
        for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=at(x+d[0],y+d[1]);if(ni>=0&&marks[ni]===3){touchesLarge=true;break;}}
        if(touchesLarge){marks[si]=3;continue;}
        const queue=[si], cells=[]; marks[si]=2; let head=0, large=false;
        while(head<queue.length){
            const qi=queue[head++]; cells.push(qi); if(cells.length>=75){large=true;break;}
            const qx=bounds.l+(qi%w), qy=bounds.t+Math.floor(qi/w);
            for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){
                const ni=at(qx+d[0],qy+d[1]); if(ni<0) continue;
                if(marks[ni]===3){large=true;break;}
                if(marks[ni]) continue;
                if(active[ni]&&base[ni]){marks[ni]=2;queue.push(ni);} else marks[ni]=1;
            }
        }
        if(large) { for(const qi of queue) marks[qi]=3; continue; }
        for(const qi of cells){
            const qx=bounds.l+(qi%w), qy=bounds.t+Math.floor(qi/w), t=NativeTileAt(qx,qy);
            if(t&&active[qi]&&base[qi]&&safe[qi]){NativeTileSetActive(t,false);t.frameX=0;t.frameY=0;NativeSetWater(t,255);active[qi]=0;base[qi]=0;liquid[qi]=255;small++;}
            marks[qi]=1;
        }
    }
    // Fill water in pre-existing empty walled cells without another native read pass.
    for(let y=bounds.t;y<bounds.b;y++) for(let x=bounds.l;x<bounds.r;x++){
        const i=at(x,y); if(!waterMask[i]||liquid[i]>=255) continue;
        const t=NativeTileAt(x,y); if(t){NativeSetWater(t,255);liquid[i]=255;cleaned++;}
    }
    return {cleaned,small,reads};
}

function DirectCleanupSmallComponents(bounds) {
    const w = Math.max(0, bounds.r - bounds.l), h = Math.max(0, bounds.b - bounds.t);
    const marks = new Uint8Array(Math.max(0, w * h));
    const idx = (x, y) => (x < bounds.l || y < bounds.t || x >= bounds.r || y >= bounds.b) ? -1 : (y - bounds.t) * w + (x - bounds.l);
    let cleared = 0;
    for (let y = bounds.t; y < bounds.b; y++) for (let x = bounds.l; x < bounds.r; x++) {
        const si = idx(x, y); if (si < 0 || marks[si] !== 0) continue;
        const seed = NativeTileAt(x, y);
        if (!NativeTileActive(seed) || !AbyssBaseProxy(seed?.type)) { marks[si] = 1; continue; }
        let touchesLarge = false;
        for (const q of [[1,0],[-1,0],[0,1],[0,-1]]) { const ni = idx(x + q[0], y + q[1]); if (ni >= 0 && marks[ni] === 2) { touchesLarge = true; break; } }
        if (touchesLarge) { marks[si] = 2; continue; }
        const queue = [[x, y]], local = []; marks[si] = 3; let head = 0, large = false;
        while (head < queue.length) {
            const q = queue[head++], qx = q[0], qy = q[1]; local.push(q);
            if (local.length >= 75) { large = true; break; }
            for (const dxy of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = qx + dxy[0], ny = qy + dxy[1], ni = idx(nx, ny); if (ni < 0) continue;
                if (marks[ni] === 2) { large = true; break; }
                if (marks[ni] !== 0) continue;
                const nt = NativeTileAt(nx, ny); if (!NativeTileActive(nt) || !AbyssBaseProxy(nt?.type)) continue;
                marks[ni] = 3; queue.push([nx, ny]);
            }
            if (large) break;
        }
        if (large || local.length >= 75) {
            for (const q of queue) { const qi = idx(q[0], q[1]); if (qi >= 0) marks[qi] = 2; }
            continue;
        }
        for (const q of queue) {
            const qi = idx(q[0], q[1]); if (qi >= 0) marks[qi] = 1;
            const t = NativeTileAt(q[0], q[1]);
            if (NativeTileActive(t) && AbyssBaseProxy(t?.type) && NativeSafe(t)) { NativeTileSetActive(t, false); t.frameX = 0; t.frameY = 0; NativeSetWater(t, 255); cleared++; }
        }
    }
    return cleared;
}

function Validate() {
    const rows = BuildWater(), ys = [Math.max(WaterTop() + 20, FillTop()), Rock() - 20, Math.floor(Rock() + MaxY() * .08), Math.floor(Rock() + MaxY() * .2), Math.min(AbyssBottom() - 20, Math.floor(Rock() + MaxY() * .31))];
    let chk = 0, water = 0, solid = 0, wall = 0;
    for (const y of ys) {
        const a = rows[I(y)]; if (a?.length) { const q = a[Math.floor(a.length / 2)], x = I((q[0] + q[1]) / 2); if (InWorld(x, y)) { const d = new TileData(x, y); chk++; if (!Active(d) && N(d.liquid) >= 128) water++; if (ProxyWall(d.wall)) wall++; } }
        const sx = AtLeft() ? Math.min(RegionRight() - 12, ChasmX() + 120) : Math.max(RegionLeft() + 12, ChasmX() - 120);
        if (InWorld(sx, y) && BackgroundKind(sx, y) !== KIND.NONE) { const d = new TileData(sx, y); chk++; if (Active(d) && LegacyProxy(d.type)) solid++; if (ProxyWall(d.wall)) wall++; }
    }
    const connector = BuildRecoveryConnector();
    return { valid: chk >= 6 && water >= 2 && solid >= 2 && wall >= 2, chk, water, solid, wall, connector };
}

export const AbyssTerrainRuntime = {
    Active: false, Generated: false, Delay: 420, Phase: 0, Cursor: 0, Total: 0,
    Modified: 0, Protected: 0, Carved: 0, Materials: 0, Islands: 0, Cleaned: 0, SmallClumps: 0, LegacyRetyped: 0, SeaMouthCarved: 0,
    Started: 0, LastSave: 0, Error: '', LoadedVersion: 0, Mode: 'fresh',
    MigrationPending: false, ValidatePending: false, Signature: 'pending',
    Reset() {
        this.Active = false; this.Generated = false; this.Delay = 420; this.Phase = 0; this.Cursor = 0; this.Total = 0;
        this.Modified = this.Protected = this.Carved = this.Materials = this.Islands = this.Cleaned = this.SmallClumps = this.LegacyRetyped = this.SeaMouthCarved = 0;
        this.Started = 0; this.LastSave = 0; this.Error = ''; this.LoadedVersion = 0; this.Mode = 'fresh';
        this.MigrationPending = false; this.ValidatePending = false; this.Signature = 'pending';
        Geo.key = ''; Geo.water = null; Geo.islands = null; Geo.connector = null; MouthCache.key=''; MouthCache.x=-1; MouthCache.y=-1; AnchorState.key=''; AnchorState.x=-1; AnchorState.source='unset'; AnchorState.recoverLegacy=false; DungeonGuard.key=''; DungeonGuard.l=-1; DungeonGuard.r=-1; DungeonGuard.dungeonX=-1; DungeonGuard.logged=false; SulphProbeCache.key=''; SulphProbeCache.yStart=-1; SulphProbeCache.starts=[-1,-1,-1]; SulphWaterProfileCache.key=''; SulphWaterProfileCache.openWidth=0; FreshWorldContext.active=false; FreshWorldContext.yStart=-1; ResetCleanupState();
    },
    GenerateFreshWorldDirect(sulphurous = null) {
        const started = Date.now();
        this.Reset();
        try {
            if (sulphurous && Number(sulphurous.centerX) > 0 && Number(sulphurous.centerY) > 0) {
                SulphurousSeaPreviewRuntime.SetArea(sulphurous.centerX, sulphurous.centerY, sulphurous.width, sulphurous.height, sulphurous.atLeft === true, 'fresh-worldgen');
            }
            FreshWorldContext.active = true;
            FreshWorldContext.yStart = Math.max(35, I(sulphurous?.yStart, I(sulphurous?.top, Surface() - 55) + 55));
            AnchorState.key = ''; AnchorState.x = -1; AnchorState.source = 'unset';
            const geometryStarted = Date.now();
            const waterStarted = Date.now(), water = BuildWater(), waterMs = Date.now() - waterStarted;
            const islandsStarted = Date.now(), islands = BuildIslands(), islandsGeometryMs = Date.now() - islandsStarted;
            const geometryMs = Date.now() - geometryStarted;
            this.Mode = 'fresh-worldgen'; this.Active = true; this.Generated = false;
            this.Modified = this.Protected = this.Carved = this.Materials = this.Islands = this.Cleaned = this.SmallClumps = this.LegacyRetyped = this.SeaMouthCarved = 0;

            let phaseStamp=Date.now(), materialMs=0, carveMs=0, islandMs=0, cleanupMs=0, mouthMs=0;

            // Official PlaceAbyss order is preserved, but fresh-world mobile generation skips
            // the background write for cells that the very next passes will carve or replace
            // with an island. Desktop can afford the redundant write; IL2CPP Android cannot.
            // Protected cells are still evaluated by the later carve/island pass, exactly as before.
            const regionL=RegionLeft(), regionR=RegionRight();
            for (let y = FillTop(); y < FillBottom(); y++) {
                const excluded=MergeExcludedRowIntervals(water,islands.rows,y,regionL,regionR);
                let cursor=regionL;
                const fillRange=(a,b)=>{for(let x=a;x<b;x++){const kind=BackgroundKind(x,y);if(kind===KIND.NONE)continue;const t=NativeTileAt(x,y);if(NativeSetMaterial(t,kind)){this.Materials++;this.Modified++;}else this.Protected++;}};
                for(const q of excluded){if(cursor<q[0])fillRange(cursor,q[0]);cursor=Math.max(cursor,q[1]+1);}
                if(cursor<regionR)fillRange(cursor,regionR);
            }
            materialMs=Date.now()-phaseStamp; phaseStamp=Date.now();
            for (let y = 0; y < water.length; y++) {
                const spans = water[y]; if (!spans) continue;
                for (const span of spans) for (let x = Math.max(3, I(span[0])); x <= Math.min(MaxX() - 4, I(span[1])); x++) {
                    const t = NativeTileAt(x, y);
                    const wk = BackgroundKind(x, Math.max(FillTop(), Math.min(FillBottom() - 1, y))) || KIND.SHALE;
                    if (NativeCarve(t, wk)) { this.Carved++; this.Modified++; } else this.Protected++;
                }
            }
            carveMs=Date.now()-phaseStamp; phaseStamp=Date.now();
            for (let y = 0; y < islands.rows.length; y++) {
                const spans = islands.rows[y]; if (!spans) continue;
                for (const span of spans) for (let x = Math.max(3, I(span[0])); x <= Math.min(MaxX() - 4, I(span[1])); x++) {
                    const t = NativeTileAt(x, y);
                    if (NativeSetMaterial(t, I(span[2]), I(span[3], I(span[2])))) { this.Islands++; this.Modified++; } else this.Protected++;
                }
            }
            islandMs=Date.now()-phaseStamp; phaseStamp=Date.now();
            const content = { l: RegionLeft(), r: RegionRight(), t: ContentTop(), b: ContentBottom() };
            const cleanup=DirectCleanupFreshSnapshot(content);
            this.SmallClumps += cleanup.small; this.Cleaned += cleanup.cleaned + cleanup.small; this.Modified += cleanup.cleaned + cleanup.small;
            cleanupMs=Date.now()-phaseStamp; phaseStamp=Date.now();

            // In fresh worlds GenerateShallowTopWater already ran before PlaceAbyss, matching
            // the official ordering. Do not apply the post-load mouth reconstruction a second time.
            if (!(sulphurous && sulphurous.officialTopWater === true)) {
                const mouth = SulphMouthBounds();
                for (let y = mouth.t; y < mouth.b; y++) for (let x = mouth.l; x < mouth.r; x++) {
                    if (!IsSulphMouthCell(x, y)) continue;
                    const t = NativeTileAt(x, y);
                    const wasWet = !!t && !NativeTileActive(t) && N(t.liquid) >= 250;
                    if (NativeCarve(t, KIND.SHALE)) { if (!wasWet) { this.SeaMouthCarved++; this.Modified++; } } else this.Protected++;
                }
            }
            mouthMs=Date.now()-phaseStamp;
            this.Active = false; this.Generated = true; this.LoadedVersion = VERSION; this.Phase = 7; this.Cursor = this.Total = 0;
            const elapsedMs = Date.now() - started;
            const result = {
                generated: true, version: VERSION, elapsedMs, chasmX: ChasmX(), anchorSource: 'official-fresh-worldgen', bottomY: AbyssBottom(), fillTop: FillTop(),
                modified: this.Modified, protected: this.Protected, carved: this.Carved, materials: this.Materials, islands: this.Islands, cleaned: this.Cleaned,
                smallClumps: this.SmallClumps, legacyRetyped: 0, seaMouthCarved: this.SeaMouthCarved, islandCount: islands.count, chestIslands: islands.chestAnchors,
                geometryMs, waterMs, islandsGeometryMs, materialMs, carveMs, islandMs, cleanupMs, mouthMs, cleanupReads: cleanup.reads || 0,
                source: 'ShimmerCleanUp/Main.tile/direct-PlaceAbyss-v23-worldgen-geometry-grid'
            };
            try { tl.log(`[CalamityPort AbyssTerrain] fresh-world v23 geometry-grid complete modified=${result.modified} materials=${result.materials} carved=${result.carved} islands=${result.islands} cleaned=${result.cleaned} seaMouth=${result.seaMouthCarved} phases=geometry:${geometryMs}(water:${waterMs},islandPlan:${islandsGeometryMs})/material:${materialMs}/carve:${carveMs}/islands:${islandMs}/cleanup:${cleanupMs}/mouth:${mouthMs}ms cleanupReads=${result.cleanupReads} elapsed=${elapsedMs}ms`); } catch (e) { }
            return result;
        } catch (e) {
            this.Error = String(e); this.Active = false; this.Generated = false;
            try { tl.log(`[CalamityPort AbyssTerrain] fresh-world v23 failed: ${this.Error}`); } catch (_) { }
            return { generated: false, version: VERSION, elapsedMs: Date.now() - started, error: this.Error, source: 'ShimmerCleanUp/Main.tile/direct-PlaceAbyss-v23-fallback' };
        } finally {
            FreshWorldContext.active = false; FreshWorldContext.yStart = -1;
        }
    },
    Load() {
        this.Reset(); this.Generated = B(WorldDB.get(Key('generated'))); this.LoadedVersion = Math.max(0, I(WorldDB.get(Key('version')), 0));
        // v15 never re-detects a mouth. Existing generated worlds keep their saved anchor;
        // fresh worlds use the fixed PlaceAbyss anchor.
        AnchorState.recoverLegacy = false;
        AnchorState.key = ''; AnchorState.x = -1; AnchorState.source = 'unset';
        const state = String(WorldDB.get(Key('state')) || 'idle'); this.Phase = Math.max(0, I(WorldDB.get(Key('phase')), 0)); this.Cursor = Math.max(0, I(WorldDB.get(Key('cursor')), 0));
        this.Modified = Math.max(0, I(WorldDB.get(Key('modified')), 0)); this.Protected = Math.max(0, I(WorldDB.get(Key('protected')), 0));
        this.Carved = Math.max(0, I(WorldDB.get(Key('carved')), 0)); this.Materials = Math.max(0, I(WorldDB.get(Key('materials')), 0)); this.Islands = Math.max(0, I(WorldDB.get(Key('islands')), 0)); this.Cleaned = Math.max(0, I(WorldDB.get(Key('cleaned')), 0)); this.SmallClumps = Math.max(0, I(WorldDB.get(Key('smallClumps')), 0)); this.LegacyRetyped = Math.max(0, I(WorldDB.get(Key('legacyRetyped')), 0)); this.SeaMouthCarved = Math.max(0, I(WorldDB.get(Key('seaMouthCarved')), 0));
        if (this.Generated && this.LoadedVersion < VERSION) { this.MigrationPending = true; this.Delay = 120; return; }
        // Phase 13.13.0.5 world-entry freeze fix: a current-version world whose saved state is
        // complete is already authoritative. The old path scheduled ValidateGenerated() exactly
        // 120 updates after entering the world; Validate() rebuilt BuildWater/StartProbe geometry
        // and produced a measured 4357 ms stall on Android. Keep migration/recovery for stale or
        // interrupted metadata, but never rebuild the full geometry merely to validate a healthy
        // current-version world after the player is already live.
        if (this.Generated && this.LoadedVersion === VERSION && state === 'complete') {
            this.ValidatePending = false; this.Delay = 0; this.Signature = `metadata-v${VERSION}-complete`;
            return;
        }
        if (this.Generated) { this.ValidatePending = true; this.Delay = 120; return; }
        if (this.LoadedVersion === VERSION && (state === 'running' || state === 'paused')) { this.Active = true; this.Delay = 60; if (this.Phase === 4) { this.Cursor = 0; ResetCleanupState(true); } this.Prepare(false); }
    },
    Save(state = null) {
        if (!WorldDB.Instance) return;
        WorldDB.set(Key('generated'), this.Generated === true); WorldDB.set(Key('state'), String(state || (this.Generated ? 'complete' : (this.Active ? 'running' : 'idle'))));
        WorldDB.set(Key('version'), VERSION); WorldDB.set(Key('phase'), I(this.Phase)); WorldDB.set(Key('cursor'), I(this.Cursor)); WorldDB.set(Key('modified'), I(this.Modified)); WorldDB.set(Key('protected'), I(this.Protected));
        WorldDB.set(Key('carved'), I(this.Carved)); WorldDB.set(Key('materials'), I(this.Materials)); WorldDB.set(Key('islands'), I(this.Islands)); WorldDB.set(Key('cleaned'), I(this.Cleaned)); WorldDB.set(Key('smallClumps'), I(this.SmallClumps)); WorldDB.set(Key('legacyRetyped'), I(this.LegacyRetyped)); WorldDB.set(Key('seaMouthCarved'), I(this.SeaMouthCarved));
        WorldDB.set(Key('chasmX'), ChasmX()); WorldDB.set(Key('anchorSource'), String(AnchorState.source || 'unknown')); WorldDB.set(Key('bottomY'), AbyssBottom()); WorldDB.set(Key('fillTop'), FillTop());
        const c = BuildRecoveryConnector(); WorldDB.set(Key('connectorUsed'), c.used === true); WorldDB.set(Key('connectorX'), I(c.sourceX, -1)); WorldDB.set(Key('connectorY'), I(c.sourceY, -1));
        try { WorldDB.Instance.Save(); } catch (e) { }
    },
    CanStart() { if (this.Generated) return false; if (!WorldDB.Instance || !SulphReady()) return false; return AbyssBottom() > Math.min(StartProbe(0), StartProbe(1), StartProbe(2)) + 80; },
    Begin(mode = 'fresh') {
        if (mode !== 'reshape' && !this.CanStart()) return false;
        BuildWater(); BuildIslands(); this.Active = true; this.Generated = false; this.Mode = mode; this.Phase = 0; this.Cursor = 0;
        this.Modified = this.Protected = this.Carved = this.Materials = this.Islands = this.Cleaned = this.SmallClumps = this.LegacyRetyped = this.SeaMouthCarved = 0;
        this.Started = I(Terraria.Main.GameUpdateCount); this.Error = ''; this.MigrationPending = false; ResetCleanupState(); this.Prepare(true); this.Save('running');
        const c = BuildRecoveryConnector();
        Tell(mode === 'reshape' ? 'O Abismo está sendo reconstruído na ordem real do PlaceAbyss...' : 'A formação completa do Abismo começou...', 80, 200, 235);
        try { tl.log(`[CalamityPort AbyssTerrain] v22 ${mode} region=${RegionLeft()}..${RegionRight()} fillY=${FillTop()}..${FillBottom()} chasmX=${ChasmX()} anchor=${AnchorState.source} starts=${StartProbe(1)}/${StartProbe(0)}/${StartProbe(2)} connector=${c.used ? `${c.sourceX},${c.sourceY}->${c.targetX},${c.targetY}` : 'none'} islands=${BuildIslands().count} chestIslands=${BuildIslands().chestAnchors}`); } catch (e) { }
        return true;
    },
    Prepare(reset = true) { if (reset) { this.Cursor = 0; if (this.Phase === 4) ResetCleanupState(true); } this.Total = (this.Phase === 5 && this.Mode !== 'reshape') ? 0 : PhaseTotal(this.Phase); },
    StepMaterial(index) {
        const q = CellFor(0, index); if (!InWorld(q.x, q.y)) return; const kind = BackgroundKind(q.x, q.y); if (kind === KIND.NONE) return;
        const d = new TileData(q.x, q.y); if (!Safe(d)) { this.Protected++; return; }
        if (SetMaterial(d, kind)) { this.Materials++; this.Modified++; }
    },
    StepCarve(index) {
        const q = CellFor(1, index); if (!InWorld(q.x, q.y) || !InRows(BuildWater(), q.x, q.y)) return;
        const d = new TileData(q.x, q.y); if (!Safe(d)) { this.Protected++; return; }
        const wallKind = BackgroundKind(q.x, Math.max(FillTop(), Math.min(FillBottom() - 1, q.y))) || KIND.SHALE;
        if (Carve(d, wallKind)) { this.Carved++; this.Modified++; }
    },
    StepIsland(index) {
        const q = CellFor(2, index); if (!InWorld(q.x, q.y)) return; const mat = IslandKind(q.x, q.y); if (!mat) return;
        const d = new TileData(q.x, q.y); if (!Safe(d)) { this.Protected++; return; }
        if (SetMaterial(d, mat.kind, mat.wallKind)) { this.Islands++; this.Modified++; }
    },
    StepCleanup(index) {
        const q = CellFor(3, index); if (!InWorld(q.x, q.y)) return; const d = new TileData(q.x, q.y);
        if (HouseWall(d.wall)) return;
        if (!Active(d)) {
            // PlaceAbyss fills every open pocket backed by a wall with water during its first cleanup.
            if (I(d.wall) > 0 && N(d.liquid) < 255) { SetWater(d, 255); this.Cleaned++; this.Modified++; }
            return;
        }
        const open = AdjacentOpen(q.x, q.y);
        // PlaceAbyss's first cleanup removes fully isolated Shale/Gravel/Pyre/Void/Planty/Scoria
        // cells. The later AbyssCleanup one-sided rule intentionally applies only to the four
        // base terrain blocks, matching the official blockTileTypes list.
        const remove = (AbyssInitialCleanupProxy(d.type) && open === 4) || (AbyssBaseProxy(d.type) && open >= 3);
        if (remove && Safe(d)) { SetActive(d, false); SetWater(d, 255); this.Cleaned++; this.Modified++; }
    },
    StepComponent(index) {
        const q = CellFor(4, index); if (!InWorld(q.x, q.y)) return;
        const cleared = CleanupSmallComponent(q.x, q.y);
        if (cleared > 0) { this.SmallClumps += cleared; this.Cleaned += cleared; this.Modified += cleared; }
    },
    StepLegacyRetype(index) {
        if (this.Mode !== 'reshape') return;
        const q = CellFor(5, index); if (!InWorld(q.x, q.y)) return;
        const d = new TileData(q.x, q.y);
        if (!Active(d)) return;
        const t = I(d.type), w = I(d.wall);
        let target = 0;
        // v15 and earlier used Ancient Hellstone Brick (684) as Pyre Mantle's physical proxy.
        // It carries vanilla Underworld behavior and must never remain in generated Abyss terrain.
        // The Abyss Pyre wall makes this migration local to our generated biome, so ordinary
        // Ancient Hellstone Brick elsewhere in the world is left untouched.
        if (t === LEGACY_PYRE_HOT && w === WALL_PYRE) target = PYRE;
        // v9 used SHALE/683 for all four layers while the wall still encoded the real material.
        else if (t === SHALE && w === WALL_GRAVEL) target = GRAVEL;
        else if (t === SHALE && w === WALL_PYRE) target = PYRE;
        else if (t === SHALE && w === WALL_VOID) target = VOID;
        else return;
        d.type = target; d.frameX = -1; d.frameY = -1; TryColor(d, 0);
        this.LegacyRetyped++; this.Modified++;
    },
    StepSeaMouth(index) {
        const q = CellFor(6, index); if (!InWorld(q.x, q.y) || !IsSulphMouthCell(q.x, q.y)) return;
        const d = new TileData(q.x, q.y); if (!Safe(d)) { this.Protected++; return; }
        const wasWet = !Active(d) && N(d.liquid) >= 250;
        if (CarveSulphMouthCell(d, q.y) && !wasWet) { this.SeaMouthCarved++; this.Modified++; }
    },
    Finish() {
        this.Active = false; this.Generated = true; this.LoadedVersion = VERSION; this.Phase = 7; this.Cursor = this.Total = 0; this.Save('complete');
        const sec = Math.max(1, Math.round((I(Terraria.Main.GameUpdateCount) - this.Started) / 60));
        Tell(`Abismo reconstruído pela ordem oficial em ${sec}s.`, 100, 220, 255);
        try { tl.log(`[CalamityPort AbyssTerrain] v22 complete modified=${this.Modified} materials=${this.Materials} carved=${this.Carved} islands=${this.Islands} cleaned=${this.Cleaned} smallClumps=${this.SmallClumps} legacyRetyped=${this.LegacyRetyped} seaMouth=${this.SeaMouthCarved} protected=${this.Protected}`); } catch (e) { }
    },
    ValidateGenerated() {
        const s = Validate(); this.Signature = `w${s.water}/s${s.solid}/wall${s.wall}/${s.chk}`; this.ValidatePending = false;
        if (s.valid) { this.LoadedVersion = VERSION; return true; }
        this.Generated = false; this.MigrationPending = true; this.Delay = 30; this.Save('recovery'); Tell('A estrutura do Abismo não corresponde à ordem oficial. Reconstruindo...', 100, 210, 255); return false;
    },
    Update() {
        if (this.MigrationPending) { if (this.Delay-- > 0) return; this.Begin('reshape'); return; }
        if (this.ValidatePending) { if (this.Delay-- > 0) return; this.ValidateGenerated(); return; }
        if (this.Generated) return;
        // Fresh Abyss formation belongs to world generation. Older builds kept a live-world
        // fallback here which could start PlaceAbyss after the player had already spawned,
        // causing the "A formação completa do Abismo começou..." message and doing heavy
        // tile work during gameplay. Only a previously interrupted run (Active=true after Load)
        // or an explicit version migration may continue post-load. A world with no generated
        // Abyss metadata stays idle and is diagnosed instead of silently rewriting terrain live.
        if (!this.Active) {
            if (this.Delay > 0) this.Delay--;
            this.Signature = 'awaiting-worldgen-metadata';
            return;
        }
        try {
            let n = 0; while (n < CELLS_PER_TICK && this.Cursor < this.Total) {
                const idx = this.Cursor++;
                if (this.Phase === 0) this.StepMaterial(idx);
                else if (this.Phase === 1) this.StepCarve(idx);
                else if (this.Phase === 2) this.StepIsland(idx);
                else if (this.Phase === 3) this.StepCleanup(idx);
                else if (this.Phase === 4) this.StepComponent(idx);
                else if (this.Phase === 5) this.StepLegacyRetype(idx);
                else this.StepSeaMouth(idx);
                n++;
            }
            if (this.Cursor >= this.Total) { this.Phase++; if (this.Phase > 6) { this.Finish(); return; } this.Prepare(true); this.Save('running'); }
            const tick = I(Terraria.Main.GameUpdateCount); if (tick - this.LastSave > 180) { this.LastSave = tick; this.Save('running'); }
        } catch (e) {
            this.Error = String(e); this.Active = false; this.Save('failed'); Tell(`A reconstrução do Abismo foi pausada: ${this.Error.slice(0, 140)}`, 255, 100, 100); try { tl.log(`[CalamityPort AbyssTerrain] v22 error ${e}`); } catch (_) { }
        }
    },
    GetChestAnchors() { const q = BuildIslands(); return Array.isArray(q.chestAnchorList) ? q.chestAnchorList.map(a => ({ x: I(a.x), y: I(a.y) })) : []; },
    GetAmbientFloorCandidates(top = null, bottom = null) {
        // Pure-geometry floor list for fresh-world ambient placement. This deliberately avoids
        // Main.tile/TileData probes: BuildWater + BuildIslands are already cached from PlaceAbyss.
        const water = BuildWater(), islands = BuildIslands();
        const t = Math.max(ContentTop(), I(top, ContentTop()));
        const b = Math.min(ContentBottom(), I(bottom, ContentBottom()));
        const out = [];
        const islandAt = (x, y) => {
            const row = islands.rows[I(y)]; if (!row) return 0;
            for (const q of row) if (x >= I(q[0]) && x <= I(q[1])) return I(q[2]);
            return 0;
        };
        const waterAt = (x, y) => {
            const row = water[I(y)]; if (!row) return false;
            for (const q of row) if (x >= I(q[0]) && x <= I(q[1])) return true;
            return false;
        };
        const hostName = k => k === KIND.SHALE ? 'shale' : (k === KIND.GRAVEL ? 'gravel' : (k === KIND.PLANTY ? 'planty' : ''));
        for (let y = t; y < b; y++) {
            const spans = water[y]; if (!spans || !spans.length) continue;
            for (const span of spans) {
                const l = Math.max(3, I(span[0])), r = Math.min(MaxX() - 4, I(span[1]));
                for (let x = l; x <= r; x++) {
                    // The ambient anchor cell itself must remain water/open after islands overlay.
                    if (islandAt(x, y)) continue;
                    let kind = islandAt(x, y + 1);
                    if (!kind) {
                        if (waterAt(x, y + 1)) continue;
                        kind = BackgroundKind(x, y + 1);
                    }
                    const host = hostName(kind);
                    if (host) out.push({ x, y, host });
                }
            }
        }
        return out;
    },
    GetAmbientCeilingCandidates(top = null, bottom = null) {
        // Pure-geometry exposed-ceiling list used by the official hanging-vine pass.
        // As with GetAmbientFloorCandidates, this never scans Main.tile: the cached water
        // and island plans tell us which open cells have a generated Abyss material above.
        const water = BuildWater(), islands = BuildIslands();
        const t = Math.max(ContentTop(), I(top, ContentTop()));
        const b = Math.min(ContentBottom(), I(bottom, ContentBottom()));
        const out = [];
        const islandAt = (x, y) => {
            const row = islands.rows[I(y)]; if (!row) return 0;
            for (const q of row) if (x >= I(q[0]) && x <= I(q[1])) return I(q[2]);
            return 0;
        };
        const waterAt = (x, y) => {
            const row = water[I(y)]; if (!row) return false;
            for (const q of row) if (x >= I(q[0]) && x <= I(q[1])) return true;
            return false;
        };
        const hostName = k => k === KIND.SHALE ? 'shale' : (k === KIND.PLANTY ? 'planty' : (k === KIND.GRAVEL ? 'gravel' : ''));
        for (let y = Math.max(t, 2); y < b; y++) {
            const spans = water[y]; if (!spans || !spans.length) continue;
            for (const span of spans) {
                const l = Math.max(3, I(span[0])), r = Math.min(MaxX() - 4, I(span[1]));
                for (let x = l; x <= r; x++) {
                    if (islandAt(x, y)) continue;
                    let kind = islandAt(x, y - 1);
                    if (!kind) {
                        if (waterAt(x, y - 1)) continue;
                        kind = BackgroundKind(x, y - 1);
                    }
                    const host = hostName(kind);
                    if (host) out.push({ x, y, host });
                }
            }
        }
        return out;
    },
    IsGeneratedShaleCell(x, y) {
        if (!this.Generated || !InWorld(I(x), I(y)) || BackgroundKind(I(x), I(y)) !== KIND.SHALE) return false;
        try { const d = new TileData(I(x), I(y)); return Active(d) && I(d.type) === SHALE; } catch (e) { return false; }
    },
    GetStatus() {
        const pct = this.Total > 0 ? Math.floor(this.Cursor * 100 / this.Total) : 100, c = BuildRecoveryConnector();
        return `generated=${this.Generated} active=${this.Active} v=${this.LoadedVersion}/${VERSION} phase=${this.Phase} progress=${pct}% region=${RegionLeft()}..${RegionRight()} fillY=${FillTop()}..${FillBottom()} chasmX=${ChasmX()} anchor=${AnchorState.source} starts=${StartProbe(1)}/${StartProbe(0)}/${StartProbe(2)} sulphY=${FindOfficialSulphYStart()} model=${OfficialSulphProbeFloor(1)}/${OfficialSulphProbeFloor(0)}/${OfficialSulphProbeFloor(2)} bottom=${AbyssBottom()} connector=${c.used ? `${c.sourceX},${c.sourceY}` : 'none'} seaOpen=${OfficialSulphTopWaterProfile().openWidth}@${OfficialSulphTopWaterProfile().surface} mouthCarved=${this.SeaMouthCarved} proxy=s${SHALE}/g${GRAVEL}/p${PYRE}/v${VOID}/plant${PLANTY}/scoria${SCORIA}/molten${MOLTEN} legacy=${LEGACY_FOSSIL}/${LEGACY_V6} mouth=${FindSeaMouth().x},${FindSeaMouth().y} islands=${BuildIslands().count} chestIslands=${BuildIslands().chestAnchors} materials=${this.Materials} carved=${this.Carved} cleaned=${this.Cleaned} smallClumps=${this.SmallClumps} legacyRetyped=${this.LegacyRetyped} seaMouth=${this.SeaMouthCarved} protected=${this.Protected} sig=${this.Signature}${this.Error ? ` error=${this.Error.slice(0, 80)}` : ''}`;
    }
};
