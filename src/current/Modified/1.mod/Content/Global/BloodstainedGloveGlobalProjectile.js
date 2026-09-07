import { Terraria } from './../../TL/ModImports.js';
import { GlobalProjectile } from './../../TL/GlobalProjectile.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { IsStealthStrike } from './../../Core/RogueRuntime.js';
import { FusionEntityData } from './../../Core/FusionEntityData.js';

const RogueProjectileNames = [
    'WulfrumKnifeProj',
    'ScourgeoftheDesertProj',
    'InfestedClawmerangProj',
    'MycorootProj',
    'RotBallProjectile',
    'ToothBallProjectile',
    'BouncingEyeballProjectile',
    'BouncingEyeballProjectileStealthStrike',
    'IronFranciscaProj',
    'LeadTomahawkProj',
    'EnchantedAxeProj',
    'FishboneBoomerangProjectile',
    'AshenStalagmiteProj',
    'CinquedeaProj',
    'GleamingDaggerProj',
    'KylieBoomerang',
    'GlaiveProj',
    'GlaiveOrbital',
    'SlickCaneProjectile'
];
let RogueProjectileTypes = null;
let CachedPlayerState = null;
function GetRogueProjectileTypes() {
    if (RogueProjectileTypes)
        return RogueProjectileTypes;
    const result = new Set();
    for (const name of RogueProjectileNames) {
        const type = Number(ModProjectile.getTypeByName(name) || 0);
        if (type > 0)
            result.add(type);
    }
    RogueProjectileTypes = result;
    return result;
}

export class BloodstainedGloveGlobalProjectile extends GlobalProjectile {
    AppliesToProjectileType(type) {
        return GetRogueProjectileTypes().has(Number(type));
    }

    IsRogue(projectile) {
        return !!(projectile && GetRogueProjectileTypes().has(Number(projectile.type)));
    }

    OnSpawn(projectile) {
        if (!this.IsRogue(projectile) || !IsStealthStrike(projectile))
            return;
        const state = CachedPlayerState || (CachedPlayerState = ModPlayer.getByName('CalamityPlayerState'));
        if (!state || state.BloodstainedGloveEquipped !== true)
            return;
        FusionEntityData.GetProjectileBag(projectile, 'bloodstainedGlove', () => ({ canHeal: true }));
    }

    OnHitNPC(projectile) {
        if (!this.IsRogue(projectile) || !IsStealthStrike(projectile))
            return;
        const state = CachedPlayerState || (CachedPlayerState = ModPlayer.getByName('CalamityPlayerState'));
        if (!state || state.BloodstainedGloveEquipped !== true)
            return;
        const bag = FusionEntityData.GetProjectileBag(projectile, 'bloodstainedGlove', () => ({ canHeal: true }));
        if (!bag.canHeal)
            return;
        bag.canHeal = false;
        let owner = null;
        try {
            owner = Terraria.Main.player[Math.floor(Number(projectile.owner))];
        } catch (e) { }
        if (!owner || owner.dead)
            return;
        const before = Number(owner.statLife) || 0;
        const max = Math.max(1, Number(owner.statLifeMax2) || 1);
        if (before >= max)
            return;
        const heal = Math.min(5, max - before);
        owner.statLife = before + heal;
        try {
            owner['void HealEffect(int healAmount, bool broadcast)'](heal, true);
        } catch (e) { }
    }
}
