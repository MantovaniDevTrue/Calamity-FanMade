import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class AbyssalTome extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/AbyssalTome';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 28;
        i.height = 30;
        i.damage = 22;
        i.magic = true;
        i.mana = 15;
        i.useTime = 25;
        i.useAnimation = 25;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 6;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.UseSound = Terraria.ID.SoundID.Item17;
        i.autoReuse = true;
        i.shoot = ModProjectile.getTypeByName('AbyssBall');
        i.shootSpeed = 9;
        this.MenuCategories.push('magic');
    }
}
