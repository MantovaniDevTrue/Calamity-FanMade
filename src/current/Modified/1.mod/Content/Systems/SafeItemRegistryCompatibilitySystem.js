import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ItemLoader } from './../../TL/Loaders/ItemLoader.js';

const TARGET_ID = 6596;

function I(v, f = 0) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : f;
}

function Log(message) {
    try { tl.log(`[CalamityPort SafeItemRegistry] ${message}`); } catch (_) { }
}

function NativeLength(array) {
    if (!array) return 0;
    for (const key of ['Length', 'Count', 'length']) {
        try {
            const value = Number(array[key]);
            if (Number.isFinite(value) && value >= 0) return Math.floor(value);
        } catch (_) { }
    }
    return 0;
}

function NativeSet(array, index, value) {
    if (!array || index < 0) return false;
    try { array[index] = value; return true; } catch (_) { }
    try { array.set_Item(index, value); return true; } catch (_) { }
    return false;
}

function GrowArray(holder, property, minimumSize) {
    let array = null;
    try { array = holder?.[property]; } catch (_) { }
    if (!array) return null;
    const requested = Math.max(0, I(minimumSize));
    const current = NativeLength(array);
    if (current >= requested) return array;
    try {
        const resized = array.cloneResized(requested);
        holder[property] = resized;
        return resized;
    } catch (_) {
        return null;
    }
}

function SetArrayEntry(holder, property, index, value) {
    if (index < 0 || value == null) return false;
    let array = null;
    try { array = holder?.[property]; } catch (_) { }
    if (!array) return false;
    if (NativeLength(array) <= index) array = GrowArray(holder, property, index + 1);
    return NativeSet(array, index, value);
}

function HasIntKey(dict, key) {
    if (!dict) return false;
    try { return dict.ContainsKey(I(key)) === true; } catch (_) { }
    try {
        const fn = dict['bool ContainsKey(int key)'];
        if (typeof fn === 'function') return fn.call(dict, I(key)) === true;
    } catch (_) { }
    return false;
}

function HasStringKey(dict, key) {
    if (!dict) return false;
    const text = String(key || '');
    try { return dict.ContainsKey(text) === true; } catch (_) { }
    try {
        const fn = dict['bool ContainsKey(string key)'];
        if (typeof fn === 'function') return fn.call(dict, text) === true;
    } catch (_) { }
    return false;
}

function Enumerate(sequence, mapper = value => value, limit = 20000) {
    const out = [];
    if (!sequence) return out;
    try {
        const values = Array.from(sequence);
        for (const value of values) {
            if (out.length >= limit) break;
            try { out.push(mapper(value)); } catch (_) { }
        }
        if (out.length > 0) return out;
    } catch (_) { }
    try {
        const enumerator = sequence.GetEnumerator();
        let guard = 0;
        while (enumerator && enumerator.MoveNext() === true && guard++ < limit) {
            try { out.push(mapper(enumerator.Current)); } catch (_) { }
        }
    } catch (_) { }
    return out;
}

function SearchContainsId(search, type) {
    if (!search || type < 0) return false;
    try { return search.ContainsId(type) === true; } catch (_) { return false; }
}

function SearchContainsName(search, name) {
    if (!search || !name) return false;
    try { return search.ContainsName(String(name)) === true; } catch (_) { return false; }
}

function SearchGetName(search, type) {
    if (!SearchContainsId(search, type)) return '';
    try { return String(search.GetName(type) || '').trim(); } catch (_) { return ''; }
}

function SearchGetId(search, name) {
    if (!SearchContainsName(search, name)) return -1;
    try { return I(search.GetId(String(name)), -1); } catch (_) { return -1; }
}

function SearchAdd(search, desiredName, type) {
    if (!search || type < 0) return '';
    if (SearchContainsId(search, type)) return SearchGetName(search, type);
    const root = String(desiredName || `TLProCompatItem${type}`).replace(/[^A-Za-z0-9_]/g, '') || `TLProCompatItem${type}`;
    let name = root;
    let suffix = 1;
    while (SearchContainsName(search, name) && suffix < 1000) name = `${root}_${suffix++}`;
    try {
        search.Add(name, type);
        return SearchContainsId(search, type) ? name : '';
    } catch (_) {
        return '';
    }
}

function CreateFallbackSample(type) {
    try {
        const item = Terraria.Item.new();
        item['void .ctor()']();
        try { item.type = type; } catch (_) { }
        try { item.netID = type; } catch (_) { }
        try { item.stack = 1; } catch (_) { }
        return item;
    } catch (_) { return null; }
}

function AddIntKey(dict, key, value) {
    if (!dict || HasIntKey(dict, key)) return false;
    try { dict.Add(I(key), value); return true; } catch (_) { return false; }
}

function AddStringKey(dict, key, value) {
    if (!dict || HasStringKey(dict, key)) return false;
    try { dict.Add(String(key), value); return true; } catch (_) { return false; }
}

function MaxOwnItemType() {
    let max = Math.max(0, I(Terraria.ID.ItemID.Count) - 1);
    try {
        for (const item of ItemLoader.Items) max = Math.max(max, I(item?.Type, -1));
    } catch (_) { }
    return max;
}

function CandidateTypes(search, samples, minimumType) {
    const set = new Set();

    // ContentSamples is the safest source of real numeric item IDs. Enumerating Keys never
    // indexes the dictionary with a guessed number, so gaps cannot produce KeyNotFound spam.
    let sampleKeys = [];
    try { sampleKeys = Enumerate(samples?.Keys, value => I(value, -1)); } catch (_) { }
    for (const type of sampleKeys) if (type >= minimumType) set.add(type);

    // IdDictionary.Names can contain aliases and is not an ID range. Resolve only names that
    // are actually present; never infer IDs from Names.Count and never call GetName on guesses.
    let names = [];
    try { names = Enumerate(search?.Names, value => String(value || '')); } catch (_) { }
    for (const name of names) {
        if (!name) continue;
        const type = SearchGetId(search, name);
        if (type >= minimumType) set.add(type);
    }

    return Array.from(set).sort((a, b) => a - b);
}

export class SafeItemRegistryCompatibilitySystem extends ModSystem {
    constructor() {
        super();
        this.Done = false;
    }

    OnWorldLoad() {
        if (this.Done) return;
        this.Done = true;
        // Phase 13.03.6+ no longer needs a global dictionary sweep. Enumerating native Keys/Names
        // makes TLPro reflect whole KeyCollection types and adds visible world-entry stalls.
        // Keep Repair() below only as an explicit diagnostic tool; never run it automatically.
        Log('automatic registry sweep disabled; no native dictionary enumeration on world load.');
    }

    OnWorldUnload() {
        this.Done = false;
    }

    Repair() {
        const search = Terraria.ID.ItemID.Search;
        const samples = Terraria.ID.ContentSamples?.ItemsByType;
        const persistentByNet = Terraria.ID.ContentSamples?.ItemPersistentIdsByNetIds;
        const netByPersistent = Terraria.ID.ContentSamples?.ItemNetIdsByPersistentIds;
        if (!search || !samples) {
            Log('skipped; ItemID.Search or ContentSamples.ItemsByType unavailable.');
            return;
        }

        const lastOwn = MaxOwnItemType();
        const candidates = CandidateTypes(search, samples, Math.max(I(Terraria.ID.ItemID.Count), lastOwn + 1));
        let repairedSearch = 0, repairedSamples = 0, repairedPersistent = 0, repairedCaches = 0;
        const changed = [];

        for (const type of candidates) {
            const sampleExists = HasIntKey(samples, type);
            let searchExists = SearchContainsId(search, type);
            let name = searchExists ? SearchGetName(search, type) : '';

            if (!searchExists && sampleExists) {
                name = SearchAdd(search, `TLProCompatItem${type}`, type);
                searchExists = !!name;
                if (searchExists) {
                    repairedSearch++;
                    changed.push(`${type}:search`);
                }
            }

            if (searchExists && !sampleExists) {
                const sample = CreateFallbackSample(type);
                if (sample && AddIntKey(samples, type, sample)) {
                    repairedSamples++;
                    changed.push(`${type}:sample`);
                    // Try the normal pipeline only after the missing dictionary entry exists.
                    try { sample['void SetDefaults(int Type, ItemVariant variant)'](type, null); } catch (_) { }
                }
            }

            if (!name && SearchContainsId(search, type)) name = SearchGetName(search, type);
            if (!name) name = `TLProCompatItem${type}`;

            if (AddIntKey(persistentByNet, type, name)) repairedPersistent++;
            if (AddStringKey(netByPersistent, name, type)) repairedPersistent++;

            // Cross-mod loaders frequently forget to grow Lang caches. Grow only, then fill a
            // missing tail slot with a harmless LocalizedText; never shrink/replace valid data.
            const nameCache = GrowArray(Terraria.Lang, '_itemNameCache', type + 1);
            GrowArray(Terraria.Lang, '_itemTooltipCache', type + 1);
            if (nameCache) {
                let current = null;
                try { current = nameCache.get_Item(type); } catch (_) {
                    try { current = nameCache[type]; } catch (_) { }
                }
                let hasText = false;
                try { hasText = !!String(current?.Value || '').trim(); } catch (_) { }
                if (!hasText) {
                    let localized = null;
                    try { localized = Terraria.Localization.Language.GetText(name); } catch (_) { }
                    if (localized && SetArrayEntry(Terraria.Lang, '_itemNameCache', type, localized)) repairedCaches++;
                }
            }
            try {
                const tooltipCache = Terraria.Lang._itemTooltipCache;
                if (tooltipCache && NativeLength(tooltipCache) > type) {
                    let tooltip = null;
                    try { tooltip = tooltipCache.get_Item(type); } catch (_) { }
                    if (!tooltip) SetArrayEntry(Terraria.Lang, '_itemTooltipCache', type, Terraria.UI.ItemTooltip.None);
                }
            } catch (_) { }
        }

        // A targeted probe for the historically failing numeric key uses only Contains* APIs;
        // it never indexes a missing dictionary, so this diagnostic cannot recreate the spam.
        const targetSearch = SearchContainsId(search, TARGET_ID);
        const targetSample = HasIntKey(samples, TARGET_ID);
        const targetPersistent = HasIntKey(persistentByNet, TARGET_ID);
        const targetName = targetSearch ? SearchGetName(search, TARGET_ID) : '<missing>';
        Log(`lastOwn=${lastOwn}; candidates=${candidates.length}; repairedSearch=${repairedSearch}; repairedSamples=${repairedSamples}; repairedPersistent=${repairedPersistent}; repairedCaches=${repairedCaches}; changed=${changed.slice(0, 24).join(',') || 'none'}; target${TARGET_ID}=search:${targetSearch},sample:${targetSample},persistent:${targetPersistent},name:${targetName}; nameCache=${NativeLength(Terraria.Lang._itemNameCache)}.`);
    }
}
