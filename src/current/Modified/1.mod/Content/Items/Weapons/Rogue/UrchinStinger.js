import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import {
    ConsumeStealthStrike,
    MarkRogueProjectile,
    MarkStealthStrike,
    Rotate
} from './../../../../Core/RogueRuntime.js';

const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function projectileSource(player, item) {
    try {
        return player['IEntitySource GetProjectileSource_Item(Item item)'](item);
    } catch (e) {
        return null;
    }
}

function spawn(source, owner, position, velocity, type, damage, knockBack, stealth) {
    const index = NewProjectile(
        source,
        position,
        velocity,
        Number(type),
        Math.max(1, Math.floor(Number(damage))),
        Number(knockBack) || 0,
        owner,
        0,
        0,
        0,
        null
    );

    if (!(index >= 0 && index < 1000))
        return;

    const projectile = Terraria.Main.projectile[index];
    MarkRogueProjectile(projectile, 'UrchinStinger', false);
    if (stealth)
        MarkStealthStrike(projectile, 'UrchinStinger', false);
}

export class UrchinStinger extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/UrchinStinger';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const item = this.Item;
        item.width = 10;
        item.height = 32;
        item.damage = 13;
        item.melee = false;
        item.ranged = false;
        item.magic = false;
        item.summon = false;
        item.noMelee = true;
        item.noUseGraphic = true;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.useTime = 17;
        item.useAnimation = 17;
        item.knockBack = 1.5;
        item.UseSound = Terraria.ID.SoundID.Item1;
        item.autoReuse = true;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
        item.shoot = ModProjectile.getTypeByName('UrchinStingerProj');
        item.shootSpeed = 12;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const source = projectileSource(player, item);
        const owner = Terraria.PlayerIndex(player);
        const stealth = ConsumeStealthStrike(player, item);

        if (stealth) {
            spawn(source, owner, position, velocity, type, damage, knockBack, true);
            return false;
        }

        const spread = 23 * Math.PI / 180;
        const left = Rotate(velocity, (Math.random() * 2 - 1) * spread, .6);
        const right = Rotate(velocity, (Math.random() * 2 - 1) * spread, .8);
        const halfDamage = Math.max(1, Math.floor(Number(damage) * .5));

        spawn(source, owner, position, velocity, type, damage, knockBack, false);
        spawn(source, owner, position, left, type, halfDamage, knockBack, false);
        spawn(source, owner, position, right, type, halfDamage, knockBack, false);
        return false;
    }
}
