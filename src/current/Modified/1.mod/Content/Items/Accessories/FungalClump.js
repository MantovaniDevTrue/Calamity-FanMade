import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FindOrCacheFungalClump, RegisterFungalClump, SetFungalClumpMode } from './../../../Core/FungalClumpRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const BaseDamage = 10;
function ApplyBestClassModifier(player, baseDamage) {
    let multiplier = 1;
    try {
        const value = Number(player.meleeDamage);
        if (Number.isFinite(value))
            multiplier = Math.max(multiplier, value);
    } catch (e) { }
    try {
        const value = Number(player.rangedDamage);
        if (Number.isFinite(value))
            multiplier = Math.max(multiplier, value);
    } catch (e) { }
    try {
        const value = Number(player.magicDamage);
        if (Number.isFinite(value))
            multiplier = Math.max(multiplier, value);
    } catch (e) { }
    try {
        const value = Number(player.minionDamage);
        if (Number.isFinite(value))
            multiplier = Math.max(multiplier, value);
    } catch (e) { }
    return Math.max(1, Math.floor(baseDamage * multiplier));
}

function ArmorItemAt(armor, index) {
    try {
        return armor.get_Item(index);
    } catch (e) { }
    try {
        return armor[index];
    } catch (e) { }
    return null;
}

function HasFunctionalCopy(player, itemType) {
    try {
        const armor = player.armor;
        if (!armor)
            return false;
        for (let i = 3; i <= 9; i++) {
            const equipped = ArmorItemAt(armor, i);
            if (equipped && Number(equipped.type) === Number(itemType))
                return true;
        }
    } catch (e) { }
    return false;
}

function EnsureBuff(player, buffType) {
    let found = -1;
    try {
        found = Number(player.FindBuffIndex(buffType));
    } catch (e) { }
    if (!(found >= 0)) {
        try {
            player.AddBuff(buffType, 3600, false);
        } catch (e) {
            try {
                player.AddBuff(buffType, 3600);
            } catch (ignored) { }
        }
    }
}

function ApplyMode(proj, vanityOnly, damage) {
    if (!proj)
        return;
    const ai = new ProjAI(proj);
    const mode = vanityOnly ? 1 : 0;
    const finalDamage = vanityOnly ? 0 : damage;
    const changed = Number(ai[0]) !== mode || Number(proj.damage) !== Number(finalDamage);
    proj.timeLeft = 3;
    if (!changed)
        return;
    if (Number(ai[0]) !== mode)
        ai[0] = mode; // Native mirror
    SetFungalClumpMode(proj, vanityOnly); // JS state
    proj.damage = finalDamage;
    proj.originalDamage = BaseDamage;
    proj.friendly = false; // Manual contact damage
    proj.hostile = false;
    proj.minion = false;
    proj.minionSlots = 0;
    try {
        proj.netUpdate = true;
    } catch (e) { }
}

function EnsureClump(item, player, requestedVanity) {
    const buffType = Number(ModBuff.getTypeByName('FungalClumpBuff') || 0);
    const clumpType = Number(ModProjectile.getTypeByName('FungalClumpMinion') || 0);
    if (!(buffType > 0 && clumpType > 0) || !player || !player.active || player.dead)
        return;
    const vanityOnly = requestedVanity === true && !HasFunctionalCopy(player, item.type);
    EnsureBuff(player, buffType);
    const damage = vanityOnly ? 0 : ApplyBestClassModifier(player, BaseDamage);
    const existing = FindOrCacheFungalClump(Terraria.PlayerIndex(player), clumpType);
    if (existing) {
        ApplyMode(existing, vanityOnly, damage);
        return;
    }
    if (Number(Terraria.PlayerIndex(player)) !== Number(Terraria.Main.myPlayer))
        return;
    let source = null;
    try {
        source = player.GetProjectileSource_Item(item);
    } catch (e) { }
    if (!source) {
        try {
            source = player.GetProjectileSource_Item(player.HeldItem);
        } catch (e) { }
    }
    const index = NewProjectile(source, Terraria.PlayerCenter(player), Vector2.new(0, -1), clumpType, damage, 1, Terraria.PlayerIndex(player), vanityOnly ? 1 : 0, 0, 0, null);
    if (Number(index) >= 0) {
        const proj = Terraria.Main.projectile[index];
        if (proj) {
            RegisterFungalClump(proj);
            ApplyMode(proj, vanityOnly, damage);
        }
    }
}

export class FungalClump extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/FungalClump';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 38;
        this.Item.height = 42;
        this.Item.maxStack = 1;
        this.Item.accessory = true;
        this.Item.expert = true;
        this.Item.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        EnsureClump(item, player, false);
    }

    UpdateVanityAccessory(item, player) {
        EnsureClump(item, player, true);
    }
}
