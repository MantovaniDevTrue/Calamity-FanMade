import { Terraria } from './../TL/ModImports.js';

function SafeNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

// TLPro does not expose custom ModTile registration reliably enough for worldgen.
// Two rarely used vanilla team-block slots provide stable physical anchors while
// custom textures, map colours, drops and recipes make them behave as Aerialite.
export const AerialiteAnchorTiles = Object.freeze({
    Dormant: SafeNumber(Terraria.ID.TileID.TeamBlockWhite, 431),
    Enchanted: SafeNumber(Terraria.ID.TileID.TeamBlockPink, 430)
});

export const AerialiteAnchorItems = Object.freeze({
    Dormant: SafeNumber(Terraria.ID.ItemID.TeamBlockWhite, 3626),
    Enchanted: SafeNumber(Terraria.ID.ItemID.TeamBlockPink, 3625)
});

export const AerialiteCloudTiles = Object.freeze(new Set([
    189, // Cloud
    196, // Rain Cloud
    460, // Snow Cloud
    474, // Remix-world cloud variant
    195  // legacy/remix cloud slot used by the official generator
]));
