import { Terraria, Modules } from './../TL/ModImports.js';
import { ModPlayer } from './../TL/ModPlayer.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ModBuff } from './../TL/ModBuff.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let CachedValkyrieType = 0;
let CachedValkyrieBuffType = 0;

function IsLocalPlayer(player) {
    try { return Number(Terraria.PlayerIndex(player)) === Number(Terraria.Main.myPlayer); } catch (e) { return false; }
}

function CountOwned(player, type) {
    try {
        const nativeCount = Number(player.ownedProjectileCounts[Number(type)]);
        if (Number.isFinite(nativeCount))
            return Math.max(0, Math.floor(nativeCount));
    } catch (e) { }
    const owner = Number(Terraria.PlayerIndex(player));
    let count = 0;
    for (let i = 0; i < 1000; i++) {
        const projectile = Terraria.Main.projectile[i];
        if (projectile && projectile.active && Number(projectile.owner) === owner && Number(projectile.type) === Number(type))
            count++;
    }
    return count;
}

function SummonDamage(player, baseDamage) {
    let multiplier = 1;
    for (const key of ['minionDamage', 'summonDamage']) {
        try {
            const value = Number(player[key]);
            if (Number.isFinite(value))
                multiplier = Math.max(multiplier, value);
        } catch (e) { }
    }
    return Math.max(1, Math.floor(Number(baseDamage) * multiplier));
}

function EnsureValkyrie(player) {
    if (!IsLocalPlayer(player) || !player || !player.active || player.dead)
        return;
    CachedValkyrieType = Number(CachedValkyrieType || ModProjectile.getTypeByName('Valkyrie') || 0);
    CachedValkyrieBuffType = Number(CachedValkyrieBuffType || ModBuff.getTypeByName('ValkyrieBuff') || 0);
    if (CachedValkyrieBuffType > 0) {
        try {
            if (player.FindBuffIndex(CachedValkyrieBuffType) < 0)
                player.AddBuff(CachedValkyrieBuffType, 3600, true);
        } catch (e) { }
    }
    if (!(CachedValkyrieType > 0) || CountOwned(player, CachedValkyrieType) > 0)
        return;
    let source = null;
    try { source = player.GetProjectileSource_Item(player.HeldItem); } catch (e) { }
    const owner = Number(Terraria.PlayerIndex(player));
    const damage = SummonDamage(player, 20);
    try {
        const index = NewProjectile(source, Terraria.PlayerCenter(player), Vector2.new(0, -1), CachedValkyrieType, damage, 0, owner, 0, 0, 0, null);
        const projectile = index >= 0 ? Terraria.Main.projectile[index] : null;
        if (projectile)
            projectile.originalDamage = 20;
    } catch (e) { }
}

export function AddAerospecClassDamage(player, classKey, amount) {
    const value = Number(amount) || 0;
    if (classKey === 'melee')
        player.meleeDamage = Number(player.meleeDamage || 1) + value;
    else if (classKey === 'ranged')
        player.rangedDamage = Number(player.rangedDamage || 1) + value;
    else if (classKey === 'magic')
        player.magicDamage = Number(player.magicDamage || 1) + value;
    else if (classKey === 'summon')
        player.minionDamage = Number(player.minionDamage || player.summonDamage || 1) + value;
    else if (classKey === 'rogue') {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.RogueDamageBonus += value;
    }
}

export function AddAerospecClassCrit(player, classKey, amount) {
    const value = Number(amount) || 0;
    if (classKey === 'melee')
        player.meleeCrit = Number(player.meleeCrit || 0) + value;
    else if (classKey === 'ranged')
        player.rangedCrit = Number(player.rangedCrit || 0) + value;
    else if (classKey === 'magic')
        player.magicCrit = Number(player.magicCrit || 0) + value;
    else if (classKey === 'rogue') {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.RogueCritBonus += value;
    }
}

export function ApplyAerospecSet(player, classKey) {
    const state = ModPlayer.getByName('CalamityPlayerState');
    if (state && state.IsLocalPlayer(player)) {
        state.AerospecSetActive = true;
        state.AerospecClass = String(classKey || '');
    }

    // Official common set bonus.
    player.noFallDmg = true;
    player.armorEffectDrawShadow = true;
    try {
        const mounted = !!(player.mount && player.mount.Active);
        if (!mounted && player.wet !== true)
            player.maxFallSpeed = 15;
    } catch (e) {
        if (player.wet !== true)
            player.maxFallSpeed = 15;
    }

    if (classKey === 'melee') {
        player.moveSpeed = Number(player.moveSpeed || 0) + 0.05;
        AddAerospecClassCrit(player, 'melee', 5);
        player.aggro = Number(player.aggro || 0) + 300;
    } else if (classKey === 'ranged') {
        player.moveSpeed = Number(player.moveSpeed || 0) + 0.05;
        AddAerospecClassCrit(player, 'ranged', 5);
    } else if (classKey === 'magic') {
        player.moveSpeed = Number(player.moveSpeed || 0) + 0.05;
        AddAerospecClassCrit(player, 'magic', 5);
        player.manaCost = Number(player.manaCost || 1) - 0.08;
    } else if (classKey === 'rogue') {
        player.moveSpeed = Number(player.moveSpeed || 0) + 0.05;
        AddAerospecClassCrit(player, 'rogue', 5);
        if (state && state.IsLocalPlayer(player)) {
            state.WearingRogueArmor = true;
            state.RogueStealthMax = Number(state.RogueStealthMax || 0) + 0.8;
        }
    } else if (classKey === 'summon') {
        player.maxMinions = Number(player.maxMinions || 0) + 1;
        AddAerospecClassDamage(player, 'summon', 0.11);
        EnsureValkyrie(player);
    }
}
