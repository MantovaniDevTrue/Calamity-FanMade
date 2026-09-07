import { Terraria } from './ModImports.js';
import { ItemLoader } from './Loaders/ItemLoader.js';

const maxRequirements = 14;

function nativeLength(array) {
    if (!array) return 0;
    try {
        const value = Number(array.Length);
        if (Number.isFinite(value) && value >= 0) return Math.trunc(value);
    } catch (_) {}
    try {
        const value = Number(array.Count);
        if (Number.isFinite(value) && value >= 0) return Math.trunc(value);
    } catch (_) {}
    try {
        const value = Number(array.length);
        if (Number.isFinite(value) && value >= 0) return Math.trunc(value);
    } catch (_) {}
    try { return Array.from(array).length; } catch (_) {}
    return 0;
}

function ensureCapacity(owner, property, size) {
    let array = null;
    try { array = owner[property]; } catch (_) { return null; }
    if (!array) return null;
    if (nativeLength(array) >= size) return array;
    try {
        const resized = array.cloneResized(size);
        owner[property] = resized;
        return resized;
    } catch (_) {
        return array;
    }
}

function markMaterial(type) {
    const id = Math.trunc(Number(type) || 0);
    if (id <= 0) return;
    if (ItemLoader.isModType(id)) {
        try { ItemLoader.getModItem(id).Item.material = true; } catch (_) {}
        return;
    }
    try { Terraria.ID.ItemID.Sets.IsAMaterial[id] = true; } catch (_) {}
}

function normalizeAlternatives(values, fallback = 0) {
    const result = [];
    if (Array.isArray(values)) {
        for (const raw of values) {
            const id = Math.trunc(Number(raw) || 0);
            if (id > 0 && !result.includes(id)) result.push(id);
        }
    }
    const f = Math.trunc(Number(fallback) || 0);
    if (f > 0 && !result.includes(f)) result.unshift(f);
    return result;
}

export class ModRecipe {
    static MAX_RECIPES = 3600;
    static MAX_VANILLA_RECIPES = 3570;

    constructor() {
        this.numIngredients = 0;
        this.craftingStation = -1;
        this.customShimmerResults = [];
        this.conditions = [];
        this.ingredients = [];
    }

    SetResult(itemId, stack = 1) {
        Terraria.Recipe.currentRecipe.createItem['void SetDefaults(int Type, ItemVariant variant)'](itemId, null);
        Terraria.Recipe.currentRecipe.createItem.stack = Math.max(1, Math.min(stack, Terraria.Recipe.currentRecipe.createItem?.maxStack ?? 9999));
        return this;
    }

    SetProperty(propertyName, value) {
        Terraria.Recipe.currentRecipe[propertyName] = value;
        return this;
    }

    AddCustomShimmerResult(type, stack = 1) {
        if (type > 0) this.customShimmerResults.push(Terraria.Recipe.currentRecipe['Item AddCustomShimmerResult(int itemType, int itemStack)'](type, stack));
        return this;
    }

    AddIngredient(itemId, stack = 1) {
        if (this.numIngredients >= maxRequirements) return this;

        const type = Math.trunc(Number(itemId) || 0);
        if (type <= 0) return this;
        markMaterial(type);

        const item = Terraria.Recipe.currentRecipe.requiredItem[this.numIngredients];
        item['void SetDefaults(int Type, ItemVariant variant)'](type, null);
        item.stack = Math.max(1, Math.min(stack, item?.maxStack ?? 9999));

        const amount = Math.max(1, Math.trunc(Number(item.stack) || 1));
        this.ingredients.push({ type, stack: amount, alternatives: [type] });
        this.numIngredients++;
        return this;
    }

    AddRecipeGroup(groupOrName, stack = 1) {
        const groupName = typeof groupOrName === 'string' ? String(groupOrName) : '';
        if (groupName) groupOrName = ModRecipe.GetGroupByName(groupName);
        if (!groupOrName) {
            try { tl.log('[CalamityPort Recipe] recipe group was not found.'); } catch (_) {}
            return this;
        }

        const knownItems = ModRecipe.GetKnownGroupItems(groupOrName, groupName);
        const beforeGroups = ModRecipe.AcceptedGroupIds(Terraria.Recipe.currentRecipe);
        const before = [];
        for (let i = 0; i < maxRequirements; i++) {
            try { before[i] = Math.trunc(Number(Terraria.Recipe.currentRecipe.requiredItem[i]?.type) || 0); }
            catch (_) { before[i] = 0; }
        }

        try { Terraria.Recipe.currentRecipe['void RequireGroup(RecipeGroup group)'](groupOrName); }
        catch (e) {
            try { tl.log(`[CalamityPort Recipe] RequireGroup failed: ${e}`); } catch (_) {}
            return this;
        }

        const afterGroups = ModRecipe.AcceptedGroupIds(Terraria.Recipe.currentRecipe);
        for (const id of afterGroups) {
            if (!beforeGroups.includes(id) && knownItems.length > 0)
                ModRecipe.GroupItemsById.set(id, knownItems.slice());
        }

        let groupSlot = -1;
        let highestUsed = -1;
        for (let i = 0; i < maxRequirements; i++) {
            let type = 0;
            try { type = Math.trunc(Number(Terraria.Recipe.currentRecipe.requiredItem[i]?.type) || 0); } catch (_) {}
            if (type > 0) highestUsed = i;
            if (groupSlot < 0 && before[i] <= 0 && type > 0) groupSlot = i;
        }

        const amount = Math.max(1, Math.trunc(Number(stack) || 1));
        let canonical = 0;

        if (groupSlot >= 0) {
            try {
                const item = Terraria.Recipe.currentRecipe.requiredItem[groupSlot];
                item.stack = Math.max(1, Math.min(amount, item?.maxStack ?? 9999));
                canonical = Math.trunc(Number(item?.type) || 0);
                if (canonical > 0) markMaterial(canonical);
            } catch (_) {}
            highestUsed = Math.max(highestUsed, groupSlot);
            this.numIngredients = Math.max(this.numIngredients, highestUsed + 1);
        } else {
            canonical = Math.trunc(Number(knownItems[0]) || 0);
            if (canonical > 0 && this.numIngredients < maxRequirements) {
                const slot = Math.max(this.numIngredients, highestUsed + 1);
                if (slot < maxRequirements) {
                    try {
                        const item = Terraria.Recipe.currentRecipe.requiredItem[slot];
                        item['void SetDefaults(int Type, ItemVariant variant)'](canonical, null);
                        item.stack = Math.max(1, Math.min(amount, item?.maxStack ?? 9999));
                        this.numIngredients = slot + 1;
                        markMaterial(canonical);
                    } catch (_) {}
                }
            }
        }

        const alternatives = normalizeAlternatives(knownItems, canonical);
        if (canonical > 0) this.ingredients.push({ type: canonical, stack: amount, alternatives });
        return this;
    }

    AddCondition(predicate) {
        if (typeof predicate === 'function') this.conditions.push(predicate);
        return this;
    }

    AddTile(tileId) {
        if (this.craftingStation !== -1) return this;
        Terraria.Recipe.currentRecipe['void SetCraftingStation(int tileType)'](tileId);
        this.craftingStation = Math.trunc(Number(tileId) || -1);
        return this;
    }

    Register() {
        // Keep the recipe registration path compatible with Gst378's Recipe Limit Fix behavior on TLPro.
        // Recipe.numRecipes is the real destination; Main.recipe.length can be larger because
        // other mods resize the backing arrays and would otherwise create empty gaps.
        const index = Math.max(0, Math.trunc(Number(Terraria.Recipe.numRecipes) || 0));
        const requiredSize = index + 1;

        const recipes = ensureCapacity(Terraria.Main, 'recipe', requiredSize);
        ensureCapacity(Terraria.Main, 'availableRecipe', requiredSize);
        ensureCapacity(Terraria.Main, 'availableRecipeY', requiredSize);

        let nativeLimit = 0;
        try { nativeLimit = Math.max(0, Math.trunc(Number(Terraria.Recipe.maxRecipes) || 0)); } catch (_) {}
        if (nativeLimit <= 0) nativeLimit = ModRecipe.MAX_RECIPES;

        // AddRecipe stops reliably placing the Recipe object once the native recipe window is
        // crossed on TLPro. Put currentRecipe in the real backing array first, then let Terraria
        // finish the normal AddRecipe path and increment numRecipes.
        if (index >= nativeLimit && recipes) {
            let written = false;
            try { recipes.set_Item(index, Terraria.Recipe.currentRecipe); written = true; } catch (_) {}
            if (!written) {
                try { recipes['void SetValue(Object value, int index)'](Terraria.Recipe.currentRecipe, index); written = true; } catch (_) {}
            }
            if (!written) {
                try { recipes[index] = Terraria.Recipe.currentRecipe; } catch (_) {}
            }
        }

        if (this.conditions.length > 0) ModRecipe.RecipeConditions.set(index, this.conditions.slice());
        else ModRecipe.RecipeConditions.delete(index);

        Terraria.Recipe.AddRecipe();

        try {
            if (!Array.isArray(globalThis.__CalamityRecipeIndices)) globalThis.__CalamityRecipeIndices = [];
            if (!globalThis.__CalamityRecipeIndices.includes(index)) globalThis.__CalamityRecipeIndices.push(index);

            if (!globalThis.__CalamityRecipeMeta || typeof globalThis.__CalamityRecipeMeta !== 'object')
                globalThis.__CalamityRecipeMeta = {};

            globalThis.__CalamityRecipeMeta[index] = {
                ingredients: this.ingredients.map(v => ({
                    type: Math.trunc(Number(v.type) || 0),
                    stack: Math.max(1, Math.trunc(Number(v.stack) || 1)),
                    alternatives: normalizeAlternatives(v.alternatives, v.type)
                })),
                tileId: Number.isFinite(Number(this.craftingStation)) ? Math.trunc(Number(this.craftingStation)) : -1
            };
        } catch (_) {}

        try {
            const current = Number(globalThis.__MagicStorageLiteRecipeCatalogRevision || 0);
            globalThis.__MagicStorageLiteRecipeCatalogRevision = current + 1;
        } catch (_) {}
        return this;
    }

    static RecipeConditions = new Map();
    static GroupItemsByObject = new WeakMap();
    static GroupItemsById = new Map();
    static NamedGroupItems = new Map([
        ['IronBar', [22, 704]]
    ]);

    static AcceptedGroupIds(recipe) {
        const ids = [];
        try {
            const groups = recipe?.acceptedGroups;
            if (!groups) return ids;
            let count = 0;
            try { count = Number(groups.Count); } catch (_) {}
            if (!(count >= 0)) try { count = Number(groups.Length); } catch (_) {}
            if (!(count >= 0)) try { count = Number(groups.length); } catch (_) {}
            count = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
            for (let i = 0; i < count; i++) {
                let id = -1;
                try { id = Number(groups.get_Item(i)); } catch (_) {
                    try { id = Number(groups[i]); } catch (_) {}
                }
                if (Number.isFinite(id) && id >= 0 && !ids.includes(Math.floor(id))) ids.push(Math.floor(id));
            }
        } catch (_) {}
        return ids;
    }

    static GetKnownGroupItems(group, name = '') {
        if (name && this.NamedGroupItems.has(name)) return this.NamedGroupItems.get(name).slice();
        try {
            const items = this.GroupItemsByObject.get(group);
            if (items) return items.slice();
        } catch (_) {}
        return [];
    }

    static GetRecipeGroupItems(groupId) {
        const id = Math.floor(Number(groupId));
        if (!Number.isFinite(id) || id < 0) return null;
        const items = this.GroupItemsById.get(id);
        return items ? items.slice() : null;
    }

    static MeetsConditions(recipeIndex) {
        const conditions = this.RecipeConditions.get(Number(recipeIndex));
        if (!conditions || conditions.length === 0) return true;
        for (const condition of conditions) {
            try { if (!condition()) return false; }
            catch (_) { return false; }
        }
        return true;
    }

    static NextSlot() {
        return Math.max(0, Math.trunc(Number(Terraria.Recipe.numRecipes) || 0));
    }

    static GetGroupByName(name) {
        return Terraria.ID.RecipeGroups[name];
    }

    static CreateRecipeGroup(name, itemTypes = []) {
        const group = Terraria.RecipeGroup.new();
        group['void .ctor(string groupDescriptorKey, int[] validItems)'](name, itemTypes.makeGeneric('int'));
        const normalized = normalizeAlternatives(itemTypes);
        for (const type of normalized) markMaterial(type);
        const registered = group.Register();
        try { ModRecipe.GroupItemsByObject.set(registered, normalized.slice()); } catch (_) {}
        return registered;
    }
}
