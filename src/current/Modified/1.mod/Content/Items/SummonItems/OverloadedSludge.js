import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModRecipe } from './../../../TL/ModRecipe.js';

let AnyEvilBlockGroup = null;

export class OverloadedSludge extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/SummonItems/OverloadedSludge';
        this.BossType = -1;
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 20;
        i.height = 20;
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.useAnimation = 10;
        i.useTime = 10;
        i.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        i.consumable = false;
        i.maxStack = 1;
    }

    PostSetupContent() {
        this.BossType = Number(ModNPC.getTypeByName('SlimeGodCore') || -1);
    }

    AddRecipeGroups() {
        if (AnyEvilBlockGroup) return;
        // Official Calamity AnyEvilBlock vanilla members. The Astral/custom members
        // are intentionally omitted until those blocks exist in this port.
        AnyEvilBlockGroup = ModRecipe.CreateRecipeGroup('Any Evil Block', [61, 836, 833, 835, 370, 1246, 3274, 3275, 3276, 3277]);
    }

    AddRecipes() {
        const recipe = this.CreateRecipe().AddIngredient(ModItem.getTypeByName('BlightedGel'), 40);
        if (AnyEvilBlockGroup) recipe.AddRecipeGroup(AnyEvilBlockGroup, 40);
        else recipe.AddIngredient(61, 40);
        recipe.AddTile(Terraria.ID.TileID.DemonAltar).Register();
    }

    CanUseItem(item, player) {
        if (!(this.BossType > 0))
            this.BossType = Number(ModNPC.getTypeByName('SlimeGodCore') || -1);
        return this.BossType > 0 && !Terraria.NPC.AnyNPCs(this.BossType);
    }

    UseItem(item, player) {
        if (Number(Terraria.PlayerIndex(player)) !== Number(Terraria.Main.myPlayer) || !(this.BossType > 0))
            return false;
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](15, Terraria.PlayerTopLeft(player), 1, 0);
        } catch (e) { }
        try {
            Terraria.NPC.SpawnOnPlayer(Terraria.PlayerIndex(player), this.BossType, 0, 0, 0, 0);
            return true;
        } catch (e) {
            return false;
        }
    }
}
