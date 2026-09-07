import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { NPCLoader } from './../../../TL/Loaders/NPCLoader.js';
import { AcidRainTier1Runtime } from './../../../Core/AcidRainTier1Runtime.js';

const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
function Tell(text, r, g, b) {
    try {
        NewText(String(text), r, g, b);
    } catch (e) { }
}
function Tick() {
    try { return Math.max(0, Math.floor(Number(Terraria.Main.GameUpdateCount) || 0)); }
    catch (_) { return 0; }
}

function SyncRippers(enabled) {
    try {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (!state) return;
        if (typeof state.SetRippersEnabled === 'function') {
            state.SetRippersEnabled(enabled === true);
            return;
        }
        state.RageUnlocked = enabled === true;
        state.AdrenalineUnlocked = enabled === true;
        state.RageScanTimer = 0;
    } catch (_) { }
}

function DifficultyChangeBlocked() {
    // I keep difficulty fixed during active fights/events so it cannot be swapped mid-encounter.
    try {
        if (NPCLoader.AnyBossActive === true)
            return 'boss';
    } catch (_) { }

    try {
        if (Terraria.Main.invasionType > 0 || AcidRainTier1Runtime.Active === true)
            return 'event';
        if (Terraria.Main.bloodMoon || Terraria.Main.eclipse || Terraria.Main.pumpkinMoon || Terraria.Main.snowMoon)
            return 'event';
    } catch (_) { }

    try {
        if (Terraria.GameContent.Events.DD2Event.Ongoing)
            return 'event';
    } catch (_) { }

    return '';
}

export class DeathModeToggle extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Tools/DeathModeToggle';
        this.MenuCategories = ['Calamity'];
        this.ResearchUnlockCount = 0;
        this.LastToggleTick = -1000;
    }

    SetDefaults() {
        this.Item.width = 40;
        this.Item.height = 40;
        this.Item.useAnimation = 35;
        this.Item.useTime = 35;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        this.Item.noMelee = true;
        this.Item.autoReuse = false;
        this.Item.consumable = false;
        this.Item.maxStack = 1;
        this.Item.rare = Terraria.ID.ItemRarityID.Red;
        this.Item.value = 0;
    }

    CanUseItem(item, player) {
        const world = ModSystem.getByName('CalamityWorldState');
        return Terraria.PlayerIndex(player) === Terraria.Main.myPlayer && !!(world && world.Loaded && world.SetRevengeanceMode && world.SetDeathMode);
    }

    UseItem(item, player) {
        if (Terraria.PlayerIndex(player) !== Terraria.Main.myPlayer)
            return false;

        // TLPro can call UseItem more than once during the same use animation. Without this
        // guard a single tap can cycle Revengeance -> Death -> Normal and finish where it started.
        const tick = Tick();
        if (tick - this.LastToggleTick < 45)
            return false;
        this.LastToggleTick = tick;

        const world = ModSystem.getByName('CalamityWorldState');
        if (!world || !world.SetRevengeanceMode || !world.SetDeathMode) {
            Tell('A dificuldade do Calamity não pôde ser alterada neste mundo.', 255, 100, 100);
            return false;
        }

        const blocked = DifficultyChangeBlocked();
        if (blocked) {
            Tell(blocked === 'boss'
                ? 'Não é possível alterar o Modo Calamity durante uma batalha contra chefe.'
                : 'Não é possível alterar o Modo Calamity durante um evento ou invasão.', 255, 120, 90);
            try { tl.log(`[CalamityPort Difficulty] selector blocked reason=${blocked}.`); } catch (_) { }
            return false;
        }

        // Um item só controla os três estados para não ocupar mais slots nem criar outro sistema.
        if (world.DeathMode === true) {
            world.SetRevengeanceMode(false);
            SyncRippers(false);
            Tell('Modo Calamity: NORMAL.', 190, 190, 190);
        } else if (world.RevengeanceMode === true) {
            world.SetDeathMode(true);
            SyncRippers(true);
            Tell('Modo Calamity: DEATH MODE. Rage e Adrenalina habilitadas.', 255, 85, 85);
        } else {
            world.SetRevengeanceMode(true);
            SyncRippers(true);
            Tell('Modo Calamity: REVENGEANCE. Rage e Adrenalina habilitadas.', 255, 170, 60);
        }
        try {
            tl.log(`[CalamityPort Difficulty] selector mode=${world.DeathMode === true ? 'death' : world.RevengeanceMode === true ? 'revengeance' : 'normal'}; revengeance=${world.RevengeanceMode === true}; death=${world.DeathMode === true}.`);
        } catch (_) { }
        return true;
    }
}
