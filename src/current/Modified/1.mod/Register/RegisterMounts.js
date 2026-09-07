import { ModMount } from './../TL/ModMount.js';
import { OnyxExcavator } from './../Content/Mounts/OnyxExcavator.js';
import { MarniteLift } from './../Content/Mounts/MarniteLift.js';

export function RegisterMounts() {
    ModMount.register(OnyxExcavator);
    // Phase 13.26.1: append-only mount ID.
    ModMount.register(MarniteLift);
}
