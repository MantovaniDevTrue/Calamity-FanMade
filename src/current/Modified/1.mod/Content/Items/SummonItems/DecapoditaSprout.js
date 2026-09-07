import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModNPC } from './../../../TL/ModNPC.js';

function PlaySound(id, position, style = 1, pitch = 0) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](id, position, style, pitch);
    } catch (e) { }
}

export class DecapoditaSprout extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/SummonItems/DecapoditaSprout';
        this.BossType = -1;
    }

    SetStaticDefaults() {
    }

    SetDefaults() {
        this.Item.width = 28;
        this.Item.height = 18;
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.useAnimation = 10;
        this.Item.useTime = 10;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        this.Item.consumable = false;
        this.Item.maxStack = 1;
        this.Item.value = 0;
    }

    PostSetupContent() {
        this.BossType = ModNPC.getTypeByName('Crabulon');
    }

    CanUseItem(item, player) {
        if (!(this.BossType > 0))
            this.BossType = ModNPC.getTypeByName('Crabulon');
        const underground = Number(Terraria.PlayerPositionY(player)) / 16 > Number(Terraria.Main.worldSurface);
        return player.ZoneGlowshroom === true && underground && this.BossType > 0 && !Terraria.NPC.AnyNPCs(this.BossType);
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(Terraria.ID.ItemID.GlowingMushroom, 50)
            .AddTile(Terraria.ID.TileID.DemonAltar)
            .Register();
    }

    UseItem(item, player) {
        if (Terraria.PlayerIndex(player) !== Terraria.Main.myPlayer || !(this.BossType > 0))
            return false;
        PlaySound(15, Terraria.PlayerTopLeft(player), 1, 0);
        const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
        const x = Math.floor(Number(Terraria.PlayerPositionX(player)) + Math.floor(Math.random() * 321) - 160);
        const y = Math.floor(Number(Terraria.PlayerPositionY(player)) - 320);
        const index = Terraria.NPC.NewNPC(source, x, y, this.BossType, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
        if (index >= 0 && index < 200) {
            const boss = Terraria.Main.npc[index];
            boss.target = Terraria.PlayerIndex(player);
            boss.netUpdate = true;
        }
        return true;
    }
}
