import { Terraria } from './../TL/ModImports.js';

// Shared, Android-safe terrain state for Desert Nuisances and Perforator
// heads. Water uses Terraria's already-computed npc.wet field. Solid terrain
// uses one explicit native point query at a cached interval. This avoids both
// Collision rectangle scans and hot Main.tile NativeObject wrappers.
const SolidOrSlopedTile = Terraria.WorldGen['bool SolidOrSlopedTile(int x, int y)'];

function InWorld(tileX, tileY) {
    const maxX = Math.floor(Number(Terraria.Main.maxTilesX) || 0);
    const maxY = Math.floor(Number(Terraria.Main.maxTilesY) || 0);
    return tileX > 1 && tileY > 1 && tileX < maxX - 2 && tileY < maxY - 2;
}

function ProbeSingleNativePoint(npc, wasInside) {
    const px = Number(npc.position.X) || 0;
    const py = Number(npc.position.Y) || 0;
    const width = Math.max(4, Number(npc.width) || 4);
    const height = Math.max(4, Number(npc.height) || 4);
    let sampleX = px + width * 0.5;
    let sampleY = py + height * 0.5;

    // In air, look slightly ahead so the head switches to burrowing before its
    // center is deeply embedded. While already buried, sample the center to
    // avoid boundary flicker. This still performs only one native query.
    if (wasInside !== true) {
        const vx = Number(npc.velocity.X) || 0;
        const vy = Number(npc.velocity.Y) || 0;
        const speed = Math.sqrt(vx * vx + vy * vy);
        const lead = Math.max(5, Math.min(14, Math.min(width, height) * 0.32));
        if (speed > 0.05) {
            sampleX += vx / speed * lead;
            sampleY += vy / speed * lead;
        } else {
            sampleY += lead;
        }
    }

    const tileX = Math.floor(sampleX / 16);
    const tileY = Math.floor(sampleY / 16);
    if (!InWorld(tileX, tileY))
        return false;
    try {
        return SolidOrSlopedTile(tileX, tileY) === true;
    } catch (e) {
        return false;
    }
}

function IsInsideTerrain(npc, state) {
    // The native NPC update already computes wet. No liquid scan is needed.
    let wet = false;
    try {
        wet = npc.wet === true;
    } catch (e) { }

    if (wet) {
        if (state) {
            state.terrainWasWet = true;
            state.terrainProbeResult = true;
            state.terrainProbeMode = 'engine-wet';
            state.terrainProbeCooldown = 10;
        }
        return true;
    }

    if (!state)
        return ProbeSingleNativePoint(npc, false);

    // Leaving water must be checked immediately; otherwise the cached wet
    // result could make the worm fly briefly after exiting the liquid.
    if (state.terrainWasWet === true) {
        state.terrainWasWet = false;
        state.terrainProbeCooldown = 0;
    }

    let cooldown = Math.floor(Number(state.terrainProbeCooldown) || 0);
    if (cooldown > 0) {
        state.terrainProbeCooldown = cooldown - 1;
        return state.terrainProbeResult === true;
    }

    const previous = state.terrainProbeResult === true;
    const inside = ProbeSingleNativePoint(npc, previous);
    state.terrainProbeResult = inside;
    state.terrainProbeMode = inside ? 'native-point-solid' : 'native-point-air';

    // Air updates stay responsive near a surface. Buried heads need fewer
    // checks. Slot staggering prevents two worm heads from probing together.
    let stagger = 0;
    try {
        stagger = Math.abs(Math.floor(Number(npc.whoAmI) || 0)) % 3;
    } catch (e) { }
    state.terrainProbeCooldown = (inside ? 9 : 4) + stagger;
    return inside;
}

export function UseDesertScourgeTraversal(npc, state, directChase = false) {
    const insideTerrain = IsInsideTerrain(npc, state);
    const shouldBurrow = insideTerrain || directChase === true;
    if (state) {
        state.insideTerrain = insideTerrain;
        state.directChase = directChase === true;
        state.traversalMode = insideTerrain
            ? 'burrow'
            : (directChase === true ? 'recovery-chase' : 'airfall');
    }
    return shouldBurrow;
}
