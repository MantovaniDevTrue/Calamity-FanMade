import { Terraria } from './../../ModImports.js';

export class WorldUtils {
    /**
     * Credits: Zayahーざや
     * https://github.com/Enderpllayer
     * @deprecated
     */
     static OreRunner(oreIDs = [], strength, steps = 5) {
        const Next = Terraria.WorldGen.genRand['int Next(int minValue, int maxValue)'];
        for (let k = 0; k < Terraria.Main.maxTilesX * Terraria.Main.maxTilesY * 3E-04; k++) {
            Terraria.WorldGen['void OreRunner(int i, int j, double strength, int steps, ushort type)'](
                Next(5, Terraria.Main.maxTilesX - 5),
                Next(Terraria.WorldBuilding.GenVars.rockLayer, Terraria.Main.maxTilesY - 200),
                strength ?? Next(6, 12),
                steps,
                oreIDs[Math.floor(Math.random() * oreIDs.length)]
            );
        }
     }
}