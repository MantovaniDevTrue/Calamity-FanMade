import { Terraria } from './ModImports.js';
import { AchievementLoader } from './Loaders/AchievementLoader.js';
import { ModLocalization } from './ModLocalization.js';

export class ModAchievement {
    // The achievement instance
    Achievement = null;
    // The texture file path used by this achievement
    Texture = '';
    
    // The index of this achievement within the texture. Additional achievements are placed below on new rows. Can be used to share a achievement texture among multiple achievements. Defaults to 0.
    get Index() {
        return 0;
    }
    // Gets the localized friendly name of the achievement.
    get FriendlyName() {
        return ModLocalization.ToLocalizedText(ModLocalization.Translate(`Achievements.${this.constructor.name}.Name`));
    }
    // Gets the localized description of the achievement.
    get Description() {
        return ModLocalization.ToLocalizedText(ModLocalization.Translate(`Achievements.${this.constructor.name}.Description`));
    }
    // Gets the achievement category from the achievements menu.
    get Category() {
        return Terraria.Achievements.AchievementCategory.Slayer;
    }
    // Should the achievement be hidden, meaning its name and description will both appear as "???" in the achievements menu.
    get IsHidden() {
        return false;
    }
    // Check if the achievement has been completed
    get IsCompleted() {
        return this.Achievement.IsCompleted;
    }
    
    SetupContent() {
        Terraria.Main.Achievements.Register(this.Achievement);
        Terraria.Main.Achievements.RegisterIconIndex(this.constructor.name, this.Index);
        Terraria.Main.Achievements.RegisterAchievementCategory(this.constructor.name, this.Category);
    }
    
    // Sets the common properties and conditions of the achievement.
    SetStaticDefaults() {
        
    }
    
    // Called when the achievement is completed. Use this to add custom behavior when the achievement is achieved.
    OnCompleted(achievement) {
        
    }
    
    OnEnterWorld(player) {
        
    }
    
    OnItemPickup(player, itemType, stack) {
        
    }
    
    OnItemCraft(itemType, stack) {
        
    }
    
    OnNPCKilled(player, npcId) {
        
    }
    
    OnTileDestroyed(player, tileType) {
        
    }
    
    AddFlagCondition(name) {
        const condition = Terraria.GameContent.Achievements.CustomFlagCondition[
        'AchievementCondition Create(string name)'
        ](name);
        this._conditionNames.push(condition.Name);
        this.Achievement.AddCondition(condition);
    }
    
    AddIntCondition(name, maxValue = 1, useTracker = false) {
        const condition = Terraria.GameContent.Achievements.CustomIntCondition[
        'AchievementCondition Create(string name, int maxValue)'
        ](name, maxValue);
        condition._tracker = condition.CreateAchievementTracker();
        this._conditionNames.push(condition.Name);
        this.Achievement.AddCondition(condition);
        if (useTracker) this.UseTracker(condition._tracker);
    }
    
    AddFloatCondition(name, maxValue = 1, useTracker = false) {
        const condition = Terraria.GameContent.Achievements.CustomFloatCondition[
        'AchievementCondition Create(string name, float maxValue)'
        ](name, maxValue);
        condition._tracker = condition.CreateAchievementTracker();
        this._conditionNames.push(condition.Name);
        this.Achievement.AddCondition(condition);
        if (useTracker) this.UseTracker(condition._tracker);
    }
    
    AddItemCraftCondition(itemIds) {
        let condition = null;
        
        if (Array.isArray(itemIds)) {
            condition = Terraria.GameContent.Achievements.ItemCraftCondition[
            'AchievementCondition Create(LocalUser user, short[] itemIds)'
            ](AchievementLoader.LocalUser, itemIds.makeGeneric('short'));
        } else {
            condition = Terraria.GameContent.Achievements.ItemCraftCondition[
            'AchievementCondition Create(LocalUser user, short itemId)'
            ](AchievementLoader.LocalUser, itemIds);
        }
        
        if (condition !== null) {
            this._conditionNames.push(condition.Name);
            this.Achievement.AddCondition(condition);
        }
    }
    
    AddItemPickupCondition(itemIds) {
        let condition = null;
        
        if (Array.isArray(itemIds)) {
            condition = Terraria.GameContent.Achievements.ItemPickupCondition[
            'AchievementCondition Create(LocalUser user, short[] itemIds)'
            ](AchievementLoader.LocalUser, itemIds.makeGeneric('short'));
        } else {
            condition = Terraria.GameContent.Achievements.ItemPickupCondition[
            'AchievementCondition Create(LocalUser user, short itemId)'
            ](AchievementLoader.LocalUser, itemIds);
        }
        
        if (condition !== null) {
            this._conditionNames.push(condition.Name);
            this.Achievement.AddCondition(condition);
        }
    }
    
    AddNPCKilledCondition(npcIds) {
        let condition = null;
        
        if (Array.isArray(npcIds)) {
            condition = Terraria.GameContent.Achievements.NPCKilledCondition[
            'AchievementCondition Create(LocalUser user, short[] npcIds)'
            ](AchievementLoader.LocalUser, npcIds.makeGeneric('short'));
        } else {
            condition = Terraria.GameContent.Achievements.NPCKilledCondition[
            'AchievementCondition Create(LocalUser user, short npcId)'
            ](AchievementLoader.LocalUser, npcIds);
        }
        
        if (condition !== null) {
            this._conditionNames.push(condition.Name);
            this.Achievement.AddCondition(condition);
        }
    }
    
    AddTileDestroyedCondition(tileIds) {
        let condition = null;
        
        if (Array.isArray(tileIds)) {
            condition = Terraria.GameContent.Achievements.TileDestroyedCondition[
            'AchievementCondition Create(LocalUser user, ushort[] tileIds)'
            ](AchievementLoader.LocalUser, tileIds.makeGeneric('ushort'));
        }
        
        if (condition !== null) {
            this._conditionNames.push(condition.Name);
            this.Achievement.AddCondition(condition);
        }
    }
    
    UseTracker(achievementTracker) {
        this.Achievement.UseTracker(achievementTracker);
    }
    
    UseTrackerFromCondition(conditionName) {
        this.Achievement.UseTrackerFromCondition(conditionName);
    }
    
    static GetAchievement(name) {
        return AchievementLoader.GetAchievement(name);
    }
    static Complete(name) {
        AchievementLoader.Complete(name);
    }
    static register(achievement) {
        AchievementLoader.register(new achievement());
    }
}