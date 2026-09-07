import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModBuff } from './../../../../TL/ModBuff.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const MushDustType = 59; // Blue Fairy dust
export class MycelialClaws extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/MycelialClaws';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 22;
        this.Item.height = 24;
        this.Item.damage = 28;
        this.Item.melee = true;
        this.Item.noMelee = false;
        this.Item.noUseGraphic = false;
        this.Item.useAnimation = 7;
        this.Item.useTime = 7;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        this.Item.useTurn = true;
        this.Item.knockBack = 3.75;
        this.Item.UseSound = Terraria.ID.SoundID.Item1;
        this.Item.autoReuse = true;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.MenuCategories.push('melee');
    }

    OnHitNPC(item, player, npc, damageDone, knockBack) {
        const mushy = Number(ModBuff.getTypeByName('Mushy') || 0);
        if (mushy > 0) {
            try {
                player.AddBuff(mushy, 360, false);
            } catch (e) {
                try {
                    player['void AddBuff(int type, int time, bool quiet)'](mushy, 360, false);
                } catch (ignored) { }
            }
        }
        if (Terraria.Main.netMode !== 2) {
            for (let i = 0; i < 3; i++) {
                try {
                    const dust = NewDust(npc.position, Math.max(1, Number(npc.width) || 1), Math.max(1, Number(npc.height) || 1), MushDustType, (Math.random() - 0.5) * 1.8, -0.4 - Math.random() * 1.2, 100, Color.White, 0.9);
                    if (dust >= 0)
                        Terraria.Main.dust[dust].noGravity = true;
                } catch (e) { }
            }
        }
    }
}
