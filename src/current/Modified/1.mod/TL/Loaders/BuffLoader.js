import { Terraria, Microsoft } from './../ModImports.js';
import { ModLoader } from './../Core/ModLoader.js';
import { ModTexture } from './../ModTexture.js';
import { ModLocalization } from './../ModLocalization.js';

function cloneResizedSetLastItem(array, newSize, value) {
    const resized = array.cloneResized(newSize);
    if (value != null) resized[newSize - 1] = value;
    return resized;
}

function resizeArrayProperty(propertyHolder, propertyName, newSize, value) {
    propertyHolder[propertyName] = cloneResizedSetLastItem(propertyHolder[propertyName], newSize, value);
}

function addToArray(propertyHolder, propertyName, value) {
    const array = propertyHolder[propertyName];
    const arrayLength = array.length;
    propertyHolder[propertyName] = cloneResizedSetLastItem(array, arrayLength + 1, value);
}

export class BuffLoader {
    static Buffs = [];
    static MAX_VANILLA_ID = Terraria.ID.BuffID.Count;
    static Count = 0;
    static TypeOffset = 0;
    static ModTypes = new Set();
    static TypeToIndex = {};
    static BuffCount = this.MAX_VANILLA_ID + this.Count;
    static MenuCategories = {};
    static TL_Categories = tl.cheatMenu.getBuffCategories();
    
    static isModBuff(buff) { return this.isModType(buff.type); }
    static isModType(type) { return this.ModTypes.has(type); }
    static getByName(name) { return this.Buffs.find(t => t.constructor.name === name); }
    static getTypeByName(name) { return this.getByName(name)?.Type; }
    static getModBuff(type) {
        if (this.ModTypes.has(type)) {
            return this.Buffs[this.TypeToIndex[type]];
        }
        return undefined;
    }
    
    static LoadBuffs() {
        this.TypeOffset = ModLoader.ModData.BuffCount ?? 0;
        for (const buff of this.Buffs) {
            this.LoadBuff(buff);
        }
    }
    
    static LoadBuff(buff) {
        this.Count++;
        buff.Buff = {};
        const nextBuff = this.MAX_VANILLA_ID + this.Count + this.TypeOffset;
        buff.Type = buff.Buff.type = nextBuff - 1;
        this.ModTypes.add(buff.Type);
        this.TypeToIndex[buff.Type] = this.Buffs.indexOf(buff);
        
        // Sets
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'IsWellFed', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'SortingPriorityFoodBuffs', nextBuff, 0);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'IsFedState', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'IsAnNPCWhipDebuff', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'TimeLeftDoesNotDecrease', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'CanBeRemovedByNetMessage', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'IsAFlaskBuff', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'BuffTimeIsExtendedWithGameDifficulty', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'BuffTimeIsExtendedByDeadCellsPotionStationBuff', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'NurseCannotRemoveDebuff', nextBuff, false);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'AddBuffTimeAdditivelyToCap', nextBuff, 0);
        resizeArrayProperty(Terraria.ID.BuffID.Sets, 'MountType', nextBuff, -1);
        
        // Resize arrays
        resizeArrayProperty(Terraria.Main, 'pvpBuff', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'persistentBuff', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'vanityPet', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'lightPet', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'meleeBuff', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'debuff', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'buffNoSave', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'buffNoTimeDisplay', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'buffDoubleApply', nextBuff, false);
        resizeArrayProperty(Terraria.Main, 'buffAlpha', nextBuff, 0);
        
        addToArray(Terraria.Lang, '_buffNameCache', ModLocalization.empty());
        addToArray(Terraria.Lang, '_buffDescriptionCache', ModLocalization.empty());
        
        const buffTexture = new ModTexture('Textures/' + buff.Texture);
        if (buffTexture?.exists) {
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Buff', nextBuff, buffTexture.asset.asset);
        }
        
        buff.SetDefaults();
        buff.SetStaticDefaults();
        
        buff.MenuCategories.push('ModIcon');
        buff.MenuCategories.push('all');
        
        if (Terraria.Main.debuff[buff.Type]) {
            buff.MenuCategories.push('debuff');
        } else {
            buff.MenuCategories.push('buff');
        }
        if (Terraria.Main.meleeBuff[buff.Type]) buff.MenuCategories.push('weaponBuff');
        
        buff.PostStaticDefaults();
    }
    
    // Automatic creation and addition to TL menus
    static AddToMenu(buff) {
        if (buff.MenuCategories.length > 0) {
            buff.MenuCategories = [...new Set(buff.MenuCategories)];
            for (const category of buff.MenuCategories) {
                if (this.TL_Categories.includes(category)) tl.cheatMenu.addBuffToCategory(category, buff.Type);
                else {
                    if (!this.MenuCategories[category]) {
                        const texture = `Textures/Icons/${category}.png`;
                        if (tl.file.exists(texture)) {
                            this.MenuCategories[category] = tl.cheatMenu.addBuffCategory(category, texture);
                        }
                    }
                    if (this.MenuCategories[category]) tl.cheatMenu.addBuffToCategory(this.MenuCategories[category], buff.Type);
                }
            }
        }
    }
    
    static SetupContent() {
        this.LoadBuffs();
        for (const buff of this.Buffs) {
            buff.SetupContent();
        }
    }
    
    static PostSetupContent() {
        this.BuffCount = this.MAX_VANILLA_ID + ModLoader.ModData.BuffCount;
        this.MinBuffID = Math.min(...[...this.ModTypes]);
        this.MaxBuffID = Math.max(...[...this.ModTypes]);
        
        for (const buff of this.Buffs) {
            buff.PostSetupContent();
        }
    }
    
    static UpdatePlayer(player, buffIndex) {
        const type = player.buffType[buffIndex];
        if (this.isModType(type)) {
            this.getModBuff(type)?.UpdatePlayer(player, buffIndex);
        }
    }
    
    static UpdateNPC(npc, buffIndex) {
        const type = npc.buffType[buffIndex];
        if (this.isModType(type)) {
            this.getModBuff(type)?.UpdateNPC(npc, buffIndex);
        }
    }
    
    static ReApplyPlayer(player, buffTime, buffIndex) {
        const type = player.buffType[buffIndex];
        let result = true;
        if (this.isModType(type)) {
            result = this.getModBuff(type)?.ReApplyPlayer(player, buffTime, buffIndex) ?? true;
        }
        return result;
    }
    
    static ApplyPlayer(player, buffType, buffTime) {
        if (this.isModType(buffType)) {
            this.getModBuff(buffType)?.ApplyPlayer(player, buffTime);
        }
    }
    
    static ApplyNPC(npc, buffType, buffTime) {
        if (this.isModType(buffType)) {
            this.getModBuff(buffType)?.ApplyNPC(npc, buffTime);
        }
    }
    
    static ReApplyNPC(npc, buffTime, buffIndex) {
        const type = npc.buffType[buffIndex];
        let result = true;
        if (this.isModType(type)) {
            result = this.getModBuff(type)?.ReApplyNPC(npc, buffTime, buffIndex) ?? true;
        }
        return result;
    }
    
    static CanRemove(player, buffType, buffTime, buffIndex) {
        const debuff = Terraria.Main.debuff[buffType];
        let canRemove = !debuff;
        if (this.isModType(buffType)) {
            canRemove = this.getModBuff(buffType)?.CanRemove(player, buffTime, buffIndex, debuff) ?? canRemove;
        }
        return canRemove;
    }
    
    static OnRemove(player, type, buffTime, buffIndex) {
        if (this.isModType(type)) {
            this.getModBuff(type)?.OnRemove(player, buffTime, buffIndex);
        }
    }
}