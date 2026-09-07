import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModPlayer } from './../../TL/ModPlayer.js';

let HookInstalled = false;

export class StatigelJumpHookSystem extends ModSystem {
    OnModLoad() {
        if (HookInstalled) return;
        const jumpMovement = Terraria.Player['void JumpMovement()'];
        if (!jumpMovement || typeof jumpMovement.hook !== 'function') return;
        jumpMovement.hook((original, self) => {
            const state = ModPlayer.getByName('StatigelPlayer');
            try { state?.BeforeJumpMovement(self); } catch (e) { }
            original(self);
            try { state?.AfterJumpMovement(self); } catch (e) { }
        });
        HookInstalled = true;
        try { tl.log('[CalamityPort Statigel] native JumpMovement observer installed; jump option is armed earlier by UpdateArmorSet.'); } catch (e) { }
    }
}
