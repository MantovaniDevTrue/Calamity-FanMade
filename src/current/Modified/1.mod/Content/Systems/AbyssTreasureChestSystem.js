import { ModSystem } from './../../TL/ModSystem.js';
import { AbyssTreasureChestRuntime } from './../../Core/AbyssTreasureChestRuntime.js';
export class AbyssTreasureChestSystem extends ModSystem{
 OnWorldLoad(){AbyssTreasureChestRuntime.Load();}
 PostUpdateTime(){AbyssTreasureChestRuntime.Update();}
 OnWorldUnload(){AbyssTreasureChestRuntime.Reset();}
}
