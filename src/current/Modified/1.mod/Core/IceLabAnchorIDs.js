import { Terraria } from './../TL/ModImports.js';
function N(v,f){const n=Number(v);return Number.isFinite(n)&&n>=0?n:f;}
export const IceLabTileAnchors=Object.freeze({
 LaboratoryPlating:N(Terraria.ID.TileID.TeamBlockRed,426),
 LaboratoryPipePlating:N(Terraria.ID.TileID.TeamBlockBlue,427),
 HazardChevronPanels:N(Terraria.ID.TileID.TeamBlockYellow,429),
 LaboratoryPanels:38,
 Elumplate:45,
 RustedPipes:46,
 LaboratoryShelf:19,
 ReinforcedCrate:19,
 AgedReinforcedCrate:19,
 LaboratoryContainmentBox:19,
 AgedLaboratoryContainmentBox:19
});
export const IceLabWallAnchors=Object.freeze({
 LaboratoryPanelWall:7,
 LaboratoryPlatePillar:9,
 HazardChevronWall:96,
 LaboratoryPlateBeam:8,
 ElumplateWall:97,
 LaboratoryPlatingWall:94
});
export const IceLabTileAnchorSet=new Set(Object.values(IceLabTileAnchors));
export const IceLabWallAnchorSet=new Set(Object.values(IceLabWallAnchors));
