import { Terraria, Modules } from './../TL/ModImports.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ModBuff } from './../TL/ModBuff.js';
import { ModPlayer } from './../TL/ModPlayer.js';

const { Vector2 } = Modules;
const WetCollision = Terraria.Collision['bool WetCollision(Vector2 Position, int Width, int Height)'];
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const WaterState = new Map();
const SetState = new Map();
let CachedSnailType = 0;
let CachedSnailBuffType = 0;
function CurrentTick() {
    try {
        return Number(Terraria.Main.GameUpdateCount) || 0;
    } catch (e) {
        return 0;
    }
}

function PlayerKey(player) {
    return Math.max(0, Math.floor(Number(Terraria.PlayerIndex(player)) || 0));
}

export function IsVictideSubmerged(player) {
    if (!player)
        return false;
    const key = PlayerKey(player);
    const tick = CurrentTick();
    const cached = WaterState.get(key);
    if (cached && Number(cached.tick) === tick)
        return cached.value === true;
    const rect = Terraria.PlayerRect(player);
    const position = Vector2.new(Number(rect.X), Number(rect.Y));
    const width = Math.max(1, Math.floor(Number(rect.Width) || 20));
    const height = Math.max(1, Math.floor(Number(rect.Height) || 42));
    const torsoPosition = Vector2.new(Number(position.X) + 2, Number(position.Y) + Math.floor(height * 0.18));
    const torsoWidth = Math.max(1, width - 4);
    const torsoHeight = Math.max(1, Math.floor(height * 0.58));
    let value = false;
    try {
        value = WetCollision(torsoPosition, torsoWidth, torsoHeight) === true;
    } catch (e) {
        value = false;
    }
    WaterState.set(key, { tick, value });
    return value;
}

export function AddVictideClassDamage(player, classKey, amount) {
    const value = Number(amount) || 0;
    if (classKey === 'melee')
        player.meleeDamage = Number(player.meleeDamage || 1) + value;
    else if (classKey === 'magic')
        player.magicDamage = Number(player.magicDamage || 1) + value;
    else if (classKey === 'summon')
        player.minionDamage = Number(player.minionDamage || 1) + value;
    else if (classKey === 'rogue') {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.RogueDamageBonus += value;
    } else
        player.rangedDamage = Number(player.rangedDamage || 1) + value;
}

export function MarkVictideSet(player, classKey, summoner = false) {
    const key = PlayerKey(player);
    SetState.set(key, { tick: CurrentTick(), classKey: String(classKey || 'ranged'), summoner: summoner === true });
}

export function GetVictideSetState(player) {
    const state = SetState.get(PlayerKey(player));
    if (!state)
        return null;
    const age = CurrentTick() - Number(state.tick || 0);
    return age >= 0 && age <= 1 ? state : null;
}

export function IsVictideSetActive(player) {
    return GetVictideSetState(player) !== null;
}

export function IsVictideSummonerActive(player) {
    const state = GetVictideSetState(player);
    return !!(state && state.summoner === true);
}

function ResolveSnailTypes() {
    if (!(CachedSnailType > 0))
        CachedSnailType = Number(ModProjectile.getTypeByName('VictideSeaSnail') || 0);
    if (!(CachedSnailBuffType > 0))
        CachedSnailBuffType = Number(ModBuff.getTypeByName('SeaSnailBuff') || 0);
}

export function EnsureVictideSnail(player, item) {
    if (!player || player.dead || Number(Terraria.PlayerIndex(player)) !== Number(Terraria.Main.myPlayer))
        return false;
    ResolveSnailTypes();
    if (!(CachedSnailType > 0))
        return false;
    if (CachedSnailBuffType > 0) {
        try {
            player.AddBuff(CachedSnailBuffType, 3600);
        } catch (e) { }
    }
    let count = 0;
    try {
        count = Math.max(0, Number(player.ownedProjectileCounts[CachedSnailType]) || 0);
    } catch (e) { }
    if (count > 0)
        return true;
    let source = null;
    try {
        source = player['IEntitySource GetProjectileSource_Item(Item item)'](item);
    } catch (e) { }
    const baseDamage = 7;
    const damage = Math.max(1, Math.floor(baseDamage * Math.max(0.1, Number(player.minionDamage || 1))));
    const index = NewProjectile(source, Terraria.PlayerCenter(player), Vector2.new(0, -1), CachedSnailType, damage, 0, PlayerKey(player), 0, 0, 0, null);
    if (index >= 0) {
        try {
            Terraria.Main.projectile[index].originalDamage = baseDamage;
        } catch (e) { }
        return true;
    }
    return false;
}

export function ApplyVictideArmorSet(player, item, classKey) {
    const key = String(classKey || 'ranged');
    const summoner = key === 'summon';
    MarkVictideSet(player, key, summoner);
    if (key === 'rogue') {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player)) {
            state.WearingRogueArmor = true;
            state.RogueStealthMax = Math.max(Number(state.RogueStealthMax) || 0, 0.6);
        }
    }
    player.ignoreWater = true;
    if (key === 'melee')
        player.aggro = Number(player.aggro || 0) + 200;
    if (summoner) {
        player.maxMinions = Number(player.maxMinions || 0) + 1;
        EnsureVictideSnail(player, item);
    }

    if (IsVictideSubmerged(player)) {
        AddVictideClassDamage(player, key, 0.10);
        player.lifeRegen = Number(player.lifeRegen || 0) + 3;
    }
}
