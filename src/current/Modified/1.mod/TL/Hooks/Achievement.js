import { Terraria } from './../ModImports.js';
import { AchievementLoader } from './../Loaders/AchievementLoader.js';

export class AchievementHooks {
    static initialized = false;
    
    static HookList = {
        All: (info) => info.hasAchievements,
        Draw: (info) => true,
        OnComplete: (info) => true,
        Load: (info) => true,
        NotifyTileDestroyed: (info) => true,
        NotifyNPCKilled: (info) => true
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.Draw(info)) {
            const GUIAchievementsMenu = new NativeClass('', 'GUIAchievementsMenu');
            GUIAchievementsMenu['void AchievementDraw(ItemGrid_Layout gridLayout, int index, Vector2 position, float scale)'
            ].hook((original, self, layout, index, position, scale) => {
                const achievement = self.SortedAchievementsData.get_Item(index);
                let old = null;
                if (AchievementLoader.isModAchievement(achievement)) {
                    const _achievement = AchievementLoader.GetAchievement(achievement.Name);
                    if (!_achievement.Achievement.IsCompleted && _achievement.IsHidden) {
                        _achievement.Achievement.FriendlyName = AchievementLoader.HiddenText;
                        _achievement.Achievement.Description = AchievementLoader.HiddenText;
                    } else {
                        _achievement.Achievement.FriendlyName = _achievement.FriendlyName;
                        _achievement.Achievement.Description = _achievement.Description;
                    }
                    old = GUIAchievementsMenu.AchievementsIcons;
                    GUIAchievementsMenu.AchievementsIcons = _achievement._texture.Value;
                }
                original(self, layout, index, position, scale);
                if (old !== null) GUIAchievementsMenu.AchievementsIcons = old;
            });
        
            const InGamePopups = new NativeClass('Terraria.UI', 'InGamePopups');
            InGamePopups.AchievementUnlockedPopup['void .ctor(Achievement achievement)'
            ].hook((original, self, achievement) => {
                original(self, achievement);
                if (AchievementLoader.isModAchievement(achievement)) {
                    self._achievementTexture = AchievementLoader.GetAchievement(achievement.Name)._texture;
                    self._title = AchievementLoader.GetAchievement(achievement.Name).FriendlyName.Value;
                }
            });
        }
        
        if (this.HookList.OnComplete(info)) {
            Terraria.Achievements.Achievement['void OnConditionComplete(AchievementCondition condition)'
            ].hook((original, self, condition) => {
                original(self, condition);
                if (AchievementLoader.isModAchievement(self)) {
                    let completed = self._completedCount === self._conditions.Count;
                    if (completed) AchievementLoader.OnCompleted(self);
                }
            });
        }
        
        if (this.HookList.Load(info)) {
            AchievementLoader._loadHook = true;
            Terraria.Achievements.AchievementManager['void Load()'
            ].hook((original, self) => {
                if (AchievementLoader._isLoaded) original(self);
            });
        }
        
        if (this.HookList.NotifyTileDestroyed(info)) {
            Terraria.GameContent.Achievements.AchievementsHelper['void NotifyTileDestroyed(Player player, ushort tile)'
            ].hook((original, player, tileType) => {
                let flag = !(Terraria.Main.gameMenu || !Terraria.GameContent.Achievements.AchievementsHelper._isMining);
                original(player, tileType);
                if (flag) AchievementLoader.OnTileDestroyed(player, tileType);
            });
        }
        
        if (this.HookList.NotifyNPCKilled(info)) {
            Terraria.GameContent.Achievements.AchievementsHelper['void NotifyNPCKilledDirect(Player player, int npcNetID)'
            ].hook((original, player, npcId) => {
                original(player, npcId);
                AchievementLoader.OnNPCKilled(player, npcId);
            });
        }
        
        this.initialized = true;
    }
}