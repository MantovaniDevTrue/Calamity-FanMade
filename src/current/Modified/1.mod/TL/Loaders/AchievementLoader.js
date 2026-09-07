import { Terraria } from './../ModImports.js';
import { ModTexture } from './../ModTexture.js';

const LocalUser = new NativeClass('', 'LocalUser');

export class AchievementLoader {
    static Achievements = [];
    static AchievementNames = new Set();
    static Count = 0;
    static HiddenText = null;
    static _isLoaded = false;
    static _loadHook = false;
    
    static get LocalUser() {
        return LocalUser.Active;
    }
    
    static GetAchievement(name) {
        return this.Achievements.find(a => a.constructor.name === name);
    }
    static isModAchievement(achievement) {
        return this.AchievementNames.has(achievement.Name);
    }
    static register(achievement) {
        this.Achievements.push(achievement);
    }
    
    static LoadAchievements() {
        for (const achievement of this.Achievements) {
            this.LoadAchievement(achievement);
        }
    }
    
    static LoadAchievement(achievement) {
        this.Count++;
        this.AchievementNames.add(achievement.constructor.name);
        
        achievement.Achievement = Terraria.Achievements.Achievement.new();
        achievement.Achievement['void .ctor(string name)'](achievement.constructor.name);
        achievement.Achievement.FriendlyName = achievement.FriendlyName;
        achievement.Achievement.Description = achievement.Description;
        
        const achievementTexture = new ModTexture('Textures/' + achievement.Texture);
        if (achievementTexture?.exists) {
            achievement._texture = achievementTexture.asset.asset;
        }
        
        achievement._conditionNames = [];
        achievement.SetStaticDefaults();
    }
    
    static SetupContent() {
        this.HiddenText = Terraria.Localization.Language.GetText('???');
        this.LoadAchievements();
        for (const achievement of this.Achievements) {
            achievement.SetupContent();
        }
        if (AchievementLoader._loadHook) {
            this._isLoaded = true;
            Terraria.Main.Achievements['void Load()']();
        }
    }
    
    static Complete(name) {
        const achievement = AchievementLoader.GetAchievement(name);
        if (achievement) {
            const _achievement = achievement.Achievement;
            if (_achievement._completedCount !== _achievement._conditions.Count) {
                for (const conditionName of achievement._conditionNames) {
                    const c = Terraria.Main.Achievements['AchievementCondition GetCondition(string achievementName, string conditionName)'
                    ](_achievement.Name, conditionName);
                    if (c !== null) c.Complete();
                }
                return true;
            }
        }
        return false;
    }
    
    static OnCompleted(achievement) {
        AchievementLoader.GetAchievement(achievement.Name).OnCompleted(achievement);
    }
    
    static OnEnterWorld(player) {
        for (const achievement of this.Achievements) {
            if (achievement.IsCompleted) continue;
            achievement.OnEnterWorld(player);
        }
    }
    
    static OnItemPickup(player, item, stack) {
        for (const achievement of this.Achievements) {
            if (achievement.IsCompleted) continue;
            achievement.OnItemPickup(player, item.type, stack);
        }
    }
    
    static OnItemCraft(type, stack) {
        for (const achievement of this.Achievements) {
            if (achievement.IsCompleted) continue;
            achievement.OnItemCraft(type, stack);
        }
    }
    
    static OnNPCKilled(player, npcId) {
        for (const achievement of this.Achievements) {
            if (achievement.IsCompleted) continue;
            achievement.OnNPCKilled(player, npcId);
        }
    }
    
    static OnTileDestroyed(player, tileType) {
        for (const achievement of this.Achievements) {
            if (achievement.IsCompleted) continue;
            achievement.OnTileDestroyed(player, tileType);
        }
    }
}