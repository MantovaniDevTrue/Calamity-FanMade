import { Terraria } from './../TL/ModImports.js';
function N(v,f){const n=Number(v);return Number.isFinite(n)&&n>=0?n:f;}
export const PlanetoidLabTileAnchors=Object.freeze({
 LaboratoryPlating:N(Terraria.ID.TileID.TeamBlockRed,426),
 LaboratoryPipePlating:N(Terraria.ID.TileID.TeamBlockBlue,427),
 EutrophicGlass:N(Terraria.ID.TileID.TeamBlockGreen,428),
 HazardChevronPanels:N(Terraria.ID.TileID.TeamBlockYellow,429),
 // Normal vanilla brick slots avoid colliding with the existing Aerialite Pink/White anchor logic.
 LaboratoryPanels:38,
 Cinderplate:39
});
// Dungeon walls are absent from sky planetoids and provide seven stable vanilla wall slots.
export const PlanetoidLabWallAnchors=Object.freeze({
 LaboratoryPanelWall:7,
 LaboratoryPlateBeam:8,
 LaboratoryPlatePillar:9,
 LaboratoryPlatingWall:94,
 EutrophicGlassWall:95,
 HazardChevronWall:96,
 CinderplateWall:97
});
export const PlanetoidLabTileAnchorSet=new Set(Object.values(PlanetoidLabTileAnchors));
export const PlanetoidLabWallAnchorSet=new Set(Object.values(PlanetoidLabWallAnchors));
