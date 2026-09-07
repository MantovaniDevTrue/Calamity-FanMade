import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModNPC } from './../../../TL/ModNPC.js';

function Play(position) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](15, position, 1, 0);
    } catch (e) { }
}

export class Teratoma extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/SummonItems/Teratoma';
        this.BossType = -1;
    }

    SetStaticDefaults() {
    }

    SetDefaults() {
        this.Item.width = 28;
        this.Item.height = 18;
        this.Item.rare = 3;
        this.Item.useAnimation = 10;
        this.Item.useTime = 10;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        this.Item.consumable = false;
        this.Item.maxStack = 1;
        this.Item.value = 0;
    }

    PostSetupContent() {
        this.BossType = ModNPC.getTypeByName('HiveMind');
    }

    CanUseItem(item, player) {
        if (!(this.BossType > 0))
            this.BossType = ModNPC.getTypeByName('HiveMind');
        return player.ZoneCorrupt === true && this.BossType > 0 && !Terraria.NPC.AnyNPCs(this.BossType);
    }

    UseItem(item, player) {
        if (Terraria.PlayerIndex(player) !== Terraria.Main.myPlayer || !(this.BossType > 0))
            return false;
        Play(Terraria.PlayerTopLeft(player));
        Terraria.NPC.SpawnOnPlayer(Terraria.PlayerIndex(player), this.BossType, 0, 0, 0, 0);
        return true;
    }
    AddRecipes() {
        this.CreateRecipe().AddIngredient(57, 3).AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7).AddIngredient(68, 13).AddTile(26).Register();
    }
}
