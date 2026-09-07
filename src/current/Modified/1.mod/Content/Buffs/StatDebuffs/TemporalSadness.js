import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
const { Vector2 } = Modules;

// Current Calamity behavior: 20% velocity reduction per update while the debuff is active.
export class TemporalSadness extends ModBuff {
    constructor() { super(); this.Texture = 'Buffs/StatDebuffs/TemporalSadness'; }
    SetStaticDefaults() {
        try { Terraria.Main.debuff[this.Type] = true; } catch (_) { }
        try { Terraria.Main.pvpBuff[this.Type] = true; } catch (_) { }
        try { Terraria.Main.buffNoSave[this.Type] = true; } catch (_) { }
    }
    UpdateNPC(npc) {
        if (!npc || npc.active === false || npc.friendly || npc.townNPC || npc.dontTakeDamage) return;
        try {
            npc.velocity = Vector2.new(Number(npc.velocity.X) * 0.8, Number(npc.velocity.Y) * 0.8);
        } catch (_) { }
    }
}
