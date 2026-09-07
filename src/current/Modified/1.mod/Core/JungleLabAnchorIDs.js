import { PlanetoidLabTileAnchors } from './PlanetoidLabAnchorIDs.js';
export const JungleLabTileAnchors=Object.freeze({
 LaboratoryPlating:PlanetoidLabTileAnchors.LaboratoryPlating,
 LaboratoryPipePlating:PlanetoidLabTileAnchors.LaboratoryPipePlating,
 EutrophicGlass:PlanetoidLabTileAnchors.EutrophicGlass,
 HazardChevronPanels:PlanetoidLabTileAnchors.HazardChevronPanels,
 LaboratoryPanels:PlanetoidLabTileAnchors.LaboratoryPanels,
 // Simple vanilla solid blocks unused by the laboratory schematic itself.
 PlaguedPlate:45,
 PlagueContainmentCells:46
});
export const JungleLabWallAnchors=Object.freeze({
 LaboratoryPanelWall:7,
 PlaguedPlateWall:95,
 LaboratoryPlateBeam:8,
 LaboratoryPlatePillar:9,
 LaboratoryPlatingWall:94,
 HazardChevronWall:96,
 PlagueContainmentCellsWall:97
});
export const JungleLabTileAnchorSet=new Set(Object.values(JungleLabTileAnchors));
