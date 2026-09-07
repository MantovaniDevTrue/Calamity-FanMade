import { ModPlayer } from './../../TL/ModPlayer.js';
import { FusionCamera } from './../../Core/FusionCamera.js';

export class FusionCameraPlayer extends ModPlayer {
    UpdateCamera() {
        if (FusionCamera.FocusMode === 'none')
            return;
        try {
            FusionCamera.UpdateFocus();
        } catch (_) {
            FusionCamera.ReleaseFocus();
        }
    }
}
