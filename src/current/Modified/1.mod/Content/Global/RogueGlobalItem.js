import { GlobalItem } from './../../TL/GlobalItem.js';
import { IsRogueItem, GetRogueState } from './../../Core/RogueRuntime.js';
import { ModPlayer } from './../../TL/ModPlayer.js';

export class RogueGlobalItem extends GlobalItem {
    ModifyWeaponCrit(item, player, crit) {
        if (!IsRogueItem(item))
            return crit;
        const state = GetRogueState(player);
        const prowler = ModPlayer.getByName('DesertProwlerPlayer');
        const smokeCrit = prowler && typeof prowler.IsSmokeActive === 'function' && prowler.IsSmokeActive() ? 200 : 0;
        return Number(crit) + Math.max(0, Number(state?.RogueCritBonus || 0)) + smokeCrit;
    }

    ModifyWeaponKnockback(item, player, knockBack) {
        if (!IsRogueItem(item))
            return knockBack;
        const state = GetRogueState(player);
        return Number(knockBack) * (1 + Math.max(0, Number(state?.RogueKnockbackBonus || 0)));
    }

    UseTimeMultiplier(item, player) {
        if (!IsRogueItem(item))
            return 1;
        const state = GetRogueState(player);
        return 1 / Math.max(0.2, 1 + Math.max(0, Number(state?.RogueUseSpeedBonus || 0)));
    }

    UseAnimationMultiplier(item, player) {
        return this.UseTimeMultiplier(item, player);
    }
}
