import { Terraria } from './../ModImports.js';

export class PlayerLoader {
    static RegisteredPlayers = [];
    static Handlers = Object.create(null);
    static EmptyHandlers = Object.freeze([]);
    static ByName = Object.create(null);

    static register(player) {
        this.RegisteredPlayers.push(player);
        this.ByName[player.constructor.name] = player;
        for (const method of Object.keys(player.__dispatch ?? {})) {
            let handlers = this.Handlers[method];
            if (!handlers) handlers = this.Handlers[method] = [];
            handlers.push(player);
        }
    }
    static getHandlers(name) { return this.Handlers[name] ?? this.EmptyHandlers; }
    static hasHandlers(name) { return (this.Handlers[name]?.length ?? 0) > 0; }
    static GetCallbacks(name) { return this.getHandlers(name); }
    static HasCallbacks(name) { return this.hasHandlers(name); }
    static InvalidateCallbacks() { }
    static getByName(name) { return this.ByName[name] ?? null; }

    static OnEnterWorld(player) {
        for (const modPlayer of this.GetCallbacks('OnEnterWorld')) {
            modPlayer?.OnEnterWorld(player);
        }
    }
    
    static OnRespawn(player) {
        for (const modPlayer of this.GetCallbacks('OnRespawn')) {
            modPlayer?.OnRespawn(player);
        }
    }
    
    static ModifyMaxStats(player) {
        let cumulativeHealth = 0;
        let cumulativeMana = 0;
        
        // Só percorro quem realmente implementa ModifyMaxStats. No Calamity atual
        // isso evita chamar dezenas de métodos vazios em todo ResetEffects.
        for (const modPlayer of this.GetCallbacks('ModifyMaxStats')) {
            modPlayer.ModifyMaxStats(player);
            cumulativeHealth += modPlayer.CumulativeHealth ?? 0;
            cumulativeMana += modPlayer.CumulativeMana ?? 0;
        }
        
        if (cumulativeHealth !== 0) player.statLifeMax2 = Math.max(1, player.statLifeMax2 + cumulativeHealth);
        if (cumulativeMana !== 0) player.statManaMax2 = Math.max(1, player.statManaMax2 + cumulativeMana);
    }
    
    static ResetEffects(player) {
        for (const modPlayer of this.GetCallbacks('ResetEffects')) {
            modPlayer.ResetEffects(player);
        }
    }
    
    static UpdateDead(player) {
        for (const modPlayer of this.GetCallbacks('UpdateDead')) {
            modPlayer.UpdateDead(player);
        }
    }
    
    static UpdateBadLifeRegen(player) {
        for (const modPlayer of this.GetCallbacks('UpdateBadLifeRegen')) {
            modPlayer?.UpdateBadLifeRegen(player);
        }
    }
    
    static UpdateLifeRegen(player) {
        for (const modPlayer of this.GetCallbacks('UpdateLifeRegen')) {
            modPlayer?.UpdateLifeRegen(player);
        }
    }
    
    static UpdateManaRegen(player) {
        for (const modPlayer of this.GetCallbacks('UpdateManaRegen')) {
            modPlayer?.UpdateManaRegen(player);
        }
    }
    
    static PreUpdate(player) {
        for (const modPlayer of this.GetCallbacks('PreUpdate')) {
            modPlayer?.PreUpdate(player);
        }
    }
    
    static PostUpdate(player) {
        for (const modPlayer of this.GetCallbacks('PostUpdate')) {
            modPlayer?.PostUpdate(player);
        }
    }
    
    static PreUpdateBuffs(player) {
        for (const modPlayer of this.GetCallbacks('PreUpdateBuffs')) {
            modPlayer?.PreUpdateBuffs(player);
        }
    }
    
    static PostUpdateBuffs(player) {
        for (const modPlayer of this.GetCallbacks('PostUpdateBuffs')) {
            modPlayer?.PostUpdateBuffs(player);
        }
    }
    
    static PreItemCheck(player) {
        if (this.GetCallbacks('PreItemCheck').some(mP => (mP?.PreItemCheck(player) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static PostItemCheck(player) {
        for (const modPlayer of this.GetCallbacks('PostItemCheck')) {
            modPlayer?.PostItemCheck(player);
        }
    }
    
    static CanUseItem(player, item) {
        let value = true;
        if (this.GetCallbacks('CanUseItem').some(mP => (mP?.CanUseItem(player, item) ?? true) === false)) {
            value = false;
        }
        return value;
    }
    
    static CanAutoReuseItem(player, item) {
        let value = true;
        if (this.GetCallbacks('CanAutoReuseItem').some(mP => (mP?.CanAutoReuseItem(player, item) ?? true) === false)) {
            value = false;
        }
        return value;
    }
    
    static ConsumeItem(player, item) {
        let value = true;
        if (this.GetCallbacks('ConsumeItem').some(mP => (mP?.ConsumeItem(player, item) ?? true) === false)) {
            value = false;
        }
        return value;
    }
    
    static OnConsumeItem(player, item) {
        for (const modPlayer of this.GetCallbacks('OnConsumeItem')) {
            modPlayer?.OnConsumeItem(player, item);
        }
    }
    
    static UseTimeMultiplier(player, item) {
        if (!item || item.type === 0) return 1.0;
        let multiplier = 1.0;
        for (const modPlayer of this.GetCallbacks('UseTimeMultiplier')) {
            multiplier *= modPlayer?.UseTimeMultiplier(player, item) ?? 1.0;
        }
        return multiplier;
    }
    
    static UseAnimationMultiplier(player, item) {
        if (!item || item.type === 0) return 1.0;
        let multiplier = 1.0;
        for (const modPlayer of this.GetCallbacks('UseAnimationMultiplier')) {
            multiplier *= modPlayer?.UseAnimationMultiplier(player, item) ?? 1.0;
        }
        return multiplier;
    }
    
    static UseSpeedMultiplier(player, item) {
        if (!item || item.type === 0) return 1.0;
        let multiplier = 1.0;
        for (const modPlayer of this.GetCallbacks('UseSpeedMultiplier')) {
            multiplier *= modPlayer?.UseSpeedMultiplier(player, item) ?? 1.0;
        }
        return multiplier;
    }
    
    static UseItem(player, item) {
        if (this.GetCallbacks('UseItem').some(gP => (gP?.UseItem(player, item) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static UseAnimation(player, item) {
        for (const modPlayer of this.GetCallbacks('UseAnimation')) {
            modPlayer?.UseAnimation(player, item);
        }
    }
    
    static GetHealLife(player, item, healValue = 0) {
        let newValue = healValue;
        for (const modPlayer of this.GetCallbacks('GetHealLife')) {
            newValue = modPlayer?.GetHealLife(player, item, newValue) ?? newValue;
        }
        return newValue;
    }
    
    static GetHealMana(player, item, healValue = 0) {
        let newValue = healValue;
        for (const modPlayer of this.GetCallbacks('GetHealMana')) {
            newValue = modPlayer?.GetHealMana(player, item, newValue) ?? newValue;
        }
        return newValue;
    }
    
    static OnConsumeMana(player, item, manaConsumed) {
        for (const modPlayer of this.GetCallbacks('OnConsumeMana')) {
            modPlayer?.OnConsumeMana(player, item, manaConsumed);
        }
    }
    
    static OnMissingMana(player, item, neededMana) {
        for (const modPlayer of this.GetCallbacks('OnMissingMana')) {
            modPlayer?.OnMissingMana(player, item, neededMana);
        }
    }
    
    static ModifyManaCost(player, item, mana) {
        let newValue = mana;
        for (const modPlayer of this.GetCallbacks('ModifyManaCost')) {
            modPlayer?.ModifyManaCost(player, item, newValue);
            newValue = modPlayer?.ManaCost ?? newValue;
        }
        return newValue;
    }
    
    static ModifyWeaponDamage(player, item, damage) {
        let newValue = damage;
        for (const modPlayer of this.GetCallbacks('ModifyWeaponDamage')) {
            modPlayer?.ModifyWeaponDamage(player, item, newValue);
            newValue = modPlayer?.WeaponDamage ?? newValue;
        }
        return newValue;
    }
    
    static ModifyWeaponCrit(player, item, crit) {
        let newValue = crit;
        for (const modPlayer of this.GetCallbacks('ModifyWeaponCrit')) {
            modPlayer?.ModifyWeaponCrit(player, item, newValue);
            newValue = modPlayer?.WeaponCrit ?? newValue;
        }
        return newValue;
    }
    
    static ModifyWeaponKnockback(player, item, knockBack) {
        let newValue = knockBack;
        for (const modPlayer of this.GetCallbacks('ModifyWeaponKnockback')) {
            modPlayer?.ModifyWeaponKnockback(player, item, newValue);
            newValue = modPlayer?.WeaponKnockback ?? newValue;
        }
        return newValue;
    }
    
    static CanShoot(player, item) {
        if (this.GetCallbacks('CanShoot').some(mP => (mP?.CanShoot(player, item) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static ModifyShootStats(player, stats) {
        for (const modPlayer of this.GetCallbacks('ModifyShootStats')) {
            modPlayer?.ModifyShootStats(player, stats);
        }
    }
    
    static Shoot(player, item, position, velocity, type, damage, knockBack) {
        if (this.GetCallbacks('Shoot').some(mP => (mP?.Shoot(player, item, position, velocity, type, damage, knockBack) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static OnHitNPC(player, item, npc, damageDone, knockBack, crit) {
        for (const modPlayer of this.GetCallbacks('OnHitNPC')) {
            modPlayer?.OnHitNPC(player, item, npc, damageDone, knockBack, crit);
        }
    }
    
    static OnHitNPCWithProj(player, npc, projectile) {
        for (const modPlayer of this.GetCallbacks('OnHitNPCWithProj')) {
            modPlayer?.OnHitNPCWithProj(player, npc, projectile);
        }
    }
    
    static UpdateInventory(player) {
        for (const modPlayer of this.GetCallbacks('UpdateInventory')) {
            modPlayer?.UpdateInventory(player);
        }
    }
    
    static UpdateEquips(player, item) {
        for (const modPlayer of this.GetCallbacks('UpdateEquips')) {
            modPlayer?.UpdateEquips(player);
        }
    }
    
    static UpdateAccessory(player, item, vanity, hideVisual) {
        for (const modPlayer of this.GetCallbacks('UpdateAccessory')) {
            modPlayer?.UpdateAccessory(player, item, vanity, hideVisual);
        }
    }
    
    static UpdateDyes(player) {
        for (const modPlayer of this.GetCallbacks('UpdateDyes')) {
            modPlayer?.UpdateDyes(player);
        }
    }
    
    static IsArmorSet(player, head, body, legs) {
        if (this.GetCallbacks('IsArmorSet').some(mP => (mP?.IsArmorSet(player, head, body, legs) ?? false) === true)) {
            return true;
        }
        return false;
    }
    
    static UpdateArmorSet(player, item) {
        for (const modPlayer of this.GetCallbacks('UpdateArmorSet')) {
            modPlayer?.UpdateArmorSet(player, item);
        }
    }
    
    static IsVanitySet(player, head, body, legs) {
        if (this.RegisteredPlayers.some(mP => (mP?.IsVanitySet(player, head, body, legs) ?? false) === true)) {
            return true;
        }
        return false;
    }
    
    static UpdateVanitySet(player, item) {
        for (const modPlayer of this.GetCallbacks('UpdateVanitySet')) {
            modPlayer?.UpdateVanitySet(player, item);
        }
    }
    
    static UpdateCamera(player) {
        for (const modPlayer of this.GetCallbacks('UpdateCamera')) {
            modPlayer?.UpdateCamera(player);
        }
    }
    
    static UpdateMovement(player) {
        for (const modPlayer of this.GetCallbacks('UpdateMovement')) {
            modPlayer?.UpdateMovement(player);
        }
    }
    
    static WingMovement(player, item) {
        for (const modPlayer of this.GetCallbacks('WingMovement')) {
            modPlayer?.WingMovement(player, item);
        }
    }
    
    static CanPickup(player, item) {
        if (this.GetCallbacks('CanPickup').some(mP => (mP?.CanPickup(player, item) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static OnPickup(player, item) {
        for (const modPlayer of this.GetCallbacks('OnPickup')) {
            modPlayer?.OnPickup(player, item);
        }
    }
    
    static ExtractinatorUse(player, item, extractType, extractinatorBlockType) {
        if (this.GetCallbacks('ExtractinatorUse').some(mP => (mP?.ExtractinatorUse(player, item, extractType, extractinatorBlockType) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static OnCraft(player, recipe) {
        for (const modPlayer of this.GetCallbacks('OnCraft')) {
            modPlayer?.OnCraft(player, recipe);
        }
    }
    
    static PreModifyLuck(player, luck) {
        if (this.GetCallbacks('PreModifyLuck').some(mP => (mP?.PreModifyLuck(player, luck) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static ModifyLuck(player, luck) {
        for (const modPlayer of this.GetCallbacks('ModifyLuck')) {
            modPlayer?.ModifyLuck(player, luck);
            luck = modPlayer?.Luck ?? luck;
        }
        player.luck = luck;
    }
    
    static ImmuneTo(player, damageSource, cooldownCounter, dodgeable) {
        if (this.GetCallbacks('ImmuneTo').some(mP => (mP?.ImmuneTo(player, damageSource, cooldownCounter, dodgeable) ?? false) === true)) {
            return true;
        }
        return false;
    }
    
    static FreeDodge(self, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        if (this.GetCallbacks('FreeDodge').some(mP => (mP?.FreeDodge(self, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) ?? false) === true)) {
            return true;
        }
        return false;
    }
    
    static ModifyHurt(player, modifiersOrDamage, hitDirection, quiet, crit, dodgeable) {
        const modifiers = modifiersOrDamage && typeof modifiersOrDamage === 'object'
            ? modifiersOrDamage
            : { damage: modifiersOrDamage, hitDirection, quiet, crit, dodgeable };
        for (const modPlayer of this.GetCallbacks('ModifyHurt')) {
            modPlayer.ModifyHurt(player, modifiers);
        }
        return modifiers;
    }
    
    static OnHurt(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        for (const modPlayer of this.GetCallbacks('OnHurt')) {
            modPlayer?.OnHurt(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable);
        }
    }
    
    static PostHurt(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        for (const modPlayer of this.GetCallbacks('PostHurt')) {
            modPlayer?.PostHurt(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable);
        }
    }
    
    static PreKill(player, damageSource, damage, hitDirection, pvp) {
        for (const modPlayer of this.GetCallbacks('PreKill')) {
            modPlayer?.PreKill(player, damageSource, damage, hitDirection, pvp);
        }
    }
    
    static Kill(player, damageSource, damage, hitDirection, pvp) {
        for (const modPlayer of this.GetCallbacks('Kill')) {
            modPlayer?.Kill(player, damageSource, damage, hitDirection, pvp);
        }
    }
    
    static GetDyeTraderReward(player, dyeTrader, rewardItems) {
        for (const modPlayer of this.GetCallbacks('GetDyeTraderReward')) {
            modPlayer?.GetDyeTraderReward(player, dyeTrader, rewardItems);
        }
    }
    
    static AnglerQuestReward(player, angler, questItemType) {
        if (this.GetCallbacks('AnglerQuestReward').some(mP => (mP?.AnglerQuestReward(player, angler, questItemType) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static CanSellItem(player, npc, shopInventory, item) {
        if (this.GetCallbacks('CanSellItem').some(mP => (mP?.CanSellItem(player, npc, shopInventory, item) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static PostSellItem(player, npc, shopInventory, item) {
        for (const modPlayer of this.GetCallbacks('PostSellItem')) {
            modPlayer?.PostSellItem(player, npc, shopInventory, item);
        }
    }
    
    static SetupStartingItems(player, mediumCoreDeath = false) {
        for (const modPlayer of this.GetCallbacks('SetupStartingItems')) {
            modPlayer?.SetupStartingItems(player, mediumCoreDeath);
        }
    }
    
    static CanCatchNPC(player, npc, item) {
        if (this.GetCallbacks('CanCatchNPC').some(mP => (mP?.CanCatchNPC(player, npc, item) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static OnCatchNPC(player, npc, item, failed) {
        for (const modPlayer of this.GetCallbacks('OnCatchNPC')) {
            modPlayer?.OnCatchNPC(player, npc, item, failed);
        }
    }
    
    static CanReleaseNPC(player, npcType, item, x, y) {
        if (this.GetCallbacks('CanReleaseNPC').some(mP => (mP?.CanReleaseNPC(player, npcType, item, x, y) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static OnReleaseNPC(player, npc) {
        for (const modPlayer of this.GetCallbacks('OnReleaseNPC')) {
            modPlayer?.OnReleaseNPC(player, npc);
        }
    }
    
    static ModifyCaughtFish(player, itemType) {
        let newType = itemType;
        for (const modPlayer of this.GetCallbacks('ModifyCaughtFish')) {
            newType = modPlayer?.ModifyCaughtFish(player, newType) ?? newType;
        }
        return newType ?? itemType;
    }
    
    static ShouldDrawParts(player, parts) {
        for (const modPlayer of this.GetCallbacks('ShouldDrawParts')) {
            modPlayer?.ShouldDrawParts(player, parts);
        }
    }
    
    static SendMessage(player, message) {
        if (this.GetCallbacks('SendMessage').some(gP => (gP?.SendMessage(player, message) ?? true) === false)) {
            return false;
        }
        return true;
    }
}