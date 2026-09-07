import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class WulfrumFusionCannon extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Wulfrum/WulfrumFusionCannon';
        this.ResearchUnlockCount = 0;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 34;
        item.height = 42;
        item.maxStack = 1;
        item.damage = 6;
        item.armorPenetration = 10;
        item.summon = true;
        item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        item.noMelee = true;
        item.knockBack = 2;
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.UseSound = Terraria.ID.SoundID.Item91;
        item.autoReuse = true;
        item.shoot = ModProjectile.getTypeByName('WulfrumFusionBolt');
        item.shootSpeed = 18;
        item.useTime = 27;
        item.useAnimation = 27;
        item.value = 0;
    }

    CanUseItem(item, player) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        return !!(state && state.IsWulfrumBastionCannonReady(player));
    }

    HoldItem(item, player) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (!state || !state.IsWulfrumBastionCannonReady(player)) {
            try {
                item.TurnToAir(false);
            } catch (e) { }
        }
    }

    UpdateInventory(item, player) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player) && !state.IsWulfrumBastionActive()) {
            try {
                item.TurnToAir(false);
            } catch (e) { }
        }
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const projectileType = Number(ModProjectile.getTypeByName('WulfrumFusionBolt') || 0);
        if (!(projectileType > 0))
            return false;
        let baseVelocity = velocity;
        const speed = Math.sqrt(Number(velocity.X) ** 2 + Number(velocity.Y) ** 2);
        if (!(speed > 0.01))
            baseVelocity = Vector2.new((Number(Terraria.PlayerDirection(player)) || 1) * 18, 0);
        const source = player.GetProjectileSource_Item(item);
        for (const spread of [-0.055, 0, 0.055]) {
            const shotVelocity = Vector2.RotatedBy(baseVelocity, spread);
            const index = NewProjectile(source, position, shotVelocity, projectileType, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
            if (index >= 0) {
                const projectile = Terraria.Main.projectile[index];
                if (projectile) {
                    projectile.originalDamage = item.damage;
                    try {
                        projectile.armorPenetration = 10;
                    } catch (e) { }
                }
            }
        }
        Terraria.SetPlayerDirection(player, Number(baseVelocity.X) < 0 ? -1 : 1);
        return false;
    }
}
