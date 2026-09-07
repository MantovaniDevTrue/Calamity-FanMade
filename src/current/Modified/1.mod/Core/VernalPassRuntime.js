import { Terraria } from './../TL/ModImports.js';
import { ModItem } from './../TL/ModItem.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { OfficialSchematicRuntime, FillChestByIndex } from './OfficialSchematicRuntime.js';
import { VernalPassSchematic } from './../Data/OfficialSchematics/VernalPassSchematic.js';
import { VernalSoilAnchorTile } from './VernalSoilRuntime.js';

const PROTECTION_PADDING = 30;
const TEMPLE_CLEARANCE = 140;

function N(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function I(value, fallback = 0) { return Math.floor(N(value, fallback)); }
function Log(message) { try { tl.log(`[CalamityPort VernalPass] ${message}`); } catch (e) { } }

function TempleBounds() {
    try {
        const g = Terraria.WorldBuilding.GenVars;
        const left = I(g.tLeft, -1), right = I(g.tRight, -1), top = I(g.tTop, -1), bottom = I(g.tBottom, -1);
        if (left >= 0 && right > left && top >= 0 && bottom > top)
            return { left, right, top, bottom };
    } catch (e) { }
    return null;
}

// The official source performs a 280x280 Lihzahrd-brick scan around the chosen
// center. GenVars already holds the generated Temple bounds, so the equivalent
// rectangle test avoids up to 78,400 JS->native tile reads on mobile worldgen.
function NoTempleNearby(x, y, temple) {
    if (!temple)
        return true;
    const left = x - TEMPLE_CLEARANCE, right = x + TEMPLE_CLEARANCE;
    const top = y - TEMPLE_CLEARANCE, bottom = y + TEMPLE_CLEARANCE;
    return right <= temple.left || left >= temple.right || bottom <= temple.top || top >= temple.bottom;
}

function Choose(list) { return list[WorldGenRand.NextInt(0, list.length)]; }

export function FillVernalPassChestByIndex(chestIndex, isFirstChest) {
    const mainItem = Choose([213, 212, 211, 0]);
    const bars = Choose([19, 706]);
    const potion = Choose([301, 300, 298, 304]);
    const contents = [
        [bars, WorldGenRand.NextInt(4, 7)],
        [331, WorldGenRand.NextInt(4, 8)],
        [209, WorldGenRand.NextInt(2, 5)],
        [4388, WorldGenRand.NextInt(2, 5)],
        [potion, WorldGenRand.NextInt(1, 4)],
        [73, WorldGenRand.NextInt(1, 3)]
    ];

    if (isFirstChest === true) {
        const feller = Number(ModItem.getTypeByName('FellerofEvergreens') || 0);
        if (feller > 0)
            contents.unshift([feller, 1]);
    } else {
        contents.shift();
        contents.unshift([bars, WorldGenRand.NextInt(4, 7)]);
        // Type 0 is intentionally preserved from the official random pool;
        // FillChestByIndex ignores empty item entries just like an empty slot.
        contents.unshift([mainItem, 1]);
    }
    return FillChestByIndex(chestIndex, contents);
}

function CreateChestFiller() {
    let firstItem = false;
    return (chestIndex) => {
        const filled = FillVernalPassChestByIndex(chestIndex, firstItem !== true);
        firstItem = true;
        return filled;
    };
}

export const VernalPassRuntime = {
    Generate(context = null) {
        const started = Date.now();
        const temple = TempleBounds();
        if (!temple)
            return { generated: false, reason: 'temple-bounds-unavailable', elapsedMs: Date.now() - started };

        const maxY = Math.max(1, I(Terraria.Main.maxTilesY, context?.maxY || 0));
        let x = WorldGenRand.NextInt(temple.left, temple.right);
        const initialY = temple.top < maxY / 2 ? temple.bottom + 150 : temple.top - 150;
        let y = initialY;
        let attempts = 0;

        // Keep the source's fallback direction expression. In normal worlds the
        // initial +/-150 placement already clears the 140-tile Temple scan.
        const step = initialY < I(Terraria.Main.maxTilesX, context?.maxX || 0) / 2 ? -10 : 10;
        while (!NoTempleNearby(x, y, temple) && attempts++ < 10000)
            y += step;
        if (!NoTempleNearby(x, y, temple))
            return { generated: false, reason: 'temple-clearance-not-found', anchorX: x, anchorY: y, elapsedMs: Date.now() - started };

        const placed = OfficialSchematicRuntime.Place(
            VernalPassSchematic,
            { x, y },
            'center',
            CreateChestFiller(),
            PROTECTION_PADDING,
            true,
            true
        );
        const result = {
            ...placed,
            anchorX: x,
            anchorY: y,
            templeLeft: temple.left,
            templeTop: temple.top,
            templeRight: temple.right,
            templeBottom: temple.bottom,
            vernalSoilTile: VernalSoilAnchorTile,
            source: 'official-Calamity-VernalPass.cs+VernalPass.csch',
            elapsedMs: Date.now() - started
        };
        Log(`generated=${result.generated === true}, anchor=${x},${y}, size=${result.width || 0}x${result.height || 0}, chests=${result.chestCount || 0}/${result.chestMarkerCount || 0}, filledSlots=${result.chestFilledSlots || 0}, write=${result.writeMs || 0}ms, chest=${result.chestMs || 0}ms, elapsed=${result.elapsedMs}ms, reason=${result.reason || 'ok'}.`);
        return result;
    }
};
