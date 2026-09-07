import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

const { Rand, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class HyphaeRod extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/HyphaeRod';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.Item.staff[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.AmethystStaff);
        this.Item.width = 34;
        this.Item.height = 34;
        this.Item.damage = 22;
        this.Item.magic = true;
        this.Item.mana = 10;
        this.Item.useAnimation = 24;
        this.Item.useTime = 24;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 2;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.UseSound = Terraria.ID.SoundID.Item8;
        this.Item.autoReuse = true;
        this.Item.shoot = Terraria.ID.ProjectileID.TruffleSpore;
        this.Item.shootSpeed = 1;
        this.MenuCategories.push('magic');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const projectileType = Number(Terraria.ID.ProjectileID.TruffleSpore);
        if (!(projectileType > 0))
            return false;
        let mouse = null;
        try {
            mouse = Terraria.Main.MouseWorld;
        } catch (e) { }
        if (!mouse || !Number.isFinite(Number(mouse.X)) || !Number.isFinite(Number(mouse.Y))) {
            const fallbackDirection = Number(Terraria.PlayerDirection(player)) || 1;
            mouse = Vector2.new(Number(Terraria.PlayerCenterX(player)) + fallbackDirection * 160, Number(Terraria.PlayerCenterY(player)));
        }
        const playerDirection = Number(Terraria.PlayerDirection(player)) || 1;
        const playerCenterX = Number(Terraria.PlayerCenterX(player)) || 0;
        const playerPositionX = Number(Terraria.PlayerPositionX(player)) || 0;
        const mountedCenterY = Number(player.MountedCenter.Y) || Number(Terraria.PlayerCenterY(player)) || 0;
        const mouseX = Number(mouse.X) || playerCenterX;
        const mouseY = Number(mouse.Y) || mountedCenterY;
        const source = player.GetProjectileSource_Item(item);
        for (let projIndex = 0; projIndex < 3; projIndex++) {
            let sourceX = playerCenterX
                + Rand.NextInt(0, 201) * -playerDirection
                + (mouseX - playerPositionX);
            sourceX = (sourceX + playerCenterX) * 0.5 + Rand.NextInt(-100, 101);
            const sourceY = mountedCenterY - 50 * projIndex;
            let vx = mouseX - sourceX;
            let vy = mouseY - sourceY;
            if (vy < 0)
                vy *= -1;
            if (vy < 20)
                vy = 20;
            const length = Math.sqrt(vx * vx + vy * vy);
            const scale = length > 0.001 ? Number(item.shootSpeed) / length : 0;
            vx = vx * scale + Rand.NextInt(-180, 181) * 0.02;
            vy = vy * scale + Rand.NextInt(-180, 181) * 0.02;
            const spawned = NewProjectile(source, Vector2.new(sourceX, sourceY), Vector2.new(vx, vy), projectileType, damage, knockBack, Terraria.PlayerIndex(player), 0, Rand.NextInt(0, 3), 0, null);
            if (spawned >= 0 && spawned < 1000) {
                try {
                    const projectile = Terraria.Main.projectile[spawned];
                    if (projectile) {
                        projectile.friendly = true;
                        projectile.hostile = false;
                        projectile.magic = true;
                        projectile.melee = false;
                        projectile.ranged = false;
                        projectile.timeLeft = 180;
                        projectile.netUpdate = true;
                    }
                } catch (e) { }
            }
        }
        return false;
    }
}
