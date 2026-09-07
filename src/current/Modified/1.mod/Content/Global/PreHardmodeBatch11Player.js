import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModItem } from './../../TL/ModItem.js';
import { SunkenSeaPreviewRuntime } from './../../Core/SunkenSeaPreviewRuntime.js';
export class PreHardmodeBatch11Player extends ModPlayer{
 ModifyCaughtFish(player,itemType){if(!player||!SunkenSeaPreviewRuntime.ContainsPlayer(player)||Math.random()>=.18)return itemType;const t=Number(ModItem.getTypeByName('Driftwood')||0);return t>0?t:itemType;}
}
