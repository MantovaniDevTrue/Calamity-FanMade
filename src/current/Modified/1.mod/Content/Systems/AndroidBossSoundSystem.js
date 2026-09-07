import { ModSystem } from './../../TL/ModSystem.js';
import { AndroidSound } from './../../Common/Snippets/AndroidSound.js';

export class AndroidBossSoundSystem extends ModSystem {
    OnWorldUnload() {
        AndroidSound.ReleaseAll();
    }

    PreSaveAndQuit() {
        AndroidSound.ReleaseAll();
    }
}
