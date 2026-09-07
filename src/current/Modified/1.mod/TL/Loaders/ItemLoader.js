import { Terraria, Modules } from './../ModImports.js';
import { ModLoader } from './../Core/ModLoader.js';
import { ModTexture } from './../ModTexture.js';
import { ModLocalization } from './../ModLocalization.js';
import { ModItem } from './../ModItem.js';
import { GlobalItem } from './../GlobalItem.js';
import { TileLoader } from './TileLoader.js';

const { ArmorSetBonuses, ArmorSetBonus } = Terraria.DataStructures;
const { Vector2 } = Modules;

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

function setArrayValueCompat(holder, name, index, value) {
    try {
        const array = holder[name];
        const i = Number(index);
        if (!array || !Number.isFinite(i) || i < 0) return false;
        // TLPro exposes managed arrays slightly differently depending on build.
        // Prefer the native indexer/SetValue paths; plain JS [] assignment can
        // appear to succeed while never changing the underlying CLR array.
        try { array.set_Item(i, value); return true; } catch (e) { }
        try { array['void SetValue(Object value, int index)'](value, i); return true; } catch (e) { }
        try { array[i] = value; return array[i] === value; } catch (e) { }
    } catch (e) { }
    return false;
}

export class ItemLoader {
    static Items = [];
    static MAX_VANILLA_ID = Terraria.ID.ItemID.Count;
    static Count = 0;
    static TypeOffset = 0;
    static ModTypes = new Set();
    static IndexByName = {};
    static TypeToIndex = {};
    static HandlerCounts = Object.create(null);
    static ItemCount = this.MAX_VANILLA_ID + this.Count;
    
    static HasGlobalItems() {
        return GlobalItem.RegisteredItems.length > 0;
    }
    static MenuCategories = {};
    static TL_Categories = tl.cheatMenu.getItemCategories();
    // Cheat-menu membership must be idempotent. Re-registering hundreds of custom
    // item IDs (for example from PostSetupContent + diagnostics) can leave duplicate
    // entries in TLPro's search index and was one of the few Calamity-only changes
    // absent from the current Example Mod base.
    static MenuMembership = new Set();
    
    static isModItem(item) { return this.isModType(item.type); }
    static isModType(type) { return this.ModTypes.has(type); }
    static getByName(name) { return this.Items[this.IndexByName[name]]; }
    static getTypeByName(name) { return this.getByName(name)?.Type; }
    static getModItem(type) {
        const index = this.TypeToIndex[type];
        return index === undefined ? undefined : this.Items[index];
    }
    static register(item) {
        const next = ItemLoader.Items.length;
        ItemLoader.Items.push(item);
        this.IndexByName[item.constructor.name] = next;
        for (const method of Object.keys(item.__dispatch ?? {})) {
            this.HandlerCounts[method] = (this.HandlerCounts[method] ?? 0) + 1;
        }
    }
    static hasHandlers(name) { return (this.HandlerCounts[name] ?? 0) > 0; }
    static hasAnyHandlers(name) { return this.hasHandlers(name) || GlobalItem.hasHandlers(name); }
    
    static _NPCToBanner = {};
    static _BannerToNPC = {};
    static _BannerToItem = {};
    
    static ItemProperties = [
        'wornArmor',
        'tooltipContext',
        'tooltipSlot',
        'BestiaryNotes',
        'sentry',
        'DD2Summon',
        'shopSpecialCurrency',
        'expert',
        'expertOnly',
        'questItem',
        'fishingPole',
        'bait',
        'hairDye',
        'makeNPC',
        'dye',
        'paint',
        'paintCoating',
        'tileWand',
        'notAmmo',
        'prefix',
        'crit',
        'mech',
        'reuseDelay',
        'melee',
        'magic',
        'ranged',
        'summon',
        'placeStyle',
        'buffTime',
        'buffType',
        'mountType',
        'cartTrack',
        'material',
        'noWet',
        'vanity',
        'mana',
        'channel',
        'manaIncrease',
        'noMelee',
        'noUseGraphic',
        'lifeRegen',
        'shoot',
        'shootSpeed',
        'shootsEveryUse',
        'chlorophyteExtractinatorConsumable',
        'alpha',
        'ammo',
        'useAmmo',
        'autoReuse',
        'accessory',
        'axe',
        'healMana',
        'potion',
        'color',
        'consumable',
        'createTile',
        'createWall',
        'useSoundPitch',
        'damage',
        'defense',
        'armorPenetration',
        'bonusTagDamage',
        'hammer',
        'healLife',
        'holdStyle',
        'knockBack',
        'maxStack',
        'pick',
        'rare',
        'scale',
        'shoot',
        'tileBoost',
        'useStyle',
        'useTime',
        'useAnimation',
        'value',
        'useTurn',
        'stringColor',
        'buy',
        'uniqueStack'
    ];
    
    static ReassertCalamityWeaponStaticSets() {
        // These are the currently ported Calamity weapons whose PC source relies
        // on static item arrays for held orientation / alternate-use behavior.
        // Managed-array writes are repeated after registration because TLPro mods
        // can resize the same CLR arrays while loading alongside each other.
        const staffNames = new Set([
            'BrittleStarStaff', 'EnchantedKnifeStaff', 'ScabRipper', 'HarvestStaff',
            'SquirrelSquireStaff', 'VileFeeder', 'IcicleStaff', 'ShaderainStaff',
            'ParasiticSceptor', 'HellwingStaff', 'ManaRose', 'HyphaeRod', 'BloodBath',
            'NightsRay', 'PlasmaRod', 'SkyGlaze', 'AquamarineStaff', 'SandstreamScepter'
        ]);
        const repeatedRightClickNames = new Set([
            'SaharaSlicers', 'YateveoBloom', 'BrittleStarStaff', 'ShortCircuit', 'VeeringWind'
        ]);
        for (const item of this.Items) {
            const name = item?.constructor?.name;
            if (!(item?.Type > 0)) continue;
            if (staffNames.has(name)) setArrayValueCompat(Terraria.Item, 'staff', item.Type, true);
            if (repeatedRightClickNames.has(name))
                setArrayValueCompat(Terraria.ID.ItemID.Sets, 'ItemsThatAllowRepeatedRightClick', item.Type, true);
        }
    }

    static EnsureCalamityWeaponStaticSetsForType(type) {
        const modItem = this.getModItem(Number(type));
        if (!modItem) return;
        const name = modItem?.constructor?.name;
        if (!name) return;
        switch (name) {
            case 'BrittleStarStaff': case 'EnchantedKnifeStaff': case 'ScabRipper': case 'HarvestStaff':
            case 'SquirrelSquireStaff': case 'VileFeeder': case 'IcicleStaff': case 'ShaderainStaff':
            case 'ParasiticSceptor': case 'HellwingStaff': case 'ManaRose': case 'HyphaeRod': case 'BloodBath':
            case 'NightsRay': case 'PlasmaRod': case 'SkyGlaze': case 'AquamarineStaff': case 'SandstreamScepter':
                setArrayValueCompat(Terraria.Item, 'staff', modItem.Type, true);
                break;
        }
        switch (name) {
            case 'SaharaSlicers': case 'YateveoBloom': case 'BrittleStarStaff': case 'ShortCircuit': case 'VeeringWind':
                setArrayValueCompat(Terraria.ID.ItemID.Sets, 'ItemsThatAllowRepeatedRightClick', modItem.Type, true);
                break;
        }
    }

    static LoadItems() {
        this.TypeOffset = ModLoader.ModData.ItemCount ?? 0;
        for (const item of this.Items) {
            this.LoadItem(item);
        }
        this.ReassertCalamityWeaponStaticSets();
    }
    
    static LoadItem(item) {
        this.Count++;
        let itemName = item.IsTileItem ? item.TileName + 'Item' : item.constructor.name;
        
        item.Item = {};
        item.Type = item.Item.type = tl.item.registerNew(itemName);
        this.ModTypes.add(item.Type);
        const nextItem = item.Type + 1;
        this.TypeToIndex[item.Type] = this.Items.indexOf(item);
        
        addToArray(Terraria.Lang, '_itemNameCache', ModLocalization.getTranslationItemName(item.Type));
        addToArray(Terraria.Lang, '_itemTooltipCache', Terraria.UI.ItemTooltip.None);
        
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'ToolTipDamageMultiplier', nextItem, 1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'BonusMeleeSpeedMultiplier', nextItem, 1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'CanGetPrefixes', nextItem, true);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'ExtractinatorMode', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'KillsToBanner', nextItem);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'UsesCursedByPlanteraTooltip', nextItem, false);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'ShimmerCountsAsItemForDecraft', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'ShimmerCountsAsItem', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityMiscAcorns', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityMiscGems', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityMiscHerbsAndSeeds', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityMiscBossBags', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityToolsInstruments', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityToolsFishing', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityToolsGolf', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityToolsKites', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityToolsKeys', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityToolsMisc', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityWeaponsRanged', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityPotionsBuffs', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityPotionsDyeMaterial', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityMiscImportants', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityWiring', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityMaterials', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityExtractibles', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityRopes', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityPainting', nextItem, -1);
        resizeArrayProperty(Terraria.ID.ItemID.Sets, 'SortingPriorityTerraforming', nextItem, -1);
        // Static ItemID sets must grow with TLPro custom IDs.  The old Calamity
        // base only resized the generic sorting/prefix arrays, which meant several
        // perfectly valid SetStaticDefaults writes landed past the end of the CLR
        // arrays (staff targeting, yoyos, specialist weapons, etc.).
        // This mirrors the newer working TLPro/After Moon base and keeps every
        // currently ported weapon family on the same registration path.
        // ItemID.Sets.Spears does not exist in this Terraria mobile build. Probing it
        // makes TLPro enumerate the entire native ::Sets type for every registered item.
        // Spear behavior in this port is handled by the projectile AI/draw runtime instead.
        const customItemSets = [
            ['GamepadWholeScreenUseRange', false],
            ['LockOnIgnoresCollision', false],
            ['StaffMinionSlotsRequired', 0],
            ['BossBag', false],
            ['Yoyo', false],
            ['GamepadExtraRange', 0],
            ['GamepadSmartQuickReach', false],
            ['IsRangedSpecialistWeapon', false],
            ['ItemsThatAllowRepeatedRightClick', false]
        ];
        for (const [setName, defaultValue] of customItemSets) {
            try { resizeArrayProperty(Terraria.ID.ItemID.Sets, setName, nextItem, defaultValue); } catch (e) { }
        }
        
        resizeArrayProperty(Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets, 'SwordsHammersAxesPicks', nextItem, false);
        resizeArrayProperty(Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets, 'SpearsMacesChainsawsDrillsPunchCannon', nextItem, false);
        resizeArrayProperty(Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets, 'GunsBows', nextItem, false);
        resizeArrayProperty(Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets, 'Magic', nextItem, false);
        resizeArrayProperty(Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets, 'Summon', nextItem, false);
        resizeArrayProperty(Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets, 'BoomerangsChakrams', nextItem, false);
        resizeArrayProperty(Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets, 'ItemsThatCanHaveLegendary2', nextItem, false);
        
        resizeArrayProperty(Terraria.Item, 'cachedItemSpawnsByType', nextItem, -1);
        resizeArrayProperty(Terraria.Item, 'staff', nextItem);
        resizeArrayProperty(Terraria.Item, 'claw', nextItem);
        
        resizeArrayProperty(Terraria.DataStructures.ArmorSetBonuses, 'SetsContaining', nextItem, [].makeGeneric(Terraria.DataStructures.ArmorSetBonus));
        
        resizeArrayProperty(Terraria.UI.ItemSorting, '_layerIndexForItemType', nextItem, 52);
        resizeArrayProperty(Terraria.GameContent.QuickStacking.matchingItemTypeScratch, 'firstEntryForType', nextItem);
        
        if (item?.IsQuestFish()) {
            const newSize = Terraria.Main.anglerQuestItemNetIDs.length + 1;
            resizeArrayProperty(Terraria.Main, 'anglerQuestItemNetIDs', newSize, item.Type);
        }
        
        this.SetupTextures(item);
        
        if (item.IsTileItem) {
            const tile = TileLoader.getModTile(item.TileType);
            if (tile?.Item) {
                tile.ModifyTileItem(tile.Item);
            }
        }
        
        item.SetDefaults();
        item.SetStaticDefaults();
        
        item.MenuCategories.push('ModIcon');
        item.MenuCategories.push('all');
        // Use the normal one-time category registration path for the dedicated
        // Calamity tab instead of bulk re-adding every item after content setup.
        item.MenuCategories.push('Calamity');
        
        if (typeof item.Item.createTile === 'number'
        && item.Item.createTile > -1) item.MenuCategories.push('tile');
        
        if (typeof item.Item.createWall === 'number'
        && item.Item.createWall > -1) item.MenuCategories.push('wall');
        
        if (item.Item.pick) item.MenuCategories.push('pick');
        if (item.Item.axe) item.MenuCategories.push('axe');
        if (item.Item.hammer) item.MenuCategories.push('hammer');
        if (item.Item.fishingPole) item.MenuCategories.push('fishingPole');
        
        if (item.Item.accessory) item.MenuCategories.push('accessory');
        if (item.Item.melee) item.MenuCategories.push('melee');
        if (item.Item.ranged) item.MenuCategories.push('ranged');
        if (item.Item.magic) item.MenuCategories.push('magic');
        if (item.Item.summon || item.Item.sentry) item.MenuCategories.push('summon');
        if (item.Item.consumable && item.Item.shoot > 0 && !item.Item.ammo) item.MenuCategories.push('thrown');
        if (item.Item.expert || item.Item.expertOnly) item.MenuCategories.push('expert');
        if (item.Item.questItem) item.MenuCategories.push('questItem');
        
        if (item.Item.headSlot || item.Item.bodySlot || item.Item.legSlot) {
            item.MenuCategories.push('armor');
            if (item.Item.headSlot) item.MenuCategories.push('helmet');
            if (item.Item.bodySlot) item.MenuCategories.push('breastplate');
            if (item.Item.legSlot) item.MenuCategories.push('boots');
        }
        
        if (item.Item.shieldSlot) item.MenuCategories.push('shield');
        if (item.Item.wingSlot) item.MenuCategories.push('wings');
        
        if (item.Item.accessory || item.Item.melee || item.Item.ranged
        || item.Item.magic || item.Item.summon || item.Item.sentry
        ) {
            item.Item.reforge = true;
            if (!item.Item.melee) item.Item.noMelee = item.Item.noMelee ?? true;
        }
        
        const itemTexture = Terraria.GameContent.TextureAssets.Item[item.Type].Value;
        if (item.Item.width == undefined) item.Item.width = itemTexture.Width;
        if (item.Item.height == undefined) item.Item.height = itemTexture.Height;
        
        item.PostSetDefaults();
        item.PostStaticDefaults();
    }
    
    // Automatic creation and addition to TL menus
    static AddMenuMembership(category, type) {
        if (category == null || !(Number(type) > 0)) return false;
        const key = `${String(category)}:${Math.floor(Number(type))}`;
        if (this.MenuMembership.has(key)) return true;
        try {
            tl.cheatMenu.addItemToCategory(category, Math.floor(Number(type)));
            this.MenuMembership.add(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    static AddToMenu(item) {
        if (!item || !(item.Type > 0) || item.MenuCategories.length === 0) return;
        item.MenuCategories = [...new Set(item.MenuCategories)];

        // Do not keep the category list captured at module evaluation time. Another
        // TLPro mod can create categories before/after this mod depending on load
        // order; refreshing here prevents a foreign category name being recreated.
        let nativeCategories = this.TL_Categories;
        try {
            const current = tl.cheatMenu.getItemCategories();
            if (current) nativeCategories = current;
        } catch (e) { }
        this.TL_Categories = nativeCategories;

        for (const category of item.MenuCategories) {
            if (nativeCategories && nativeCategories.includes(category)) {
                this.AddMenuMembership(category, item.Type);
                continue;
            }
            if (this.MenuCategories[category] == null) {
                const texture = `Textures/Icons/${category}.png`;
                try {
                    if (tl.file.exists(texture)) {
                        this.MenuCategories[category] = tl.cheatMenu.addItemCategory(category, texture);
                    }
                } catch (e) { }
            }
            if (this.MenuCategories[category] != null)
                this.AddMenuMembership(this.MenuCategories[category], item.Type);
        }
    }

    static EnsureCalamityCheatMenu() {
        // Diagnostics/repair entry point. Registration is deliberately idempotent.
        // Normal loading already routes every item through AddToMenu once.
        let category = this.MenuCategories.Calamity;
        if (category == null) {
            const texture = 'Textures/Icons/Calamity.png';
            try {
                if (tl.file.exists(texture)) {
                    category = tl.cheatMenu.addItemCategory('Calamity', texture);
                    this.MenuCategories.Calamity = category;
                }
            } catch (e) { category = null; }
        }
        let added = 0;
        if (category != null) {
            for (const item of this.Items) {
                if (item && item.Type > 0 && this.AddMenuMembership(category, item.Type)) added++;
            }
        }
        return { category: category != null, added, total: this.Items.length };
    }
    
    static SetupContent() {
        this.LoadItems();
        ModLoader.ModData.ItemCount += this.Count;
        
        for (const item of this.Items) {
            item.SetupContent();
        }
    }
    
    static PostSetupContent() {
        this.ItemCount = this.MAX_VANILLA_ID + ModLoader.ModData.ItemCount;
        ItemLoader.ArmorSetBonusEffect = Array.from(ArmorSetBonuses.All.ToArray()).find(s => s.Head === 1731).Effect;
        for (const item of this.Items) {
            item.PostSetupContent();
            item.AddArmorSets();
            if (Terraria.ID.ItemID.Sets.BossBag[item.Type]) {
                item.Item.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
            }
        }
        // Re-apply orientation sets after content setup as a second compatibility
        // barrier against another loaded TLPro mod resizing the same native arrays.
        this.ReassertCalamityWeaponStaticSets();

    }
    
    static SetupTextures(item) {
        if (!item.Texture?.startsWith('Textures/')) {
            item.Texture = 'Textures/' + item.Texture;
        }
        
        const itemTexture = new ModTexture(item.Texture, item.horizontalFrames, item.frameCount, item.ticksPerFrame);
        if (itemTexture?.exists) {
            Terraria.GameContent.TextureAssets.Item[item.Type] = itemTexture.asset.asset;
        }
        
        // _Head
        const itemHeadTexture = new ModTexture(`${item.Texture}_Head`, 20);
        if (itemHeadTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Head.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Head.Count = newSize;
            
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'ArmorHead', newSize, itemHeadTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Head.Sets, 'FrontToBackID', newSize, -1);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Head.Sets, 'PreventBeardDraw', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Head.Sets, 'UseAltFaceHeadDraw', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Head.Sets, 'UseSkinColor', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Head.Sets, 'HidesHead', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Head.Sets, 'CanDrawOnVelociraptorMount', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Head.Sets, 'HasGlowMask', newSize, false);
            resizeArrayProperty(Terraria.Item, 'headType', newSize, item.Type);
            item.Item.headSlot = newIndex;
        }
        
        // _Beard
        const itemBeardTexture = new ModTexture(`${item.Texture}_Beard`, 20);
        if (itemBeardTexture.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Beard.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Beard.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccBeard', newSize, itemBeardTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Beard.Sets, 'UseHairColor', newSize, false);
            item.Item.beardSlot = newIndex;
        }
        
        // _Back
        const itemBackTexture = new ModTexture(`${item.Texture}_Back`);
        if (itemBackTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Back.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Back.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccBack', newSize, itemBackTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Back.Sets, 'DrawInBackpackLayer', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Back.Sets, 'DrawInTailLayer', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Back.Sets, 'IsACape', newSize, false);
            item.Item.backSlot = newIndex;
        }
        
        // _Body
        const itemBodyTexture = new ModTexture(`${item.Texture}_Body`);
        if (itemBodyTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Body.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Body.Count = newSize;
            
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'ArmorBodyComposite', newSize, itemBodyTexture.asset.asset);
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'ArmorBody', newSize, itemBodyTexture.asset.asset);
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'FemaleBody', newSize, itemBodyTexture.asset.asset);
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'ArmorArm', newSize, itemBodyTexture.asset.asset);
            
            const includeCapeFrontAndBackInfoObject = Terraria.ID.ArmorIDs.Body.Sets.IncludeCapeFrontAndBackInfo.new();
            includeCapeFrontAndBackInfoObject.backCape = item.Item?.backSlot ?? -1;
            includeCapeFrontAndBackInfoObject.frontCape = -1;
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'IncludeCapeFrontAndBack', newSize, includeCapeFrontAndBackInfoObject);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'IncludedCapeBack', newSize, item.Item?.backSlot ?? -1);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'IncludedCapeBackFemale', newSize, item.Item?.backSlot ?? -1);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'NeedsToDrawArm', newSize, true);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'IncludedCapeFront', newSize, -1);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'UsesNewFramingCode', newSize, true);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'showsShouldersWhileJumping', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'shouldersAreAlwaysInTheBack', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'DisableHandOnAndOffAccDraw', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'DisableBeltAccDraw', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'HidesShouldersAsCoat', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'MissingHand', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Body.Sets, 'HasGlowMask', newSize);
            resizeArrayProperty(Terraria.Item, 'bodyType', newSize, item.Type);
            item.Item.bodySlot = newIndex;
        }
        
        // _Legs
        const itemLegsTexture = new ModTexture(`${item.Texture}_Legs`);
        if (itemLegsTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Legs.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Legs.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'ArmorLeg', newSize, itemLegsTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Legs.Sets, 'IncompatibleWithFrogLeg', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Legs.Sets, 'DoesNotSupportSittingDraw', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Legs.Sets, 'HasGlowMask', newSize, false);
            resizeArrayProperty(Terraria.Item, 'legType', newSize, item.Type);
            item.Item.legSlot = newIndex;
        }
        
        // _Glow
        const itemGlowTexture = new ModTexture(`${item.Texture}_Glow`);
        if (itemGlowTexture?.exists) {
            const newIndex = Terraria.GameContent.TextureAssets.GlowMask.length;
            const newSize = newIndex + 1;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'GlowMask', newSize, itemGlowTexture.asset.asset);
            item.Item.glowMask = newIndex;
        }
        
        // _Shield
        const itemShieldTexture = new ModTexture(`${item.Texture}_Shield`);
        if (itemShieldTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Shield.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Shield.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccShield', newSize, itemShieldTexture.asset.asset);
            item.Item.shieldSlot = newIndex;
        }
        
        // _Neck
        const itemNeckTexture = new ModTexture(`${item.Texture}_Neck`);
        if (itemNeckTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Neck.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Neck.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccNeck', newSize, itemNeckTexture.asset.asset);
            item.Item.neckSlot = newIndex;
        }
        
        // _Shoes
        const itemShoesTexture = new ModTexture(`${item.Texture}_Shoes`);
        if (itemShoesTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Shoe.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Shoe.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccShoes', newSize, itemShoesTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Shoe.Sets, 'MaleToFemaleID', newSize, -1);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Shoe.Sets, 'IsARollerSkate', newSize, false);
            item.Item.shoeSlot = newIndex;
        }
        
        // _Waist
        const itemWaistTexture = new ModTexture(`${item.Texture}_Waist`);
        if (itemWaistTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Waist.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Waist.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccWaist', newSize, itemWaistTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Waist.Sets, 'UsesTorsoFraming', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Waist.Sets, 'IsABelt', newSize, false);
            item.Item.waistSlot = newIndex;
        }
        
        // _Face
        const itemFaceTexture = new ModTexture(`${item.Texture}_Face`);
        if (itemFaceTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Face.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Face.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccFace', newSize, itemFaceTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Face.Sets, 'PreventHairDraw', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Face.Sets, 'OverrideHelmet', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Face.Sets, 'DrawInFaceUnderHairLayer', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Face.Sets, 'DrawInFaceFlowerLayer', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Face.Sets, 'DrawInFaceHeadLayer', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Face.Sets, 'AltFaceHead', newSize, -1);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Face.Sets, 'CanDrawOnVelociraptorMount', newSize, false);
            item.Item.faceSlot = newIndex;
        }
        
        // _HandsOn
        const itemHandsOnTexture = new ModTexture(`${item.Texture}_HandsOn`);
        if (itemHandsOnTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.HandOn.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.HandOn.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccHandsOn', newSize, itemHandsOnTexture.asset.asset);
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccHandsOnComposite', newSize, itemHandsOnTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.HandOn.Sets, 'UsesNewFramingCode', newSize, true);
            resizeArrayProperty(Terraria.ID.ArmorIDs.HandOn.Sets, 'UsesOldFramingTexturesForWalking', newSize, false);
            item.Item.handOnSlot = newIndex;
        }
        
        // _HandsOff
        const itemHandsOffTexture = new ModTexture(`${item.Texture}_HandsOff`);
        if (itemHandsOffTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.HandOff.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.HandOff.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccHandsOff', newSize, itemHandsOffTexture.asset.asset);
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccHandsOffComposite', newSize, itemHandsOffTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.HandOff.Sets, 'UsesNewFramingCode', newSize, true);
            item.Item.handOffSlot = newIndex;
        }
        
        // _Front
        const itemFrontTexture = new ModTexture(`${item.Texture}_Front`);
        if (itemFrontTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Front.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Front.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccFront', newSize, itemFrontTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Front.Sets, 'DrawsInNeckLayer', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Front.Sets, 'DrawsInNeckLayerRegardlessOfPlayerFrame', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Front.Sets, 'DontDrawIfWearingAScarfOrCape', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Front.Sets, 'IsACape', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Front.Sets, 'HidesCompositeShoulders', newSize, false);
            item.Item.frontSlot = newIndex;
        }
        
        // _Balloon
        const itemBalloonTexture = new ModTexture(`${item.Texture}_Balloon`);
        if (itemBalloonTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Balloon.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Balloon.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'AccBalloon', newSize, itemBalloonTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Balloon.Sets, 'DrawInFrontOfBackArmLayer', newSize, false);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Balloon.Sets, 'UsesTorsoFraming', newSize, false);
            item.Item.balloonSlot = newIndex;
        }
        
        // _Wings
        const itemWingsTexture = new ModTexture(`${item.Texture}_Wings`);
        if (itemWingsTexture?.exists) {
            const newIndex = Terraria.ID.ArmorIDs.Wing.Count;
            const newSize = newIndex + 1;
            Terraria.ID.ArmorIDs.Wing.Count = newSize;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Wings', newSize, itemWingsTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.ArmorIDs.Wing.Sets, 'Stats', newSize, Terraria.DataStructures.WingStats.new());
            resizeArrayProperty(Terraria.ID.ArmorIDs.Wing.Sets, 'AlwaysAnimated', newSize, false);
            item.Item.wingSlot = newIndex;
        }
    }
    
    static SetDefaults(item) {
        for (const gItem of GlobalItem.RegisteredItems) {
            gItem.SetDefaults(item);
        }
    }
    
    static CreateArmorSet(head, body, legs, setBonusText, primaryPart) {
        ArmorSetBonuses['void Add(ArmorSetEffect Effect, string TextKey, PartType PrimaryPart, int Head, int Body, int Legs)'
        ](ItemLoader.ArmorSetBonusEffect, setBonusText, primaryPart, head, body, legs);
        function addSet(item, set) {
            let arr = ArmorSetBonuses.SetsContaining[item];
            let next = arr.length;
            arr = arr.cloneResized(next + 1);
            arr[next] = set;
            ArmorSetBonuses.SetsContaining[item] = arr;
        }
        for (const setAdded of Array.from(ArmorSetBonuses.All.ToArray()).filter(s => s.Head === head && s.Body === body && s.Legs === legs)) {
            addSet(head, setAdded);
            addSet(body, setAdded);
            addSet(legs, setAdded);
        }
    }
    
    static GeneralPrefix(item) { return item.damage > 0 && item.ammo === 0 && !item.accessory; }
    static MeleePrefix(item) { return this.GeneralPrefix(item) && ((item.melee && !item.noUseGraphic) || Terraria.ID.ProjectileID.Sets.IsAWhip[item.shoot] || Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets.SwordsHammersAxesPicks[item.type]); }
    static WeaponPrefix(item) { const modItem = this.isModType(item.type) ? this.getModItem(item.type) : null; return this.GeneralPrefix(item) && ((item.melee && item.noUseGraphic) || modItem?.RoguePrefix === true || Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets.SpearsMacesChainsawsDrillsPunchCannon[item.type]); }
    static RangedPrefix(item) { return this.GeneralPrefix(item) && ((item.ranged && item.shoot > 0) || Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets.GunsBows[item.type]); }
    static MagicPrefix(item) { return this.GeneralPrefix(item) && (item.magic || Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets.Magic[item.type]); }
    static SummonPrefix(item) { return this.GeneralPrefix(item) && (((item.summon || item.sentry) && item.shoot > 0) || Terraria.GameContent.Prefixes.PrefixLegacy.ItemSets.Summon[item.type]); }
    
    static AllowPrefix(item, pre) {
        let result = true;
        if (this.isModType(item.type)) {
            result = this.getModItem(item.type)?.AllowPrefix(item, pre) ?? result;
        }
        for (const gItem of GlobalItem.RegisteredItems) {
            if ((gItem?.AllowPrefix(item, pre) ?? true) === false) {
                result = false;
            }
        }
        return result;
    }
    
    /** @deprecated */
    static ChoosePrefix(item, rolledPrefix, rollablePrefixes) {
        if (this.isModType(item.type)) {
            let rolledPrefix2 = this.getModItem(item.type)?.ChoosePrefix(item, rolledPrefix, rollablePrefixes) ?? -1;
            if (rolledPrefix2 > 0) rolledPrefix = rolledPrefix2;
        }
        for (const gItem of GlobalItem.RegisteredItems) {
            let rolledPrefix2 = gItem?.ChoosePrefix(item, rolledPrefix, rollablePrefixes) ?? -1;
            if (rolledPrefix2 > 0) rolledPrefix = rolledPrefix2;
        }
        return rolledPrefix;
    }
    
    static CanUseItem(item, player) {
        let value = true;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.CanUseItem) value = (modItem.CanUseItem(item, player) ?? true) !== false;
        if (value && GlobalItem.getHandlers('CanUseItem').some(g => (g.CanUseItem(item, player) ?? true) === false)) value = false;
        return value;
    }
    
    static CanAutoReuseItem(item, player) {
        let value = true;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.CanAutoReuseItem) value = (modItem.CanAutoReuseItem(item, player) ?? true) !== false;
        if (value && GlobalItem.getHandlers('CanAutoReuseItem').some(g => (g.CanAutoReuseItem(item, player) ?? true) === false)) value = false;
        return value;
    }
    
    static ConsumeItem(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.ConsumeItem) return modItem.ConsumeItem(item, player) ?? item.consumable;
        return !!item?.consumable;
    }
    
    static OnConsumeItem(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.OnConsumeItem) modItem.OnConsumeItem(item, player);
        for (const gItem of GlobalItem.getHandlers('OnConsumeItem')) gItem.OnConsumeItem(item, player);
    }
    
    static OpenBossBag(item, player) {
        if (this.isModType(item.type)) {
            this.getModItem(item.type)?.OpenBossBag(item, player);
        }
    }
    
    static HoldItem(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.HoldItem) modItem.HoldItem(item, player);
        for (const gItem of GlobalItem.getHandlers('HoldItem')) gItem.HoldItem(item, player);
    }
    
    static UseStyle(item, player, mountOffset, heldItemFrame) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UseStyle) modItem.UseStyle(item, player, mountOffset, heldItemFrame);
        for (const gItem of GlobalItem.getHandlers('UseStyle')) gItem.UseStyle(item, player, mountOffset, heldItemFrame);
    }
    
    static HoldStyle(item, player, mountOffset, heldItemFrame) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.HoldStyle) modItem.HoldStyle(item, player, mountOffset, heldItemFrame);
        for (const gItem of GlobalItem.getHandlers('HoldStyle')) gItem.HoldStyle(item, player, mountOffset, heldItemFrame);
    }
    
    static UseTimeMultiplier(item, player) {
        if (!item || item.type === 0) return 1.0;
        let multiplier = 1.0;
        const modItem = this.getModItem(item.type);
        if (modItem?.__dispatch?.UseTimeMultiplier) multiplier = modItem.UseTimeMultiplier(item, player) ?? 1.0;
        for (const gItem of GlobalItem.getHandlers('UseTimeMultiplier')) multiplier *= gItem.UseTimeMultiplier(item, player) ?? 1.0;
        return multiplier;
    }
    
    static UseAnimationMultiplier(item, player) {
        if (!item || item.type === 0) return 1.0;
        let multiplier = 1.0;
        const modItem = this.getModItem(item.type);
        if (modItem?.__dispatch?.UseAnimationMultiplier) multiplier = modItem.UseAnimationMultiplier(item, player) ?? 1.0;
        for (const gItem of GlobalItem.getHandlers('UseAnimationMultiplier')) multiplier *= gItem.UseAnimationMultiplier(item, player) ?? 1.0;
        return multiplier;
    }
    
    static UseSpeedMultiplier(item, player) {
        if (!item || item.type === 0) return 1.0;
        let multiplier = 1.0;
        const modItem = this.getModItem(item.type);
        if (modItem?.__dispatch?.UseSpeedMultiplier) multiplier = modItem.UseSpeedMultiplier(item, player) ?? 1.0;
        for (const gItem of GlobalItem.getHandlers('UseSpeedMultiplier')) multiplier *= gItem.UseSpeedMultiplier(item, player) ?? 1.0;
        return multiplier;
    }
    
    static GetHealLife(item, player, healValue = 0) {
        let value = healValue;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.GetHealLife) value = modItem.GetHealLife(item, player, value) ?? value;
        for (const gItem of GlobalItem.getHandlers('GetHealLife')) value = gItem.GetHealLife(item, player, value) ?? value;
        return value;
    }
    
    static GetHealMana(item, player, healValue = 0) {
        let value = healValue;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.GetHealMana) value = modItem.GetHealMana(item, player, value) ?? value;
        for (const gItem of GlobalItem.getHandlers('GetHealMana')) value = gItem.GetHealMana(item, player, value) ?? value;
        return value;
    }
    
    static OnConsumeMana(item, player, manaConsumed) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.OnConsumeMana) modItem.OnConsumeMana(item, player, manaConsumed);
        for (const gItem of GlobalItem.getHandlers('OnConsumeMana')) gItem.OnConsumeMana(item, player, manaConsumed);
    }
    
    static OnMissingMana(item, player, neededMana) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.OnMissingMana) modItem.OnMissingMana(item, player, neededMana);
        for (const gItem of GlobalItem.getHandlers('OnMissingMana')) gItem.OnMissingMana(item, player, neededMana);
    }
    
    static ModifyManaCost(item, player, mana) {
        let value = mana;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.ModifyManaCost) value = modItem.ModifyManaCost(item, player, value) ?? value;
        for (const gItem of GlobalItem.getHandlers('ModifyManaCost')) value = gItem.ModifyManaCost(item, player, value) ?? value;
        return value;
    }
    
    static ModifyWeaponDamage(item, player, damage) {
        let value = damage;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.ModifyWeaponDamage) value = modItem.ModifyWeaponDamage(item, player, value) ?? value;
        for (const gItem of GlobalItem.getHandlers('ModifyWeaponDamage')) value = gItem.ModifyWeaponDamage(item, player, value) ?? value;
        return value;
    }
    
    static ModifyWeaponCrit(item, player, crit) {
        let value = crit;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.ModifyWeaponCrit) value = modItem.ModifyWeaponCrit(item, player, value) ?? value;
        for (const gItem of GlobalItem.getHandlers('ModifyWeaponCrit')) value = gItem.ModifyWeaponCrit(item, player, value) ?? value;
        return value;
    }
    
    static ModifyWeaponKnockback(item, player, knockBack) {
        let value = knockBack;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.ModifyWeaponKnockback) value = modItem.ModifyWeaponKnockback(item, player, value) ?? value;
        for (const gItem of GlobalItem.getHandlers('ModifyWeaponKnockback')) value = gItem.ModifyWeaponKnockback(item, player, value) ?? value;
        return value;
    }
    
    static CanShoot(item, player) {
        let value = true;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.CanShoot) value = (modItem.CanShoot(item, player) ?? true) !== false;
        if (value && GlobalItem.getHandlers('CanShoot').some(g => (g.CanShoot(item, player) ?? true) === false)) value = false;
        return value;
    }
    
    static ModifyShootStats(item, player, stats) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.ModifyShootStats) modItem.ModifyShootStats(item, player, stats);
        for (const gItem of GlobalItem.getHandlers('ModifyShootStats')) gItem.ModifyShootStats(item, player, stats);
    }
    
    static Shoot(item, player, position, velocity, type, damage, knockBack) {
        let value = true;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.Shoot) value = (modItem.Shoot(item, player, position, velocity, type, damage, knockBack) ?? true) !== false;
        if (value && GlobalItem.getHandlers('Shoot').some(g => (g.Shoot(item, player, position, velocity, type, damage, knockBack) ?? true) === false)) value = false;
        return value;
    }
    
    static OnHitNPC(item, player, npc, damageDone, knockBack, crit) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.OnHitNPC) modItem.OnHitNPC(item, player, npc, damageDone, knockBack, crit);
        for (const gItem of GlobalItem.getHandlers('OnHitNPC')) gItem.OnHitNPC(item, player, npc, damageDone, knockBack, crit);
    }
    
    static UseItem(item, player) {
        let value = true;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UseItem) value = (modItem.UseItem(item, player) ?? true) !== false;
        if (value && GlobalItem.getHandlers('UseItem').some(g => (g.UseItem(item, player) ?? true) === false)) value = false;
        return value;
    }
    
    static UseAnimation(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UseAnimation) modItem.UseAnimation(item, player);
        for (const gItem of GlobalItem.getHandlers('UseAnimation')) gItem.UseAnimation(item, player);
    }
    
    static CanAccessoryBeEquippedWith(incomingItem, equippedItem, player) {
        let value = true;
        const modItem = this.getModItem(incomingItem?.type);
        if (modItem?.__dispatch?.CanAccessoryBeEquippedWith) value = (modItem.CanAccessoryBeEquippedWith(incomingItem, equippedItem, player) ?? true) !== false;
        if (value && GlobalItem.getHandlers('CanAccessoryBeEquippedWith').some(g => (g.CanAccessoryBeEquippedWith(incomingItem, equippedItem, player) ?? true) === false)) value = false;
        return value;
    }
    
    static UpdateInventory(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UpdateInventory) modItem.UpdateInventory(item, player);
        for (const gItem of GlobalItem.getHandlers('UpdateInventory')) gItem.UpdateInventory(item, player);
    }
    
    static UpdateEquip(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UpdateEquip) modItem.UpdateEquip(item, player);
        for (const gItem of GlobalItem.getHandlers('UpdateEquip')) gItem.UpdateEquip(item, player);
    }
    
    static UpdateAccessory(item, player, hideVisual) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UpdateAccessory) modItem.UpdateAccessory(item, player, hideVisual);
        for (const gItem of GlobalItem.getHandlers('UpdateAccessory')) gItem.UpdateAccessory(item, player, hideVisual);
    }
    
    static UpdateVanityAccessory(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UpdateVanityAccessory) modItem.UpdateVanityAccessory(item, player);
        for (const gItem of GlobalItem.getHandlers('UpdateVanityAccessory')) gItem.UpdateVanityAccessory(item, player);
    }
    
    static IsVanitySet(item, head, body, legs) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.IsVanitySet) return modItem.IsVanitySet(head, body, legs) ?? false;
        return item?.type < this.MAX_VANILLA_ID;
    }
    
    static UpdateArmorSet(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UpdateArmorSet) modItem.UpdateArmorSet(item, player);
        for (const gItem of GlobalItem.getHandlers('UpdateArmorSet')) gItem.UpdateArmorSet(item, player);
    }
    
    static UpdateVanitySet(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.UpdateVanitySet) modItem.UpdateVanitySet(item, player);
        for (const gItem of GlobalItem.getHandlers('UpdateVanitySet')) gItem.UpdateVanitySet(item, player);
    }
    
    static WingMovement(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.WingMovement) modItem.WingMovement(item, player);
        for (const gItem of GlobalItem.getHandlers('WingMovement')) gItem.WingMovement(item, player);
    }
    
    static CanPickup(item, player) {
        let value = true;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.CanPickup) value = (modItem.CanPickup(item, player) ?? true) !== false;
        if (value && GlobalItem.getHandlers('CanPickup').some(g => (g.CanPickup(item, player) ?? true) === false)) value = false;
        return value;
    }
    
    static OnPickup(item, player) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.OnPickup) modItem.OnPickup(item, player);
        for (const gItem of GlobalItem.getHandlers('OnPickup')) gItem.OnPickup(item, player);
    }
    
    static GetAlpha(item, color) {
        let value = color;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.GetAlpha) value = modItem.GetAlpha(item, value) ?? value;
        for (const gItem of GlobalItem.getHandlers('GetAlpha')) value = gItem.GetAlpha(item, value) ?? value;
        return value;
    }
    
    static HoldoutOffset(item, player) {
        const modItem = this.getModItem(item?.type);
        if (!modItem?.__dispatch?.HoldoutOffset) return;
        const offset = modItem.HoldoutOffset(item, player);
        if (offset && (offset.X || offset.Y)) {
            const rotated = Terraria.Utils['Vector2 RotatedBy(Vector2 spinningpoint, double radians, Vector2 center)'](
                Vector2.new(offset.X * player.direction, offset.Y * player.gravDir), player.itemRotation, Vector2.Zero
            );
            player.itemLocation = Vector2.Add(player.itemLocation, rotated);
        }
    }
    
    static ExtractinatorUse(item, player, extractType, extractinatorBlockType) {
        let value = true;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.ExtractinatorUse) value = (modItem.ExtractinatorUse(item, player, extractType, extractinatorBlockType) ?? true) !== false;
        if (value && GlobalItem.getHandlers('ExtractinatorUse').some(g => (g.ExtractinatorUse(item, player, extractType, extractinatorBlockType) ?? true) === false)) value = false;
        return value;
    }
    
    static OnCraft(item, player, recipe) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.OnCraft) modItem.OnCraft(item, player, recipe);
        for (const gItem of GlobalItem.getHandlers('OnCraft')) gItem.OnCraft(item, player, recipe);
    }
    
    static IsAnglerQuestAvailable(type) {
        let value = true;
        const modItem = this.getModItem(type);
        if (modItem?.__dispatch?.IsAnglerQuestAvailable) value = (modItem.IsAnglerQuestAvailable() ?? true) !== false;
        if (value && GlobalItem.getHandlers('IsAnglerQuestAvailable').some(g => (g.IsAnglerQuestAvailable() ?? true) === false)) value = false;
        return value;
    }
    
    static PreDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip) {
        let value = true;
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.PreDrawInInventory) value = (modItem.PreDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip) ?? true) !== false;
        if (value && GlobalItem.getHandlers('PreDrawInInventory').some(g => (g.PreDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip) ?? true) === false)) value = false;
        return value;
    }
    
    static PostDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip) {
        const modItem = this.getModItem(item?.type);
        if (modItem?.__dispatch?.PostDrawInInventory) modItem.PostDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip);
        for (const gItem of GlobalItem.getHandlers('PostDrawInInventory')) gItem.PostDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip);
    }
    
    static NPCToBanner(type) {
        return this._NPCToBanner[type];
    }
    
    static BannerToNPC(bannerID) {
        return this._BannerToNPC[bannerID];
    }
    
    static BannerToItem(bannerID) {
        return this._BannerToItem[bannerID];
    }
}