import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';

export class VeinBurster extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/VeinBurster';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 50;
        i.height = 52;
        i.damage = 45;
        i.melee = true;
        i.useTime = 41;
        i.useAnimation = 41;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.knockBack = 5.5;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('BloodBall');
        i.shootSpeed = 16;
        this.MenuCategories.push('melee');
    }

    OnHitNPC(item, player, npc) {
        const b = Number(ModBuff.getTypeByName('BurningBlood') || 0);
        if (b > 0)
            try {
                npc.AddBuff(b, 300, false);
            } catch (e) { }
    }
}
