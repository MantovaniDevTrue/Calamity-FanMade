import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModMount } from './../../../TL/ModMount.js';

function MountType() {
    const n = Number(ModMount.getTypeByName('OnyxExcavator'));
    return Number.isFinite(n) ? Math.floor(n) : -1;
}

function IsOurMountActive(player, type) {
    if (!player || type < 0) return false;
    try {
        const mount = player.mount;
        return !!mount && mount._active === true && Number(mount._type) === type;
    } catch (e) { return false; }
}

export class OnyxExcavatorKey extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Mounts/OnyxExcavatorKey';
    }

    SetDefaults() {
        const i = this.Item;
        const type = MountType();
        i.width = 16;
        i.height = 16;
        i.useAnimation = 20;
        i.useTime = 20;
        i.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        i.noMelee = true;
        i.UseSound = Terraria.ID.SoundID.Item23;
        i.value = Terraria.Item.sellPrice(0, 5, 0, 0);
        i.rare = 8;
        i.autoReuse = false;
        if (type >= 0) i.mountType = type;
    }

    // The native Terraria mount-item path handles the initial summon through
    // item.mountType. Once mounted, do not let repeated mobile attack presses
    // re-use the key. The raw controlUseItem input is still available to the
    // mount's drill code, so holding attack only excavates.
    CanUseItem(item, player) {
        const type = MountType();
        return type >= 0 && !IsOurMountActive(player, type);
    }
}
