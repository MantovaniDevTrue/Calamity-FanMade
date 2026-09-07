import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class StormSurge extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/StormSurge';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 58;
        i.height = 22;
        i.damage = 18;
        i.ranged = true;
        i.useTime = 18;
        i.useAnimation = 18;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 5;
        i.UseSound = Terraria.ID.SoundID.Item122;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Green;
        i.autoReuse = true;
        i.shoot = ModProjectile.getTypeByName('StormSurgeTornado');
        i.shootSpeed = 12;
        this.MenuCategories.push('ranged');
    }

    HoldoutOffset() { return { X: -10, Y: 0 }; }

    AddRecipes() {
        const mandible = Number(ModItem.getTypeByName('StormlionMandible') || 0);
        const pearl = Number(ModItem.getTypeByName('PearlShard') || 0);
        const prism = Number(ModItem.getTypeByName('SeaPrism') || 0);
        const navi = Number(ModItem.getTypeByName('Navystone') || 0);
        if (!(mandible > 0 && pearl > 0 && prism > 0 && navi > 0)) return;
        this.CreateRecipe()
            .AddIngredient(mandible, 1)
            .AddIngredient(pearl, 3)
            .AddIngredient(prism, 7)
            .AddIngredient(navi, 10)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
