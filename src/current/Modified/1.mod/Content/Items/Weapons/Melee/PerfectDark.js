import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';

export class PerfectDark extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/PerfectDark';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 50;
        this.Item.height = 50;
        this.Item.damage = 29;
        this.Item.melee = true;
        this.Item.useAnimation = 24;
        this.Item.useTime = 24;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        this.Item.useTurn = true;
        this.Item.knockBack = 4.25;
        this.Item.UseSound = Terraria.ID.SoundID.Item1;
        this.Item.autoReuse = true;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.Item.shoot = ModProjectile.getTypeByName('DarkBall');
        this.Item.shootSpeed = 14.5;
        this.MenuCategories.push('melee');
    }

    OnHitNPC(item, player, npc) {
        const buff = Number(ModBuff.getTypeByName('BrainRot') || 0);
        if (buff > 0)
            try {
                npc.AddBuff(buff, 300, false);
            } catch (e) { }
    }
}
