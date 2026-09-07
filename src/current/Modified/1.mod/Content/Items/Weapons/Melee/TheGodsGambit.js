import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

function setArray(holder, name, index, value) {
    try {
        let array = holder[name];
        const needed = Number(index) + 1;
        if (Number(array.length) < needed) {
            array = array.cloneResized(needed);
            holder[name] = array;
        }
        array[Number(index)] = value;
        return true;
    } catch (e) {
        return false;
    }
}

export class TheGodsGambit extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/TheGodsGambit';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        setArray(Terraria.ID.ItemID.Sets, 'Yoyo', this.Type, true);
        setArray(Terraria.ID.ItemID.Sets, 'GamepadExtraRange', this.Type, 15);
        setArray(Terraria.ID.ItemID.Sets, 'GamepadSmartQuickReach', this.Type, true);
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 36;
        i.height = 38;
        i.damage = 28;
        i.melee = true;
        i.knockBack = 3.5;
        i.useTime = 21;
        i.useAnimation = 21;
        i.autoReuse = true;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.channel = true;
        i.noUseGraphic = true;
        i.noMelee = true;
        i.shoot = ModProjectile.getTypeByName('GodsGambitYoyo');
        i.shootSpeed = 10;
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.value = Terraria.Item.buyPrice(0, 10, 0, 0);
        this.MenuCategories.push('melee');
    }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),18).AddIngredient(ModItem.getTypeByName('BlightedGel'),18).AddTile(220).Register();
    }
}
