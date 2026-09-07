import { Terraria, Modules } from './../TL/ModImports.js';
import { ModItem } from './../TL/ModItem.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ModPlayer } from './../TL/ModPlayer.js';
import { FusionEntityData } from './FusionEntityData.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const RogueItemNames = [
    'WulfrumKnife',
    'ScourgeoftheDesert',
    'InfestedClawmerang',
    'Mycoroot',
    'RotBall',
    'ToothBall',
    'SnapClam',
    'SandDollar',
    'UrchinStinger',
    'ContaminatedBile',
    'GelDart',
    'Lionfish',
    'FeatherKnife',
    'Turbulance',
    'Crystalline',
    'AntlionSkewer',
    'GildedDagger',
    'BouncingEyeball',
    'IronFrancisca',
    'LeadTomahawk',
    'EnchantedAxe',
    'FishboneBoomerang',
    'AshenStalactite',
    'Cinquedea',
    'GleamingDagger',
    'ThrowingBrick',
    'SporeKnife',
    'SeafoamBomb',
    'Pumpkaboom',
    'NastyCholla',
    'InfernalKris',
    'WebBall',
    'HardenedHoneycomb',
    'ShinobiBlade',
    'SludgeSplotch',
    'MeteorFist',
    'MetalMonstrosity',
    'LemonNade',
    'Kylie',
    'Glaive',
    'SlickCane'
];
const RogueProjectileNames = [
    'WulfrumKnifeProj',
    'ScourgeoftheDesertProj',
    'InfestedClawmerangProj',
    'MycorootProj',
    'RotBallProjectile',
    'ToothBallProjectile',
    'RogueStealthCloud',
    'RogueStealthRain',
    'SnapClamProj',
    'SnapClamStealth',
    'SandDollarProj',
    'SandDollarStealth',
    'SandDollarFrag1',
    'SandDollarFrag2',
    'SandDollarFrag3',
    'UrchinStingerProj',
    'ContaminatedBileFlask',
    'LuxorsGiftRogue',
    'BileExplosion',
    'SulphuricAcidBubbleFriendly',
    'GelDartProjectile',
    'LionfishProjectile',
    'UrchinSpikeFugu',
    'FeatherKnifeProjectile',
    'StickyFeatherAero',
    'TurbulanceProjectile',
    'TurbulanceWindSlash',
    'CrystallineProj',
    'Crystalline2',
    'AntlionSkewerProj',
    'AntlionSkewerSandBlast',
    'AntlionSkewerSandCloud',
    'GildedDaggerProj',
    'BouncingEyeballProjectile',
    'BouncingEyeballProjectileStealthStrike',
    'IronFranciscaProj',
    'LeadTomahawkProj',
    'EnchantedAxeProj',
    'EnchantedAxe2',
    'FishboneBoomerangProjectile',
    'FishboneShard',
    'AshenStalactiteProj',
    'AshenStalagmiteProj',
    'AshenStalactiteDebris',
    'CinquedeaProj',
    'GleamingDaggerProj',
    'Brick',
    'BrickFragment',
    'SporeKnifeProj',
    'SporeKnifeBud',
    'SeafoamBombProj',
    'SeafoamBubble',
    'PumpkaboomSmall',
    'PumpkaboomBig',
    'NastyChollaBol',
    'NastyChollaNeedle',
    'InfernalKrisProjectile',
    'InfernalKrisCinder',
    'InfernalKrisExplosion',
    'WebBallBol',
    'Honeycomb',
    'HoneycombFragment',
    'HoneycombFragment2',
    'HoneycombFragment3',
    'ShinobiBladeProjectile',
    'SludgeSplotchProj1',
    'SludgeSplotchProj2',
    'MeteorFistProj',
    'MeteorFistMeteorite',
    'MetalChunk',
    'MetalShard',
    'LemonNadeHoldout',
    'LemonNadeProjectile',
    'KylieBoomerang',
    'GlaiveProj',
    'GlaiveOrbital',
    'SlickCaneProjectile'
];
let RogueItemTypes = null;
let RogueProjectileTypes = null;
function ResolveSet(names, resolver) {
    const result = new Set();
    for (const name of names) {
        const type = Number(resolver(name) || 0);
        if (type > 0)
            result.add(type);
    }
    return result;
}

export function GetRogueItemTypes() {
    if (!RogueItemTypes)
        RogueItemTypes = ResolveSet(RogueItemNames, name => ModItem.getTypeByName(name));
    return RogueItemTypes;
}

export function GetRogueProjectileTypes() {
    if (!RogueProjectileTypes)
        RogueProjectileTypes = ResolveSet(RogueProjectileNames, name => ModProjectile.getTypeByName(name));
    return RogueProjectileTypes;
}

export function IsRogueItem(item) {
    return !!(item && GetRogueItemTypes().has(Number(item.type)));
}

export function IsRogueProjectile(proj) {
    return !!(proj && GetRogueProjectileTypes().has(Number(proj.type)));
}

export function GetRogueState(player) {
    const state = ModPlayer.getByName('CalamityPlayerState');
    if (!state || !player || !state.IsLocalPlayer(player))
        return null;
    return state;
}

function RogueBag(proj) {
    return FusionEntityData.GetProjectileBag(proj, 'rogueClass', () => ({
        rogue: true,
        stealthStrike: false,
        subProjectile: false,
        sourceName: '',
        procUsed: false,
    }));
}

export function MarkStealthStrike(proj, sourceName = '', subProjectile = false) {
    if (!proj)
        return false;
    const bag = RogueBag(proj);
    bag.rogue = true;
    bag.stealthStrike = true;
    bag.subProjectile = subProjectile === true;
    bag.sourceName = String(sourceName || '');
    bag.procUsed = false;
    try {
        proj.netUpdate = true;
    } catch (e) { }
    return true;
}

export function MarkRogueProjectile(proj, sourceName = '', subProjectile = false) {
    if (!proj)
        return false;
    const bag = RogueBag(proj);
    bag.rogue = true;
    bag.subProjectile = subProjectile === true;
    bag.sourceName = String(sourceName || bag.sourceName || '');
    return true;
}

export function GetRogueProjectileData(proj) {
    if (!proj)
        return null;
    return FusionEntityData.PeekProjectileBag(proj, 'rogueClass');
}

export function IsStealthStrike(proj) {
    const data = GetRogueProjectileData(proj);
    return !!(data && data.stealthStrike === true);
}

export function ConsumeStealthStrike(player, item) {
    const state = GetRogueState(player);
    if (!state || !IsRogueItem(item) || !state.StealthStrikeAvailable())
        return false;
    return state.ConsumeRogueStealth(item);
}

export function StealthDamageMultiplier(player, itemName) {
    const state = GetRogueState(player);
    const accessoryMultiplier = state && state.FilthyGloveEquipped === true ? 1.08 : 1;
    let weaponMultiplier = 1;
    if (itemName === 'WulfrumKnife')
        weaponMultiplier = 1.50;
    else if (itemName === 'ScourgeoftheDesert')
        weaponMultiplier = 0.65;
    else if (itemName === 'FeatherKnife')
        weaponMultiplier = 0.60;
    else if (itemName === 'Crystalline')
        weaponMultiplier = 1.70;
    else if (itemName === 'GildedDagger')
        weaponMultiplier = 2.80;
    else if (itemName === 'IronFrancisca' || itemName === 'LeadTomahawk')
        weaponMultiplier = 3.00;
    else if (itemName === 'AshenStalactite')
        weaponMultiplier = 1.15;
    else if (itemName === 'Cinquedea')
        weaponMultiplier = 1.50;
    else if (itemName === 'GleamingDagger')
        weaponMultiplier = 2.80;
    else if (itemName === 'SporeKnife')
        weaponMultiplier = 2.00;
    else if (itemName === 'HardenedHoneycomb')
        weaponMultiplier = 0.80;
    else if (itemName === 'Glaive')
        weaponMultiplier = 0.40;
    return weaponMultiplier * accessoryMultiplier;
}

export function SpawnMarkedProjectile(player, item, position, velocity, type, damage, knockBack, sourceName, stealth, subProjectile = false, ai0 = 0, ai1 = 0, ai2 = 0) {
    if (!player || !(Number(type) > 0))
        return null;
    let source = null;
    try {
        source = player['IEntitySource GetProjectileSource_Item(Item item)'](item);
    } catch (e) { }
    const index = NewProjectile(source, position, velocity, Number(type), Math.max(1, Math.floor(Number(damage))), Number(knockBack) || 0, Terraria.PlayerIndex(player), Number(ai0) || 0, Number(ai1) || 0, Number(ai2) || 0, null);
    if (!(index >= 0 && index < 1000))
        return null;
    const proj = Terraria.Main.projectile[index];
    MarkRogueProjectile(proj, sourceName, subProjectile);
    if (stealth)
        MarkStealthStrike(proj, sourceName, subProjectile);
    return proj;
}

export function Rotate(vector, radians, scale = 1) {
    const x = Number(vector && vector.X) || 0;
    const y = Number(vector && vector.Y) || 0;
    const c = Math.cos(Number(radians) || 0);
    const s = Math.sin(Number(radians) || 0);
    return Vector2.new((x * c - y * s) * scale, (x * s + y * c) * scale);
}
