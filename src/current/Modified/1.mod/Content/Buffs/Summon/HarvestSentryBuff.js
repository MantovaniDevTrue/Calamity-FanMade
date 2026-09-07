import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
function killOwned(player,type){if(!player||!(type>0))return;let owner=-1;try{owner=Math.floor(Number(Terraria.PlayerIndex(player)));}catch(_){}for(let i=0;i<1000;i++){let p=null;try{p=Terraria.Main.projectile[i];}catch(_){}if(p&&p.active&&Number(p.owner)===owner&&Number(p.type)===Number(type)){try{p.Kill();}catch(_){try{p.active=false;}catch(__){}}}}}

function setArray(holder, name, index, value) {
    try {
        let a = holder[name], need = Number(index) + 1;
        let len = Number(a && a.Length); if (!Number.isFinite(len)) len = Number(a && a.length) || 0;
        if (len < need) { a = a.cloneResized(need); holder[name] = a; }
        try { a['void SetValue(Object value, int index)'](value, Number(index)); return true; } catch (_) { }
        try { a.set_Item(Number(index), value); return true; } catch (_) { }
    } catch (_) { }
    return false;
}

// Mesmo princípio do Squirrel: não transforma a Harvest em minion normal;
// é só um controle mobile visível para dispensar a sentry e seus pumpkins.
export class HarvestSentryBuff extends ModBuff {
    constructor() { super(); this.Texture = 'Buffs/Summon/HarvestSentryBuff'; }
    SetStaticDefaults() {
        setArray(Terraria.Main, 'buffNoTimeDisplay', this.Type, true);
        setArray(Terraria.Main, 'buffNoSave', this.Type, true);
    }
    UpdatePlayer(player, buffIndex) {
        if (!player || player.dead) { try { if (player) player.DelBuff(buffIndex); } catch (_) { } }
    }
    OnRemove(player) {
        killOwned(player, Number(ModProjectile.getTypeByName('HarvestStaffSentry') || 0));
        killOwned(player, Number(ModProjectile.getTypeByName('HarvestStaffMinion') || 0));
    }
}
