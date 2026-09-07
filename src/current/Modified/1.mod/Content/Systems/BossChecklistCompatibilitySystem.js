import { ModSystem } from './../../TL/ModSystem.js';
import { ModNPC } from './../../TL/ModNPC.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModLocalization } from './../../TL/ModLocalization.js';
import { ModBridge } from './../../Core/ModBridge.js';

function I(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; }
function NPC(name) { try { return I(ModNPC.getTypeByName(name)); } catch (_) { return 0; } }
function Item(name) { try { return I(ModItem.getTypeByName(name)); } catch (_) { return 0; } }
function IDs(names, getter) { return names.map(getter).filter(v => v > 0); }
function Name(key, fallback) { try { return ModLocalization.Translate('BossChecklist.' + key, true, false) || fallback; } catch (_) { return fallback; } }

const MOD_ID = 'CalamityTLProPort';
const PROTOCOL = 'BossChecklist/1';
const PAYLOAD_KEY = 'BossChecklist';
const PROVIDERS_OWNER = 'BossChecklist';
const PROVIDERS_KEY = 'providers';

// Providers antigos usados antes do protocolo atual. Eles ficam persistidos na pasta do bridge,
// então eu removo da lista uma vez para não deixar o Boss Checklist importando payload velho.
const LegacyProviders = [
    MOD_ID + '.DesertScourge',
    MOD_ID + '.GiantClam',
    MOD_ID + '.Crabulon',
    MOD_ID + '.HiveMind',
    MOD_ID + '.Perforators',
    MOD_ID + '.SlimeGod'
];

const Entries = [
    {
        kind: 'boss', internalName: 'DesertScourgeHead', displayKey: 'DesertScourge', fallback: 'Desert Scourge', progression: 1.6,
        npcNames: ['DesertScourgeHead', 'DesertScourgeBody', 'DesertScourgeTail'],
        spawnNames: ['DesertMedallion'], lootNames: ['DesertScourgeBag', 'DesertScourgeTrophy', 'DesertScourgeRelic']
    },
    {
        kind: 'mini', internalName: 'GiantClam', displayKey: 'GiantClam', fallback: 'Giant Clam', progression: 1.61,
        npcNames: ['GiantClam'], spawnNames: [], lootNames: ['GiantClamTrophy', 'GiantClamRelic']
    },
    {
        kind: 'boss', internalName: 'Crabulon', displayKey: 'Crabulon', fallback: 'Crabulon', progression: 2.7,
        npcNames: ['Crabulon'], spawnNames: ['DecapoditaSprout'], lootNames: ['CrabulonBag', 'CrabulonTrophy', 'CrabulonRelic']
    },
    {
        kind: 'boss', internalName: 'HiveMind', displayKey: 'HiveMind', fallback: 'The Hive Mind', progression: 3.98,
        npcNames: ['HiveMind'], spawnNames: ['Teratoma'], lootNames: ['HiveMindBag', 'HiveMindTrophy', 'HiveMindRelic']
    },
    {
        kind: 'boss', internalName: 'PerforatorHive', displayKey: 'Perforators', fallback: 'The Perforators', progression: 3.99,
        npcNames: ['PerforatorHive', 'PerforatorHeadSmall', 'PerforatorHeadMedium', 'PerforatorHeadLarge'],
        spawnNames: ['BloodyWormFood'], lootNames: ['PerforatorBag', 'PerforatorTrophy', 'PerforatorsRelic']
    },
    {
        kind: 'boss', internalName: 'SlimeGodCore', displayKey: 'SlimeGod', fallback: 'The Slime God', progression: 6.7,
        npcNames: ['SlimeGodCore', 'CrimulanPaladin', 'EbonianPaladin', 'SplitCrimulanPaladin', 'SplitEbonianPaladin'],
        spawnNames: ['OverloadedSludge'], lootNames: ['SlimeGodBag', 'SlimeGodTrophy', 'SlimeGodRelic']
    }
];

function ReadProviders() {
    try {
        const value = ModBridge.get(PROVIDERS_OWNER, PROVIDERS_KEY, []);
        if (!Array.isArray(value)) return [];
        const clean = [];
        for (const valueEntry of value) {
            if (typeof valueEntry !== 'string' || valueEntry.length === 0) continue;
            if (LegacyProviders.includes(valueEntry)) continue;
            if (!clean.includes(valueEntry)) clean.push(valueEntry);
        }
        return clean;
    } catch (_) { return []; }
}

function CleanupLegacyProviders() {
    for (const provider of LegacyProviders) {
        try { ModBridge.clear(provider, 'BossChecklist/1'); } catch (_) { }
        try { ModBridge.clear(provider, PAYLOAD_KEY); } catch (_) { }
        try { ModBridge.revoke(provider); } catch (_) { }
    }
}

export class BossChecklistCompatibilitySystem extends ModSystem {
    constructor() {
        super();
        this.Published = false;
        this.LastSignature = '';
        this.LegacyCleaned = false;
    }

    PostSetupContent() { this.Publish('PostSetupContent'); }
    OnLocalizationsLoaded() { this.Publish('OnLocalizationsLoaded'); }
    OnWorldLoad() { this.Publish('OnWorldLoad', true); }

    Publish(stage, force = false) {
        const built = [];
        const signature = [];

        for (const entry of Entries) {
            const npcIds = IDs(entry.npcNames, NPC);
            if (npcIds.length === 0) continue;

            const spawnItems = IDs(entry.spawnNames, Item);
            const lootItems = IDs(entry.lootNames, Item);
            built.push({
                kind: entry.kind,
                internalName: entry.internalName,
                modSource: MOD_ID,
                npcIds,
                progression: entry.progression,
                displayName: Name(entry.displayKey, entry.fallback),
                spawnItems,
                lootItems
            });
            signature.push(entry.internalName + ':' + npcIds.join(',') + ':' + spawnItems.join(',') + ':' + lootItems.join(','));
        }

        if (built.length !== Entries.length) {
            if (force || !this.Published) {
                try { tl.log(`[CalamityPort ModBridge] ${stage}: IDs ready ${built.length}/${Entries.length}; waiting before publish.`); } catch (_) { }
            }
            return false;
        }

        const nextSignature = signature.join('|');
        if (!force && this.Published && this.LastSignature === nextSignature)
            return true;

        try {
            if (!this.LegacyCleaned) {
                CleanupLegacyProviders();
                this.LegacyCleaned = true;
            }

            const payload = {
                protocol: PROTOCOL,
                modId: MOD_ID,
                entries: built
            };

            // Protocolo atual do Boss Checklist: um provider por mod, payload em MOD_ID__BossChecklist.data.
            ModBridge.announce(MOD_ID);
            ModBridge.set(MOD_ID, PAYLOAD_KEY, payload);

            const providers = ReadProviders();
            if (!providers.includes(MOD_ID)) providers.push(MOD_ID);
            ModBridge.set(PROVIDERS_OWNER, PROVIDERS_KEY, providers);

            this.Published = true;
            this.LastSignature = nextSignature;

            let active = false;
            try { active = ModBridge.isActive('BossChecklist'); } catch (_) { }
            try {
                tl.log(`[CalamityPort ModBridge] ${stage}: protocol=${PROTOCOL}; provider=${MOD_ID}; entries=${built.length}; providers=${providers.length}; BossChecklistActive=${active}.`);
            } catch (_) { }
            return true;
        } catch (e) {
            try { tl.log(`[CalamityPort ModBridge] ${stage}: publish failed: ${e}`); } catch (_) { }
            return false;
        }
    }
}
