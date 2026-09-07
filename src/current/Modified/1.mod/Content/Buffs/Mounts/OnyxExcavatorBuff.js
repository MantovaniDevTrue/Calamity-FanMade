import { ModBuff } from './../../../TL/ModBuff.js';
import { ModMount } from './../../../TL/ModMount.js';

export class OnyxExcavatorBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Mounts/OnyxExcavatorBuff';
    }

    UpdatePlayer(player, buffIndex) {
        const type = Number(ModMount.getTypeByName('OnyxExcavator'));
        if (!Number.isFinite(type) || type < 0 || !player) return;
        try {
            const mount = player.mount;
            if (mount && (mount._active !== true || Number(mount._type) !== type)) {
                const setMount = mount['void SetMount(int m, Player mountedPlayer, bool ignoreEffect)'];
                if (typeof setMount === 'function') setMount(type, player, false);
                else if (typeof mount.SetMount === 'function') mount.SetMount(type, player, false);
            }
        } catch (e) { }
        try { player.AddBuff(this.Type, 10, false); } catch (e) { }
    }
}
