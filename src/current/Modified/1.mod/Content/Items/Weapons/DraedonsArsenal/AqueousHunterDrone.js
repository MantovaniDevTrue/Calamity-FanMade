import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { WorldDB } from './../../../../TL/WorldDB.js';
import { OwnerIndex, DroneCount, PrimeDroneShotDamage } from './../../../../Core/DraedonTier1Runtime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function Source(player, item) {
    try { return player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { }
    try { return null; } catch (_) { return null; }
}

export class AqueousHunterDrone extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/DraedonsArsenal/AqueousHunterDrone'; this.ResearchUnlockCount = 1; this._spawnLogged = false; }
    SetStaticDefaults() {
        try { Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type] = true; } catch (_) { }
        // The official item does not define a StaffMinionSlotsRequired gate. Keep this at zero so
        // TLPro's vanilla pre-shoot check cannot reject the custom 4-slot projectile before our
        // ModItem.Shoot callback gets a chance to create it. The live drone still has minionSlots=4.
        try { Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type] = 0; } catch (_) { }
    }
    SetDefaults() {
        // Start from a vanilla summon staff so TLPro receives every native summon-use field that
        // working custom minions (Crimslime/Herring family) rely on, then apply official values.
        this.CloneDefaults(Terraria.ID.ItemID.BabyBirdStaff);
        const i = this.Item;
        i.width = 34; i.height = 32; i.damage = 24; i.summon = true; i.armorPenetration = 15; i.mana = 10;
        i.useTime = 36; i.useAnimation = 36; i.useStyle = Terraria.ID.ItemUseStyleID.HoldUp; i.noMelee = true;
        i.knockBack = 2.25; i.value = Terraria.Item.buyPrice(0, 5, 0, 0); i.rare = Terraria.ID.ItemRarityID.Orange;
        i.autoReuse = true; i.UseSound = Terraria.ID.SoundID.Item44;
        i.buffType = ModBuff.getTypeByName('AqueousHunterDroneBuff');
        // TLPro checks the native shoot projectile before calling custom Shoot(). Point the native
        // pre-check at a harmless vanilla projectile, then cancel it in Shoot() and create the real
        // 4-slot drone manually. This is only a bridge workaround; no vanilla projectile is fired.
        i.shoot = Terraria.ID.ProjectileID.WoodenArrowFriendly; i.shootSpeed = 10;
        this.MenuCategories.push('summon');
    }
    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const pType = Math.floor(N(ModProjectile.getTypeByName('AqueousHunterDroneSummon'), type));
        const bType = Math.floor(N(ModBuff.getTypeByName('AqueousHunterDroneBuff')));
        if (!(pType > 0 && bType > 0)) return false;
        const owner = OwnerIndex(player), pc = Terraria.PlayerCenter(player);
        let mx = N(pc.X); try { mx = N(Terraria.Main.MouseWorld.X, mx); } catch (_) { }
        // The desktop source starts 600 px above because it has a long scripted entry animation.
        // This mobile port uses a compact visible entry instead of leaving the minion offscreen.
        const spawn = Vector2.new(mx, N(pc.Y) - 72);
        const formationIndex = DroneCount(owner, 12);
        const spawnDamage = Math.max(1, Math.floor(N(damage, 24)));
        try { player.AddBuff(bType, 60, false); } catch (_) { }
        let id = -1;
        try {
            id = NewProjectile(Source(player, item), spawn, Vector2.Zero, pType,
                spawnDamage, N(knockBack, 2.25), owner, 0, 0, formationIndex, null);
        } catch (e) {
            try { tl.log(`[CalamityPort DraedonDrone] typed spawn exception: ${e}`); } catch (_) { }
        }
        if (!(id >= 0 && id < 1000)) {
            // One reflection-free recovery attempt at a known safe visible location.
            try {
                const fallback = Vector2.new(N(pc.X) + (N(Terraria.PlayerDirection(player), 1) || 1) * 72, N(pc.Y) - 70);
                id = NewProjectile(null, fallback, Vector2.Zero, pType,
                    spawnDamage, N(knockBack, 2.25), owner, 0, 0, formationIndex, null);
            } catch (_) { id = -1; }
        }
        if (id >= 0 && id < 1000) {
            // NewProjectile can return with the custom minion already normalized by TLPro.
            // Cache the Shoot() damage now so later minion lifecycle writes cannot turn missiles into 1 damage.
            PrimeDroneShotDamage(id, spawnDamage, 24);
        }
        if (!this._spawnLogged) {
            this._spawnLogged = true;
            try { tl.log(`[CalamityPort DraedonDrone] summon request result=${id}; type=${pType}; owner=${owner}; formation=${formationIndex}.`); } catch (_) { }
        }
        return false;
    }
    AddRecipes() {
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('MysteriousCircuitry'), 8)
            .AddIngredient(ModItem.getTypeByName('DubiousPlating'), 4)
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 4)
            .AddIngredient(ModItem.getTypeByName('SeaPrism'), 7)
            .AddCondition(() => !!WorldDB.Instance && WorldDB.get('calamity:draedon:sunkenSeaSchematicFound') === true)
            .AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
