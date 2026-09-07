import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class Aorta extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/Aorta';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.Yoyo[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ItemID.Sets.GamepadExtraRange[this.Type] = 15;
        } catch (e) { }
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 30;
        i.height = 26;
        i.damage = 31;
        i.melee = true;
        i.knockBack = 4.25;
        i.useTime = 22;
        i.useAnimation = 22;
        i.autoReuse = true;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.channel = true;
        i.noUseGraphic = true;
        i.noMelee = true;
        i.shoot = ModProjectile.getTypeByName('AortaYoyo');
        i.shootSpeed = 8;
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.MenuCategories.push('melee');
    }
}
