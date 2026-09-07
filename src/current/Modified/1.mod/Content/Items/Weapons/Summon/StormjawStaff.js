import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function N(v, f = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
}

function Source(player, item) {
    try { return player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { }
    try { return null; } catch (_) { return null; }
}

function ProjectileAt(index) {
    try { return Terraria.Main.projectile.get_Item(Math.floor(N(index, -1))); } catch (_) { return null; }
}

export class StormjawStaff extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/StormjawStaff';
        this.ResearchUnlockCount = 1;
        this._spawnLogged = false;
    }

    SetStaticDefaults() {
        try { Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type] = true; } catch (_) { }
        // Voltei pro caminho normal de cajado de summon que já funciona nos outros minions do port.
        try { Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type] = 1; } catch (_) { }
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 32;
        i.height = 32;
        i.damage = 11;
        i.summon = true;
        i.mana = 10;
        i.useAnimation = 36;
        i.useTime = 36;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.noMelee = true;
        i.knockBack = 2;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Green;
        i.UseSound = Terraria.ID.SoundID.NPCDeath14;
        i.autoReuse = true;
        i.buffType = ModBuff.getTypeByName('BabyStormlionBuff');
        i.shoot = ModProjectile.getTypeByName('StormjawBaby');
        i.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    ModifyShootStats(item, player, stats) {
        try {
            const mouse = Terraria.Main.MouseWorld;
            if (mouse && Number.isFinite(N(mouse.X, NaN)) && Number.isFinite(N(mouse.Y, NaN)))
                stats.position = Vector2.new(N(mouse.X), N(mouse.Y) - 12);
            else
                stats.position = Terraria.PlayerCenter(player);
        } catch (_) {
            stats.position = Terraria.PlayerCenter(player);
        }
        stats.velocity = Vector2.Zero;
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const projectileType = Number(ModProjectile.getTypeByName('StormjawBaby') || type || 0);
        const buffType = Number(ModBuff.getTypeByName('BabyStormlionBuff') || 0);
        if (!(projectileType > 0 && buffType > 0))
            return false;

        try { player.AddBuff(buffType, 2, false); } catch (_) { }

        let spawn = position;
        if (!spawn) {
            try { spawn = Terraria.Main.MouseWorld; } catch (_) { }
        }
        if (!spawn)
            spawn = Terraria.PlayerCenter(player);

        // No TLPro o argumento `damage` do Shoot pode chegar como 0 para alguns itens summon.
        // Se eu aceitar esse 0 e só limitar para >= 1, o minion nasce permanentemente com 1 de dano.
        // Usa o dano calculado quando ele for valido; caso contrario cai para o dano real do item.
        const shootDamage = N(damage, 0);
        const itemDamage = Math.max(1, Math.floor(N(item.damage, 11)));
        const spawnDamage = Math.max(1, Math.floor(shootDamage > 0 ? shootDamage : itemDamage));
        let id = -1;
        try {
            id = NewProjectile(
                Source(player, item),
                spawn,
                Vector2.Zero,
                projectileType,
                spawnDamage,
                N(knockBack, 2),
                Terraria.PlayerIndex(player),
                0, 0, 0,
                null
            );
        } catch (e) {
            try { tl.log(`[CalamityPort Stormjaw] summon spawn failed: ${e}`); } catch (_) { }
        }

        const projectile = ProjectileAt(id);
        if (projectile) {
            projectile.originalDamage = N(item.damage, 11);
            projectile.damage = spawnDamage;
            projectile.minionSlots = 1;
            projectile.tileCollide = false;
            projectile.netUpdate = true;
        }

        if (!this._spawnLogged) {
            this._spawnLogged = true;
            try { tl.log(`[CalamityPort Stormjaw] summon request result=${id}; type=${projectileType}; buff=${buffType}; owner=${Terraria.PlayerIndex(player)}.`); } catch (_) { }
        }
        return false;
    }
}
