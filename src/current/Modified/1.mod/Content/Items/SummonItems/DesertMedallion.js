import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModRecipe } from './../../../TL/ModRecipe.js';
import { AndroidSound } from './../../../Common/Snippets/AndroidSound.js';

let SandRecipeGroup = null;

function PlayOfficialSummonSound(player) {
    if (!player || Terraria.Main.netMode === 2)
        return false;
    try {
        const gameVolume = Number(Terraria.Main.soundVolume);
        const volume = Number.isFinite(gameVolume) ? Math.max(0, Math.min(1, gameVolume)) : 1.0;
        const center = Terraria.PlayerCenter(player);
        const result = AndroidSound.PlayCachedExclusive(
            'desert-scourge-summon',
            'Common/Sounds/DesertScourgeSummon.ogg',
            volume,
            Number(center.X),
            Number(center.Y),
            1800,
            180,
            10,
            false
        );
        return !!(result && (result.ok || result.skipped));
    } catch (e) {
        return false;
    }
}
export class DesertMedallion extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/SummonItems/DesertMedallion';
        this.BossType = -1;
    }

    SetStaticDefaults() {
    }

    SetDefaults() {
        this.Item.width = 28;
        this.Item.height = 28;
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.useAnimation = 10;
        this.Item.useTime = 10;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        this.Item.consumable = false;
        this.Item.maxStack = 1;
        this.Item.value = 0;
    }

    PostSetupContent() {
        this.BossType = ModNPC.getTypeByName('DesertScourgeHead');
    }

    AddRecipeGroups() {
        if (SandRecipeGroup)
            return;
        const sandTypes = [
            Terraria.ID.ItemID.SandBlock,
            Terraria.ID.ItemID.EbonsandBlock,
            Terraria.ID.ItemID.CrimsandBlock,
            Terraria.ID.ItemID.PearlsandBlock
        ].map(Number).filter(type => Number.isFinite(type) && type > 0);
        SandRecipeGroup = ModRecipe.CreateRecipeGroup('Any Sand Block', sandTypes);
    }

    CanUseItem(item, player) {
        if (!(this.BossType > 0))
            this.BossType = ModNPC.getTypeByName('DesertScourgeHead');
        return player.ZoneDesert === true && this.BossType > 0 && !Terraria.NPC.AnyNPCs(this.BossType);
    }

    AddRecipes() {
        const recipe = this.CreateRecipe();
        if (SandRecipeGroup) recipe.AddRecipeGroup(SandRecipeGroup, 40);
        else recipe.AddIngredient(Terraria.ID.ItemID.SandBlock, 40);
        recipe
            .AddIngredient(Terraria.ID.ItemID.AntlionMandible, 4)
            .AddIngredient(ModItem.getTypeByName('StormlionMandible'), 2)
            .AddTile(Terraria.ID.TileID.DemonAltar)
            .Register();
    }

    UseItem(item, player) {
        if (Terraria.PlayerIndex(player) !== Terraria.Main.myPlayer || !(this.BossType > 0))
            return false;
        PlayOfficialSummonSound(player);
        Terraria.NPC.SpawnOnPlayer(Terraria.PlayerIndex(player), this.BossType, 0, 0, 0, 0);
        return true;
    }
}
