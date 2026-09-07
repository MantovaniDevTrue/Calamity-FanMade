import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class SkyfringePickaxe extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Tools/SkyfringePickaxe';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 44;
        i.height = 44;
        i.damage = 12;
        i.knockBack = 2.5;
        i.useTime = 12;
        i.useAnimation = 16;
        i.pick = 105;
        i.tileBoost = 1;
        i.melee = true;
        i.useTurn = true;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        this.MenuCategories.push('tools');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
