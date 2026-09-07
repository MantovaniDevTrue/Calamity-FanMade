import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class AerialHamaxe extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Tools/AerialHamaxe';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 44;
        i.height = 44;
        i.damage = 20;
        i.knockBack = 7;
        i.useTime = 16;
        i.useAnimation = 26;
        i.hammer = 70;
        i.axe = 25;
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
