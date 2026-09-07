import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModMount } from './../../../TL/ModMount.js';

function MountActive(mount) {
    if (!mount) return false;
    try { if (Boolean(mount._active)) return true; } catch (_) { }
    try { if (Boolean(mount.Active)) return true; } catch (_) { }
    return false;
}

export class MarniteLiftBuff extends ModBuff {
    constructor() { super(); this.Texture = 'Buffs/Mounts/MarniteLiftBuff'; }
    SetStaticDefaults() { try { Terraria.Main.buffNoTimeDisplay[this.Type] = true; } catch (_) { } try { Terraria.Main.buffNoSave[this.Type] = true; } catch (_) { } }
    UpdatePlayer(player, buffIndex) {
        const type = Number(ModMount.getTypeByName('MarniteLift'));
        if (!(type >= 0) || !player) return;
        try {
            const mount = player.mount;
            if (mount && (!MountActive(mount) || Number(mount._type) !== type)) {
                const setMount = mount['void SetMount(int m, Player mountedPlayer, bool ignoreEffect)'];
                if (typeof setMount === 'function') setMount(type, player, false);
                else if (typeof mount.SetMount === 'function') mount.SetMount(type, player, false);
            }
        } catch (_) { }
        try { player.AddBuff(this.Type, 10, false); } catch (_) { }
    }
}
