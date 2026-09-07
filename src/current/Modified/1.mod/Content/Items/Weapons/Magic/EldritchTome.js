import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../../Core/FusionEntityData.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function rotate(v, a, m = 1) {
    const c = Math.cos(a), s = Math.sin(a);
    return Vector2.new((Number(v.X) * c - Number(v.Y) * s) * m, (Number(v.X) * s + Number(v.Y) * c) * m);
}

export class EldritchTome extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/EldritchTome';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 28;
        i.height = 30;
        i.damage = 32;
        i.magic = true;
        i.crit = 5;
        i.mana = 13;
        i.useTime = 7;
        i.useAnimation = 21;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 3.5;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.UseSound = Terraria.ID.SoundID.Item103;
        i.autoReuse = true;
        i.shoot = ModProjectile.getTypeByName('EldritchTentacle');
        i.shootSpeed = 12;
        this.MenuCategories.push('magic');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const p = Number(ModProjectile.getTypeByName('EldritchTentacle') || 0);
        if (!(p > 0))
            return false;
        const v = rotate(velocity, (Math.random() - 0.5) * (36 * Math.PI / 180), 0.8 + Math.random() * 0.4), ax = (0.01 + Math.random() * 0.04) * (Math.random() < 0.5 ? -1 : 1), ay = (0.01 + Math.random() * 0.04) * (Math.random() < 0.5 ? -1 : 1);
        const idx = NewProjectile(player.GetProjectileSource_Item(item), position, v, p, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        if (idx >= 0) {
            const proj = Terraria.Main.projectile[idx];
            if (proj) {
                const s = FusionEntityData.GetProjectileBag(proj, 'eldritch', () => ({ life: 0, ax: 0, ay: 0 }));
                s.ax = ax;
                s.ay = ay;
            }
        }
        return false;
    }
}
