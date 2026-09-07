import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModBuff } from './../../../../TL/ModBuff.js';

export class TeardropCleaver extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Melee/TeardropCleaver'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const i = this.Item;
        i.width = 54; i.height = 76; i.damage = 33; i.melee = true;
        i.useAnimation = 24; i.useTime = 24; i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.useTurn = true; i.knockBack = 5.5; i.UseSound = Terraria.ID.SoundID.Item1; i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0); i.rare = Terraria.ID.ItemRarityID.Green;
        this.MenuCategories.push('melee');
    }
    OnHitNPC(item, player, npc) {
        const type = Number(ModBuff.getTypeByName('TemporalSadness') || 0);
        if (!(type > 0) || !npc) return;
        try { npc.AddBuff(type, 60, false); } catch (_) { try { npc['void AddBuff(int type, int time, bool quiet)'](type, 60, false); } catch (__) { } }
    }
}
