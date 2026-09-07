import { Terraria } from './ModImports.js';
import { NPCLoader } from './Loaders/NPCLoader.js';
import { ModLocalization } from './ModLocalization.js';

const { ShopHelper } = Terraria.GameContent;

export const AffectionLevel = Object.freeze({
    Love: 100,
    Like: 50,
    Dislike: -50,
    Hate: -100
});

export class NPCHappiness {
    static AffectionLevelToPriceMultiplier = {
        [AffectionLevel.Hate]: ShopHelper.hateValue,
        [AffectionLevel.Dislike]: ShopHelper.dislikeValue,
        [AffectionLevel.Like]: ShopHelper.likeValue,
        [AffectionLevel.Love]: ShopHelper.loveValue
    };
    
    static Affections = new Map();
    
    constructor(type) {
        this.NpcType = type;
        this.affection = {
            NPCs: {},
            Biomes: {}
        }
        if (NPCHappiness.Affections.has(this.NpcType)) {
            NPCHappiness.Affections.delete(this.NpcType);
        }
        NPCHappiness.Affections.set(this.NpcType, this.affection);
    }
    
    SetNPCAffection(npcId, affectionLevel) {
        affectionLevel = Math.max(-100, Math.min(affectionLevel, 100));
        const self = NPCHappiness.Affections.get(this.NpcType);
        self.NPCs[npcId] = affectionLevel;
        return this;
    }
    
    SetBiomeAffection(biomeId, affectionLevel) {
        affectionLevel = Math.max(-100, Math.min(affectionLevel, 100));
        const self = NPCHappiness.Affections.get(this.NpcType);
        self.Biomes[biomeId] = affectionLevel;
        return this;
    }
    
    static Get(npcType) {
        if (NPCHappiness.Affections.has(npcType)) {
            return NPCHappiness.Affections.get(npcType);
        }
        return undefined;
    }
    
    static ModifyShopPrice(info, PrimaryPlayerBiome, shopHelper) {
        const { player, npc, nearbyNPCsByType } = info;
        if (!NPCLoader.isModType(npc.type)) return;
        if (!NPCHappiness.Affections.has(npc.type)) return;
        
        const affections = NPCHappiness.Affections.get(npc.type);
        
        const biomeAffection = affections.Biomes[PrimaryPlayerBiome] ?? 0;
        if (biomeAffection > 50) {
            NPCHappiness.LoveBiome(NPCHappiness.BiomeNameKey(PrimaryPlayerBiome), shopHelper);
        } else if (biomeAffection > 0) {
            NPCHappiness.LikeBiome(NPCHappiness.BiomeNameKey(PrimaryPlayerBiome), shopHelper);
        } else if (biomeAffection < 0 && biomeAffection > -100) {
            NPCHappiness.DislikeBiome(NPCHappiness.BiomeNameKey(PrimaryPlayerBiome), shopHelper);
        } else if (biomeAffection < 0) {
            NPCHappiness.HateBiome(NPCHappiness.BiomeNameKey(PrimaryPlayerBiome), shopHelper);
        }
        
        for (let i = 0; i < nearbyNPCsByType.length; i++) {
            if (!nearbyNPCsByType[i]) continue;
            const npcAffection = affections.NPCs[i] ?? 0;
            if (npcAffection > 50) {
                NPCHappiness.LoveNPC(i, shopHelper);
            } else if (npcAffection > 0) {
                NPCHappiness.LikeNPC(i, shopHelper);
            } else if (npcAffection < 0 && npcAffection > -100) {
                NPCHappiness.DislikeNPC(i, shopHelper);
            } else if (npcAffection < 0) {
                NPCHappiness.HateNPC(i, shopHelper);
            }
        }
    }
    
    static BiomeNameKey(biomeId) {
        switch (biomeId) {
            case 1:
                return 'NormalUnderground';
            case 2:
                return 'Snow';
            case 3:
                return 'Desert';
            case 4:
                return 'Jungle';
            case 5:
                return 'Ocean';
            case 6:
                return 'Hallow';
            case 7:
                return 'Mushroom';
            case 8:
                return 'Dungeon';
            case 9:
                return 'Corruption';
            case 10:
                return 'Crimson';
            default:
                return 'Forest';
        }
    }
    
    static AddHappinessReportText(shopHelper, textKeyInCategory, substitutes = null) {
        let key = 'TownNPCMood.' + Terraria.ID.NPCID.Search.GetName(shopHelper._currentNPCBeingTalkedTo.netID) + '.' + textKeyInCategory;
        if (substitutes) {
            shopHelper._currentHappiness += ModLocalization.Translate(key).replace('{0}', substitutes) + ' ';
        } else {
            shopHelper._currentHappiness += ModLocalization.Translate(key) + ' ';
        }
    }
    
    // Biomes
    static LoveBiome(biomeNameKey, shopHelper) {
        NPCHappiness.AddHappinessReportText(shopHelper, 'LoveBiome', ShopHelper.BiomeNameByKey(biomeNameKey));
        shopHelper._currentPriceAdjustment *= 0.90;
    }
    
    static LikeBiome(biomeNameKey, shopHelper) {
        NPCHappiness.AddHappinessReportText(shopHelper, 'LikeBiome', ShopHelper.BiomeNameByKey(biomeNameKey));
        shopHelper._currentPriceAdjustment *= 0.95;
    }
    
    static DislikeBiome(biomeNameKey, shopHelper) {
        NPCHappiness.AddHappinessReportText(shopHelper, 'DislikeBiome', ShopHelper.BiomeNameByKey(biomeNameKey));
        shopHelper._currentPriceAdjustment *= 1.05;
    }
    
    static HateBiome(biomeNameKey, shopHelper) {
        NPCHappiness.AddHappinessReportText(shopHelper, 'HateBiome', ShopHelper.BiomeNameByKey(biomeNameKey));
        shopHelper._currentPriceAdjustment *= 1.10;
    }
    
    // NPCs
    static LoveNPC(npcId, shopHelper) {
        NPCHappiness.AddHappinessReportText(shopHelper, 'LoveNPC', Terraria.NPC.GetFullnameByID(npcId));
        shopHelper._currentPriceAdjustment *= 0.90;
    }
    
    static LikeNPC(npcId, shopHelper) {
        NPCHappiness.AddHappinessReportText(shopHelper, 'LikeNPC', Terraria.NPC.GetFullnameByID(npcId));
        shopHelper._currentPriceAdjustment *= 0.95;
    }
    
    static DislikeNPC(npcId, shopHelper) {
        NPCHappiness.AddHappinessReportText(shopHelper, 'DislikeNPC', Terraria.NPC.GetFullnameByID(npcId));
        shopHelper._currentPriceAdjustment *= 1.05;
    }
    
    static HateNPC(npcId, shopHelper) {
        NPCHappiness.AddHappinessReportText(shopHelper, 'HateNPC', Terraria.NPC.GetFullnameByID(npcId));
        shopHelper._currentPriceAdjustment *= 1.10;
    }
}