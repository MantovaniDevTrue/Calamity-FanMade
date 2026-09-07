import { Terraria } from './../ModImports.js';
import { ModLocalization } from './../ModLocalization.js';
import { TileLoader } from './../Loaders/TileLoader.js';
import { ItemLoader } from './../Loaders/ItemLoader.js';
import { BuffLoader } from './../Loaders/BuffLoader.js';
import { NPCLoader } from './../Loaders/NPCLoader.js';
import { ProjectileLoader } from './../Loaders/ProjectileLoader.js';

export class LangHooks {
    static initialized = false;
    
    // Here you can disable the hooks that won't be used in your mod to avoid unnecessary processing
    static HookList = {
        All: (info) => true,
        GetItemName: (info) => info.hasItems,
        GetItemTooltip: (info) => info.hasItems,
        GetBuffName: (info) => info.hasBuffs,
        GetBuffDescription: (info) => info.hasBuffs,
        GetProjectileName: (info) => info.hasProjectiles,
        GetNPCName: (info) => info.hasNPCs,
        AnglerQuestChat: (info) => info.hasItems,
        GetTextValue: (info) => info.hasNPCs
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.GetItemName(info)) {
            Terraria.Lang.GetItemName.hook((original, id) => {
                const type = Terraria.ID.ItemID.FromNetId(id);
                if (!ItemLoader.isModType(type)) {
                    return original(id);
                }
                return ModLocalization.getTranslationItemName(type);
            });
        }
        
        if (this.HookList.GetBuffName(info)) {
            Terraria.Lang.GetBuffName.hook((original, id) => {
                if (!BuffLoader.isModType(id)) {
                    return original(id);
                }
                return ModLocalization.getTranslationBuffName(id);
            });
        }
        
        if (this.HookList.GetBuffDescription(info)) {
            Terraria.Lang.GetBuffDescription.hook((original, id) => {
                if (!BuffLoader.isModType(id)) {
                    return original(id);
                }
                return ModLocalization.getTranslationBuffDescription(id);
            });
        }
        
        if (this.HookList.GetProjectileName(info)) {
            Terraria.Lang.GetProjectileName.hook((original, type) => {
                if (!ProjectileLoader.isModType(type)) {
                    return original(type);
                }
                return ModLocalization.getTranslationProjectileName(type);
            });
        }
        
        if (this.HookList.GetNPCName(info)) {
            Terraria.Lang.GetNPCName.hook((original, type) => {
                if (!NPCLoader.isModType(type)) {
                    return original(type);
                }
                return ModLocalization.getTranslationNPCName(type);
            });
            
            Terraria.Lang.GetNPCNameValue.hook((original, type) => {
                if (!NPCLoader.isModType(type)) {
                    return original(type);
                }
                return ModLocalization.Translate(`NPCName.${NPCLoader.getModNPC(type)?.constructor?.name ?? ''}`);
            });
        }
        
        if (this.HookList.AnglerQuestChat(info)) {
            Terraria.Lang.AnglerQuestChat.hook((original, turnIn) => {
                const questItemType = Terraria.Main.anglerQuestItemNetIDs[Terraria.Main.anglerQuest];
                if (ItemLoader.isModType(questItemType)) {
                    if (!turnIn && !Terraria.Main.anglerQuestFinished) {
                        Terraria.Main.npcChatCornerItem = questItemType;
                        return ModLocalization.getTranslationAnglerQuest(questItemType);
                    }
                }
                return original(turnIn);
            });
        }
        
        if (this.HookList.GetTextValue(info)) {
            Terraria.Localization.Language['string GetTextValue(string key)'
            ].hook((original, key) => {
                if (key === 'ArmorSetBonus.Empty') return '';
                if (key.startsWith('TownNPCMood_') && key.endsWith('.NoHome')) {
                    let text = ModLocalization.TryTranslate(key.replace('TownNPCMood_', 'TownNPCMood.'));
                    if (text.length > 0) return text;
                }
                return original(key);
            });
        }
        
        this.initialized = true;
    }
}