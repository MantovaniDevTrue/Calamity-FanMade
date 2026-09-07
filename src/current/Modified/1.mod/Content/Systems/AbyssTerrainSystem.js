import { ModSystem } from './../../TL/ModSystem.js';
import { AbyssTerrainRuntime } from './../../Core/AbyssTerrainRuntime.js';

export class AbyssTerrainSystem extends ModSystem{
 OnWorldLoad(){AbyssTerrainRuntime.Load();}
 PostUpdateTime(){AbyssTerrainRuntime.Update();}
 PreSaveAndQuit(){AbyssTerrainRuntime.Save(AbyssTerrainRuntime.Generated?'complete':(AbyssTerrainRuntime.Active?'running':'paused'));}
 OnWorldUnload(){AbyssTerrainRuntime.Reset();}
}
