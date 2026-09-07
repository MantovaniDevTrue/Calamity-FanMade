import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { WorldDB } from './../../../TL/WorldDB.js';

const DrawAnimationVertical = new NativeClass('Terraria.DataStructures', 'DrawAnimationVertical');

export class UnstableGraniteCore extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/UnstableGraniteCore';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        // Keep the official 46x240 spritesheet as a normal Terraria item
        // texture and let DrawAnimationVertical select one 46x48 frame.
        // tl.texture.loadAnimation animates the asset itself and leaves the
        // inventory renderer treating the full sheet as one oversized icon.
        const animation = DrawAnimationVertical.new();
        animation.Frame = 0;
        animation.FrameCounter = 0;
        animation.FrameCount = 5;
        animation.TicksPerFrame = 7;
        animation.PingPong = false;
        Terraria.Main.RegisterItemAnimation(this.Type, animation);
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 46;
        item.height = 48;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 25, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.accessory = true;
        this.MenuCategories.push('accessory');
    }

    PostSetupContent() {
        try {
            const sets = Terraria.ID.ItemID.Sets;
            const needed = Number(this.Type) + 1;
            if (sets.AnimatesAsSoul && Number(sets.AnimatesAsSoul.length) < needed)
                sets.AnimatesAsSoul = sets.AnimatesAsSoul.cloneResized(needed);
            if (sets.AnimatesAsSoul)
                sets.AnimatesAsSoul[this.Type] = true;
        } catch (e) { }
    }

    UpdateInventory(item, player) {
        try {
            if (Terraria.Main.netMode !== 1 && WorldDB.Instance && WorldDB.get('calamity:unlock:unstableGraniteCore') !== true)
                WorldDB.set('calamity:unlock:unstableGraniteCore', true);
        } catch (e) { }
    }

    UpdateAccessory(item, player, hideVisual) {
        const controller = ModPlayer.getByName('GraniteShrineAccessoryPlayer');
        if (controller)
            controller.EnableUnstableCore(player);
    }
}
