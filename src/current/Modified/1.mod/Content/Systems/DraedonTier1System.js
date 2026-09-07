import { ModSystem } from './../../TL/ModSystem.js';
import { TickLaserBurns, TickCooldowns, RefreshTargets, HasActiveProjectileState, ClearWorldDraedonRuntime } from './../../Core/DraedonTier1Runtime.js';
export class DraedonTier1System extends ModSystem{
 OnWorldLoad(){ClearWorldDraedonRuntime();}
 OnWorldUnload(){ClearWorldDraedonRuntime();}
 PreUpdateTime(){if(HasActiveProjectileState())RefreshTargets(8);TickLaserBurns();TickCooldowns();}
}
