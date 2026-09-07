import { ModRecipe } from './ModRecipe.js';

// Recipe overflow compatibility adapted from Gst378's Recipe Limit Fix implementation for TLPro.
// Crafting and the Guide use different native lists on mobile, so they must be
// extended independently after Terraria finishes its own recipe search.
const Main = new NativeClass('Terraria', 'Main');
const Recipe = new NativeClass('Terraria', 'Recipe');
const WorldGen = new NativeClass('Terraria', 'WorldGen');
const GUIInstance = new NativeClass('', 'GUIInstance');
const GUICraftGuidePopup = new NativeClass('', 'GUICraftGuidePopup');

let cachedSourceLength = -1;
let cachedRecipeLength = -1;
let cachedEntries = [];
let cachedOverflowEntries = [];
let cachedIndexSet = new Set();
let loggedCrafting = false;
let loggedGuide = false;

function log(message) {
    try { tl.log(`[CalamityPort RecipeCore] ${message}`); } catch (_) {}
}

function lengthOf(collection) {
    if (!collection) return 0;
    try {
        const value = Number(collection.Length);
        if (Number.isFinite(value) && value >= 0) return Math.trunc(value);
    } catch (_) {}
    try {
        const value = Number(collection.length);
        if (Number.isFinite(value) && value >= 0) return Math.trunc(value);
    } catch (_) {}
    try {
        const value = Number(collection.Count);
        if (Number.isFinite(value) && value >= 0) return Math.trunc(value);
    } catch (_) {}
    return 0;
}

function getAt(collection, index) {
    if (!collection || index < 0) return null;
    // Gst378's working TLPro implementation uses this native-array access order. SetValue/GetValue
    // address the backing System.Array that Terraria's mobile UI actually reads.
    try {
        const value = collection['Object GetValue(int index)'](index);
        if (value !== undefined && value !== null) return value;
    } catch (_) {}
    try {
        const value = collection.get_Item(index);
        if (value !== undefined && value !== null) return value;
    } catch (_) {}
    try {
        const value = collection[index];
        if (value !== undefined && value !== null) return value;
    } catch (_) {}
    return null;
}

function setAt(collection, index, value) {
    if (!collection || index < 0) return false;
    try {
        collection['void SetValue(Object value, int index)'](value, index);
        return true;
    } catch (_) {}
    try {
        collection.set_Item(index, value);
        return true;
    } catch (_) {}
    try {
        collection[index] = value;
        return true;
    } catch (_) {}
    return false;
}

function itemType(item) {
    try {
        const value = Number(item?.type);
        return Number.isFinite(value) ? Math.trunc(value) : 0;
    } catch (_) {
        return 0;
    }
}

function itemStack(item) {
    try {
        const value = Number(item?.stack);
        return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    } catch (_) {
        return 0;
    }
}

function ensureCapacity(owner, property, required) {
    if (required <= 0) return null;
    let array = null;
    try { array = owner[property]; } catch (_) { return null; }
    if (!array) return null;
    if (lengthOf(array) >= required) return array;
    try {
        const resized = array.cloneResized(required);
        owner[property] = resized;
        return resized;
    } catch (_) {
        return array;
    }
}

function readRecipeIngredients(recipe) {
    const result = [];
    if (!recipe) return result;
    let required = null;
    try { required = recipe.requiredItem; } catch (_) { return result; }
    const limit = Math.min(Math.max(lengthOf(required), 14), 32);
    for (let i = 0; i < limit; i++) {
        const ingredient = getAt(required, i);
        const type = itemType(ingredient);
        const stack = itemStack(ingredient);
        if (type <= 0 || stack <= 0) continue;
        result.push({ type, stack, alternatives: [type] });
    }
    return result;
}

function readRecipeTile(recipe) {
    if (!recipe) return -1;
    let tiles = null;
    try { tiles = recipe.requiredTile; } catch (_) { return -1; }
    const limit = Math.min(lengthOf(tiles), 32);
    for (let i = 0; i < limit; i++) {
        const raw = Number(getAt(tiles, i));
        if (!Number.isFinite(raw)) continue;
        const tile = Math.trunc(raw);
        if (tile >= 0) return tile;
    }
    return -1;
}

function normalizeIngredient(value) {
    const type = Math.trunc(Number(value?.type) || 0);
    const stack = Math.max(1, Math.trunc(Number(value?.stack) || 1));
    let alternatives = [];
    if (Array.isArray(value?.alternatives)) {
        for (const raw of value.alternatives) {
            const id = Math.trunc(Number(raw) || 0);
            if (id > 0 && !alternatives.includes(id)) alternatives.push(id);
        }
    }
    if (type > 0 && !alternatives.includes(type)) alternatives.unshift(type);
    return { type, stack, alternatives };
}

function metadataFor(index, recipe) {
    let meta = null;
    try { meta = globalThis.__CalamityRecipeMeta?.[index] || null; } catch (_) {}

    const ingredients = Array.isArray(meta?.ingredients)
        ? meta.ingredients.map(normalizeIngredient).filter(v => v.type > 0)
        : readRecipeIngredients(recipe);

    let tileId = Number(meta?.tileId);
    if (!Number.isFinite(tileId)) tileId = readRecipeTile(recipe);
    tileId = Math.trunc(tileId);

    return { ingredients, tileId };
}

function rebuildEntriesIfNeeded(force = false) {
    const source = globalThis.__CalamityRecipeIndices;
    const recipes = Main.recipe;
    const recipeLength = lengthOf(recipes);

    if (!Array.isArray(source) || source.length === 0) {
        cachedSourceLength = 0;
        cachedRecipeLength = recipeLength;
        cachedEntries = [];
        cachedOverflowEntries = [];
        cachedIndexSet = new Set();
        return;
    }

    if (!force && source.length === cachedSourceLength && recipeLength === cachedRecipeLength) return;

    const unique = new Set();
    const result = [];
    for (let i = 0; i < source.length; i++) {
        const index = Math.trunc(Number(source[i]));
        if (!Number.isFinite(index) || index < 0 || index >= recipeLength || unique.has(index)) continue;
        const recipe = getAt(recipes, index);
        if (!recipe || itemType(recipe.createItem) <= 0) continue;
        unique.add(index);
        const meta = metadataFor(index, recipe);
        result.push({ index, recipe, ingredients: meta.ingredients, tileId: meta.tileId });
    }

    cachedSourceLength = source.length;
    cachedRecipeLength = recipeLength;
    cachedEntries = result;
    cachedIndexSet = unique;

    const maxRecipes = Math.max(0, Math.trunc(Number(Recipe.maxRecipes) || 0));
    cachedOverflowEntries = result.filter(entry => entry.index >= maxRecipes);

    log(`catalog rebuilt; tracked=${result.length}; overflow=${cachedOverflowEntries.length}; numRecipes=${Number(Recipe.numRecipes) || 0}; maxRecipes=${maxRecipes}; array=${recipeLength}.`);
}

function collectIndices(collection, count) {
    const result = new Set();
    const limit = Math.min(Math.max(0, count), lengthOf(collection));
    for (let i = 0; i < limit; i++) {
        const value = Number(getAt(collection, i));
        if (Number.isFinite(value) && value >= 0) result.add(Math.trunc(value));
    }
    return result;
}

function buildInventoryCounts(player) {
    const counts = new Map();
    if (!player) return counts;

    const addCollection = collection => {
        const count = lengthOf(collection);
        for (let i = 0; i < count; i++) {
            const item = getAt(collection, i);
            const type = itemType(item);
            const stack = itemStack(item);
            if (type <= 0 || stack <= 0) continue;
            counts.set(type, (counts.get(type) || 0) + stack);
        }
    };

    try { addCollection(player.inventory); } catch (_) {}

    try {
        const mouse = Main.mouseItem;
        const type = itemType(mouse);
        const stack = itemStack(mouse);
        if (type > 0 && stack > 0) counts.set(type, (counts.get(type) || 0) + stack);
    } catch (_) {}

    // Keep chest ingredients compatible with normal Terraria crafting.
    try {
        const chestIndex = Math.trunc(Number(player.chest) || -1);
        if (chestIndex >= 0) {
            const chest = getAt(Main.chest, chestIndex);
            if (chest) addCollection(chest.item);
        }
    } catch (_) {}

    return counts;
}

function hasIngredients(entry, sourceCounts) {
    const counts = new Map(sourceCounts);
    const requirements = entry.ingredients;
    for (let i = 0; i < requirements.length; i++) {
        const req = requirements[i];
        let remaining = Math.max(1, req.stack);
        const alternatives = Array.isArray(req.alternatives) && req.alternatives.length > 0 ? req.alternatives : [req.type];

        // Exact/canonical ingredient first, then group alternatives.
        const ordered = [req.type, ...alternatives.filter(v => v !== req.type)];
        for (const type of ordered) {
            const available = counts.get(type) || 0;
            if (available <= 0) continue;
            const take = Math.min(available, remaining);
            counts.set(type, available - take);
            remaining -= take;
            if (remaining <= 0) break;
        }
        if (remaining > 0) return false;
    }
    return true;
}

function buildTileState(player, entries) {
    const state = new Map();
    if (!player) return state;
    let adj = null;
    try { adj = player.adjTile; } catch (_) {}
    if (!adj) return state;

    for (let i = 0; i < entries.length; i++) {
        const tile = entries[i].tileId;
        if (tile < 0 || state.has(tile)) continue;
        const value = getAt(adj, tile);
        state.set(tile, value === true || Number(value) !== 0);
    }
    return state;
}

function hasTile(entry, tileState) {
    return entry.tileId < 0 || tileState.get(entry.tileId) === true;
}

function meetsEnvironment(recipe, player) {
    if (!recipe || !player) return false;
    try {
        if (recipe.needMechdusa) return false;
        if (recipe.needWater && !(player.adjWaterSource === true)) return false;
        if (recipe.needLava && !(player.adjLava === true)) return false;
        if (recipe.needHoney && !(player.adjHoney === true)) return false;
        if (recipe.needSnowBiome && !(player.ZoneSnow === true)) return false;
        if (recipe.needGraveyardBiome && !(player.ZoneGraveyard === true)) return false;
        if (recipe.crimson && WorldGen.crimson !== true) return false;
        if (recipe.corruption && WorldGen.crimson === true) return false;
    } catch (_) {}
    return true;
}

function appendAvailableRecipe(recipeIndex, existing) {
    if (existing.has(recipeIndex)) return true;

    const count = Math.max(0, Math.trunc(Number(Main.numAvailableRecipes) || 0));
    const required = count + 2;
    const available = ensureCapacity(Main, 'availableRecipe', required);
    const availableY = ensureCapacity(Main, 'availableRecipeY', required);
    if (!available) return false;

    if (!setAt(available, count, recipeIndex)) return false;
    if (availableY) setAt(availableY, count, 0);
    Main.numAvailableRecipes = count + 1;
    existing.add(recipeIndex);
    return true;
}

function compactConditionalCraftingList() {
    rebuildEntriesIfNeeded(false);
    if (cachedIndexSet.size === 0) return 0;

    const available = Main.availableRecipe;
    const count = Math.max(0, Math.trunc(Number(Main.numAvailableRecipes) || 0));
    let write = 0;
    let removed = 0;
    for (let read = 0; read < count; read++) {
        const index = Math.trunc(Number(getAt(available, read)) || -1);
        if (index < 0) continue;
        if (cachedIndexSet.has(index) && !ModRecipe.MeetsConditions(index)) {
            removed++;
            continue;
        }
        if (write !== read) setAt(available, write, index);
        write++;
    }
    if (removed > 0) Main.numAvailableRecipes = write;
    return removed;
}

function extendOverflowCrafting(canDelayCheck) {
    rebuildEntriesIfNeeded(false);
    const entries = cachedOverflowEntries;
    if (entries.length === 0) return 0;

    const player = Main.LocalPlayer;
    if (!player) return 0;

    const count = Math.max(0, Math.trunc(Number(Main.numAvailableRecipes) || 0));
    ensureCapacity(Main, 'availableRecipe', count + entries.length + 8);
    ensureCapacity(Main, 'availableRecipeY', count + entries.length + 8);

    const existing = collectIndices(Main.availableRecipe, count);
    const inventoryCounts = buildInventoryCounts(player);
    const tileState = buildTileState(player, entries);
    let added = 0;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (existing.has(entry.index)) continue;
        if (!ModRecipe.MeetsConditions(entry.index)) continue;
        if (!hasTile(entry, tileState)) continue;
        if (!meetsEnvironment(entry.recipe, player)) continue;
        if (!hasIngredients(entry, inventoryCounts)) continue;
        if (appendAvailableRecipe(entry.index, existing)) added++;
    }

    if (!loggedCrafting && added > 0) {
        loggedCrafting = true;
        log(`crafting overflow visible; added=${added}; delayed=${!!canDelayCheck}; available=${Number(Main.numAvailableRecipes) || 0}.`);
    }
    return added;
}

Recipe['void FindRecipes(bool canDelayCheck)'].hook((original, canDelayCheck) => {
    let oldRecipe = null;
    try {
        const focus = Math.max(0, Math.trunc(Number(Main.focusRecipe) || 0));
        oldRecipe = getAt(Main.availableRecipe, focus);
    } catch (_) {}

    original(canDelayCheck);
    const removed = compactConditionalCraftingList();
    const added = extendOverflowCrafting(canDelayCheck);

    if ((added > 0 || removed > 0) && oldRecipe !== null && oldRecipe !== undefined) {
        try { Recipe.TryRefocusingRecipe(oldRecipe); } catch (_) {}
    }
});

function recipeMatchesGuideItem(entry, type) {
    if (!entry || type <= 0) return false;
    const requirements = entry.ingredients;
    for (let i = 0; i < requirements.length; i++) {
        const req = requirements[i];
        if (req.type === type) return true;
        if (Array.isArray(req.alternatives) && req.alternatives.includes(type)) return true;
    }
    return false;
}

function compactGuideConditions(self) {
    rebuildEntriesIfNeeded(false);
    if (cachedIndexSet.size === 0) return 0;

    let count = Math.max(0, Math.trunc(Number(self.numAvailableGuideRecipes) || 0));
    const available = self.availableGuideRecipe;
    let write = 0;
    let removed = 0;
    for (let read = 0; read < count; read++) {
        const index = Math.trunc(Number(getAt(available, read)) || -1);
        if (index < 0) continue;
        if (cachedIndexSet.has(index) && !ModRecipe.MeetsConditions(index)) {
            removed++;
            continue;
        }
        if (write !== read) setAt(available, write, index);
        write++;
    }
    if (removed > 0) self.numAvailableGuideRecipes = write;
    return write;
}

GUICraftGuidePopup['void FindRecipes()'].hook((original, self) => {
    original(self);
    rebuildEntriesIfNeeded(false);

    // Unlike the old Calamity fallback, the Guide has its own availableGuideRecipe
    // array. Writing Main.availableRecipe cannot populate this popup.
    let type = 0;
    try { type = Math.trunc(Number(GUIInstance.Active?.GUICraftGuide?.guideItem?.type) || 0); } catch (_) {}
    if (type <= 0) return;

    let count = compactGuideConditions(self);
    let available = self.availableGuideRecipe;
    const existing = collectIndices(available, count);

    // Scan every tracked Calamity recipe here, not only overflow. Guide lookups are
    // user-driven and this guarantees that a valid mod recipe never disappears just
    // because its index happened to land on either side of Recipe.maxRecipes.
    const entries = cachedEntries;
    const required = count + entries.length + 8;
    if (!available || lengthOf(available) < required) {
        try {
            available = available?.cloneResized(required) || available;
            if (available) self.availableGuideRecipe = available;
        } catch (_) {}
    }
    if (!available) return;

    let added = 0;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (existing.has(entry.index)) continue;
        if (!ModRecipe.MeetsConditions(entry.index)) continue;
        if (!recipeMatchesGuideItem(entry, type)) continue;
        if (setAt(available, count, entry.index)) {
            existing.add(entry.index);
            count++;
            added++;
        }
    }

    self.numAvailableGuideRecipes = count;
    if (!loggedGuide && added > 0) {
        loggedGuide = true;
        log(`Guide list extended; material=${type}; added=${added}; total=${count}.`);
    }
});

export function RebuildCalamityRecipeCatalog() {
    cachedSourceLength = -1;
    cachedRecipeLength = -1;
    rebuildEntriesIfNeeded(true);
}
