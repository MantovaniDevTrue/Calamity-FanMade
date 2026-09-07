import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { AcidRainTier1Runtime } from './../../../../Core/AcidRainTier1Runtime.js';

const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];

function Tell(key, r, g, b) {
    try {
        const text = ModLocalization.Translate(key, true, false) || key;
        NewText(String(text), r, g, b);
    } catch (_) { }
}

export class BrokenWaterFilter extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Tools/SpawnBlocker/BrokenWaterFilter';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 32;
        i.height = 34;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Blue;
        i.useAnimation = 20;
        i.useTime = 20;
        i.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        i.UseSound = Terraria.ID.SoundID.Item4;
        i.consumable = false;
        i.autoReuse = false;
        this.MenuCategories.push('tool');
    }

    UseItem() {
        const blocked = AcidRainTier1Runtime.ToggleNaturalBlocked();
        Tell(blocked ? 'Messages.AcidRainNaturalBlocked' : 'Messages.AcidRainNaturalAllowed', blocked ? 190 : 115, blocked ? 220 : 194, blocked ? 255 : 147);
        try { tl.log(`[CalamityPort AcidRain] Broken Water Filter natural-spawn blocker=${blocked}.`); } catch (_) { }
        return true;
    }
}
