import { Terraria } from './../ModImports.js';
import { ItemLoader } from './ItemLoader.js';
import { NPCLoader } from './NPCLoader.js';  
import { PlayerLoader } from './PlayerLoader.js';  
import { SystemLoader } from './SystemLoader.js';  
import { ProjectileLoader } from './ProjectileLoader.js';  
import { AchievementLoader } from './AchievementLoader.js';  

export class CombinedLoader {
    static CanUseItem(item, player) {
        return ItemLoader.CanUseItem(item, player)
        && PlayerLoader.CanUseItem(player, item);
    }
    
    static CanAutoReuseItem(item, player) {
        return ItemLoader.CanAutoReuseItem(item, player)
        && PlayerLoader.CanAutoReuseItem(player, item);
    }
    
    static ConsumeItem(item, player) {
        return ItemLoader.ConsumeItem(item, player)
        && PlayerLoader.ConsumeItem(player, item);
    }
    
    static OnConsumeItem(item, player) {
        ItemLoader.OnConsumeItem(item, player)
        PlayerLoader.OnConsumeItem(player, item);
    }
    
    static UseItem(item, player) {
        return ItemLoader.UseItem(item, player)
        && PlayerLoader.UseItem(player, item);
    }
    
    static UseAnimation(item, player) {
        ItemLoader.UseAnimation(item, player);
        PlayerLoader.UseAnimation(player, item);
    }
    
    static HoldItem(item, player) {
        ItemLoader.HoldItem(item, player);
    }
    
    static UseStyle(item, player, mountOffset, heldItemFrame) {
        ItemLoader.HoldoutOffset(item, player);
        ItemLoader.UseStyle(item, player, mountOffset, heldItemFrame);
    }
    
    static HoldStyle(item, player, mountOffset, heldItemFrame) {
        ItemLoader.HoldoutOffset(item, player);
        ItemLoader.HoldStyle(item, player, mountOffset, heldItemFrame);
    }
    
    static UseSpeedMultiplier(item, player) {
        const itemMultiplier = ItemLoader.UseTimeMultiplier(item, player) * ItemLoader.UseSpeedMultiplier(item, player);
        const playerMultiplier = PlayerLoader.UseTimeMultiplier(player, item) * PlayerLoader.UseSpeedMultiplier(player, item);
        return itemMultiplier * playerMultiplier;
    }
    
    static UseAnimationMultiplier(item, player) {
        const itemMultiplier = ItemLoader.UseAnimationMultiplier(item, player) * ItemLoader.UseSpeedMultiplier(item, player);
        const playerMultiplier = PlayerLoader.UseAnimationMultiplier(player, item) * PlayerLoader.UseSpeedMultiplier(player, item);
        return itemMultiplier * playerMultiplier;
    }
    
    static GetHealLife(item, player, healValue) {
        healValue = ItemLoader.GetHealLife(item, player, healValue);
        healValue = PlayerLoader.GetHealLife(player, item, healValue);
        return healValue;
    }
    
    static GetHealMana(item, player, healValue) {
        healValue = ItemLoader.GetHealMana(item, player, healValue);
        healValue = PlayerLoader.GetHealMana(player, item, healValue);
        return healValue;
    }
    
    static OnMissingMana(item, player, neededMana) {
        ItemLoader.OnMissingMana(item, player, neededMana);
        PlayerLoader.OnMissingMana(player, item, neededMana);
    }
    
    static OnConsumeMana(item, player, manaConsumed) {
        ItemLoader.OnConsumeMana(item, player, manaConsumed);
        PlayerLoader.OnConsumeMana(player, item, manaConsumed);
    }
    
    static ModifyManaCost(item, player, mana) {
        let value = mana;
        value = ItemLoader.ModifyManaCost(item, player, value);
        value = PlayerLoader.ModifyManaCost(player, item, value);
        return value;
    }
    
    static ModifyWeaponDamage(item, player, damage) {
        let value = damage;
        value = ItemLoader.ModifyWeaponDamage(item, player, value);
        value = PlayerLoader.ModifyWeaponDamage(player, item, value);
        return value;
    }
    
    static ModifyWeaponCrit(item, player, crit) {
        let value = crit;
        value = ItemLoader.ModifyWeaponCrit(item, player, value);
        value = PlayerLoader.ModifyWeaponCrit(player, item, value);
        return value;
    }
    
    static ModifyWeaponKnockback(item, player, knockBack) {
        let value = knockBack;
        value = ItemLoader.ModifyWeaponKnockback(item, player, value);
        value = PlayerLoader.ModifyWeaponKnockback(player, item, value);
        return value;
    }
    
    static CanShoot(item, player) {
        return ItemLoader.CanShoot(item, player)
        && PlayerLoader.CanShoot(player, item);
    }
    
    static ModifyShootStats(item, player, position, velocity, type, damage, knockBack) {
        const stats = { position, velocity, type, damage, knockBack };
        ItemLoader.ModifyShootStats(item, player, stats);
        PlayerLoader.ModifyShootStats(player, stats);
        return stats;
    }
    
    static Shoot(item, player, position, velocity, type, damage, knockBack) {
        return ItemLoader.Shoot(item, player, position, velocity, type, damage, knockBack)
        && PlayerLoader.Shoot(player, item, position, velocity, type, damage, knockBack);
    }
    
    static OnHitNPC(item, player, npc, damageDone, knockBack, crit) {
        if (ItemLoader.isModType(item?.type) || ItemLoader.HasGlobalItems()) {
            ItemLoader.OnHitNPC(item, player, npc, damageDone, knockBack, crit);
        }
        if (NPCLoader.isModType(npc?.type) || NPCLoader.HasGlobalCallback('OnHitByPlayer')) {
            NPCLoader.OnHitByPlayer(npc, player, item, damageDone, knockBack, crit);
        }
        PlayerLoader.OnHitNPC(player, item, npc, damageDone, knockBack, crit);
    }
    
    static OnHitNPCWithProj(proj, npc) {
        // Current global projectile hit behavior applies only to ported Rogue
        // projectiles, which are custom types. Vanilla hits only need the player
        // callback used by Rage, avoiding two empty loader dispatches per hit.
        if (ProjectileLoader.isModType(proj?.type)) ProjectileLoader.OnHitNPC(proj, npc);
        if (NPCLoader.isModType(npc?.type) || NPCLoader.HasGlobalCallback('OnHitByProjectile')) {
            NPCLoader.OnHitByProjectile(npc, proj);
        }
        PlayerLoader.OnHitNPCWithProj(Terraria.Main.player[proj.owner], npc, proj);
    }
    
    static ModifyPlayerHurt(player, damageSource, damage, hitDirection, quiet, crit, dodgeable) {
        const modifiers = { damageSource, damage, hitDirection, quiet, crit, dodgeable };
        if (damageSource._sourceNPCIndex > -1) {
            const npc = Terraria.Main.npc[damageSource._sourceNPCIndex];
            if (npc && npc.active) NPCLoader.ModifyHitPlayer(npc, player, modifiers);
        }
        PlayerLoader.ModifyHurt(player, modifiers);
        return modifiers;
    }
    
    static UpdateEquips(player, updateInventory) {
        // No GlobalItem is registered in this port. Avoid walking vanilla items
        // through the JavaScript bridge every frame; only custom item types need
        // TLPro callbacks.
        PlayerLoader.UpdateInventory(player);
        if (updateInventory) {
            const inventory = player.inventory;
            for (let i = 0; i < 58; i++) {
                const item = inventory[i];
                if (!item || !ItemLoader.isModType(item.type)) continue;
                ItemLoader.UpdateInventory(item, player);
            }
        }

        PlayerLoader.UpdateEquips(player);
        const armor = player.armor;
        for (let j = 0; j < 10; j++) {
            if (!player.IsItemSlotUnlockedAndUsable(j)) continue;
            const item = armor[j];
            if (!item || item.type === 0 || !ItemLoader.isModType(item.type)
                || (item.expertOnly && !Terraria.Main.expertMode)) continue;
            ItemLoader.UpdateEquip(item, player);
        }
    }
    
    static UpdateAccessory(item, player, vanity, hideVisual = false) {
        if (!item || item.type === 0 || (item.expertOnly && !Terraria.Main.expertMode)) return;
        // ApplyEquipVanity must use the dedicated vanity callback. The previous
        // bridge passed the vanity boolean as hideVisual to UpdateAccessory,
        // which activated full accessory effects from social slots.
        if (vanity === true) ItemLoader.UpdateVanityAccessory(item, player);
        else ItemLoader.UpdateAccessory(item, player, hideVisual);
        PlayerLoader.UpdateAccessory(player, item, vanity, hideVisual);
    }
    
    static UpdateArmorSets(player) {
        const armor = player.armor;
        
        const head = armor[0];
        const body = armor[1];
        const legs = armor[2];
        
        if (PlayerLoader.IsArmorSet(player, head, body, legs)) {
            PlayerLoader.UpdateArmorSet(player);
        }
    
        const vanityHead = armor[10];
        const vanityBody = armor[11];
        const vanityLegs = armor[12];
    
        for (let j = 10; j < 13; j++) {
            const item = armor[j];
            if (!item || item.type === 0) continue;
    
            if (ItemLoader.IsVanitySet(item, vanityHead, vanityBody, vanityLegs)) {
                ItemLoader.UpdateVanitySet(item, player);
            }
        }
    
        if (PlayerLoader.IsVanitySet(player, vanityHead, vanityBody, vanityLegs)) {
            PlayerLoader.UpdateVanitySet(player);
        }
    }
    
    static WingMovement(player) {
        const armor = player.armor;
        const wings = player.wings;
        let item = null;
        for (let i = 3; i < 10; i++) {
            if (player.IsItemSlotUnlockedAndUsable(i)) {
                if (armor[i]?.wingSlot === wings) {
                    item = armor[i];
                    break;
                }
            }
        }
        if (item && item.type > 0) {
            ItemLoader.WingMovement(item, player);
            PlayerLoader.WingMovement(player, item);
        }
    }
    
    static CanPickup(item, player) {
        return ItemLoader.CanPickup(item, player)
        && PlayerLoader.CanPickup(player, item);
    }
    
    static OnPickup(item, player) {
        ItemLoader.OnPickup(item, player);
        PlayerLoader.OnPickup(player, item);
        AchievementLoader.OnItemPickup(player, item, item.stack);
    }
    
    static ExtractinatorUse(item, player, extractType, extractinatorBlockType) {
        return ItemLoader.ExtractinatorUse(item, player, extractType, extractinatorBlockType)
        && PlayerLoader.ExtractinatorUse(player, item, extractType, extractinatorBlockType);
    }
    
    static OnCraft(item, player, recipe) {
        ItemLoader.OnCraft(item, player, recipe);
        PlayerLoader.OnCraft(player, recipe);
        AchievementLoader.OnItemCraft(recipe.createItem.type, recipe.createItem.stack);
    }
    
    static IsAnglerQuestAvailable(type) {
        return ItemLoader.IsAnglerQuestAvailable(type);
    }
    
    static CanCatchNPC(player, npc, item) {
        return NPCLoader.CanBeCaughtBy(npc, player, item)
        && PlayerLoader.CanCatchNPC(player, npc, item);
    }
    
    static OnCatchNPC(player, npc, item, failed) {
        NPCLoader.OnCaughtBy(npc, player, item, failed);
        PlayerLoader.OnCatchNPC(player, npc, item, failed);
    }
    
    static SendMessage(player, message) {
        return PlayerLoader.SendMessage(player, message)
        && SystemLoader.SendMessage(player, message);
    }
}