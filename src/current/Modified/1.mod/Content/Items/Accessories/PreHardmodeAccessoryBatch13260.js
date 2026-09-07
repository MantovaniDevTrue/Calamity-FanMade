import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

function State(player) {
    const s = ModPlayer.getByName('CalamityPlayerState');
    return s && s.IsLocalPlayer(player) ? s : null;
}
function AddClassDamage(player, state, amount) {
    for (const key of ['meleeDamage', 'rangedDamage', 'magicDamage', 'minionDamage']) {
        try { player[key] = Number(player[key] || 1) + amount; } catch (_) { }
    }
    if (state) state.RogueDamageBonus += amount;
}
function TwoEvilBossMaterialRecipes(item, build) {
    const ids = Terraria.ID.ItemID;
    const materials = [Number(ids.ShadowScale || 86), Number(ids.TissueSample || 1329)].filter(v => v > 0);
    for (const mat of materials) build(item.CreateRecipe(), mat).Register();
}

export class BlackGlassBand extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/BlackGlassBand'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=30;i.height=23;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=State(player); if(s){s.BlackGlassBandEquipped=true;s.BlackGlassBandVisual=hideVisual!==true;} }
    AddRecipes(){
        const id=Terraria.ID.ItemID, anvil=Terraria.ID.TileID.Anvils;
        for(const bar of [Number(id.GoldBar||19),Number(id.PlatinumBar||706)].filter(v=>v>0))
            this.CreateRecipe().AddIngredient(bar,8).AddIngredient(Number(id.Diamond||182),3).AddIngredient(Number(id.Obsidian||173),35).AddTile(anvil).Register();
    }
}

export class ProtolithBangle extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/ProtolithBangle'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item;i.width=34;i.height=34;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=State(player);if(s){s.ProtolithBangleEquipped=true;s.ProtolithBangleVisual=hideVisual!==true;} }
    AddRecipes(){ const id=Terraria.ID.ItemID, black=ModItem.getTypeByName('BlackGlassBand'), anvil=Terraria.ID.TileID.Anvils;
        TwoEvilBossMaterialRecipes(this,(r,mat)=>r.AddIngredient(black,1).AddIngredient(mat,15).AddIngredient(Number(id.Marble||3081),45).AddIngredient(Number(id.Ruby||178),3).AddIngredient(Number(id.Lens||38),5).AddTile(anvil)); }
}

export class BatholithBangle extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/BatholithBangle'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item;i.width=36;i.height=28;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=State(player);if(s){s.BatholithBangleEquipped=true;s.BatholithBangleVisual=hideVisual!==true;} }
    AddRecipes(){ const id=Terraria.ID.ItemID, black=ModItem.getTypeByName('BlackGlassBand'), anvil=Terraria.ID.TileID.Anvils;
        TwoEvilBossMaterialRecipes(this,(r,mat)=>r.AddIngredient(black,1).AddIngredient(mat,15).AddIngredient(Number(id.Granite||3086),45).AddIngredient(Number(id.Amber||181),3).AddIngredient(Number(id.FallenStar||75),5).AddTile(anvil)); }
}

export class CrawCarapace extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/CrawCarapace'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item;i.width=28;i.height=28;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=State(player); if(s){s.CrawCarapaceEquipped=true;AddClassDamage(player,s,0.07);} }
}

export class CrownJewel extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/CrownJewel'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item;i.width=26;i.height=26;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,0,20,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=State(player);if(s)s.CrownJewelEquipped=true; }
}

export class HoneyDew extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/HoneyDew'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item;i.width=20;i.height=20;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=State(player);if(s)s.HoneyDewEquipped=true; }
    AddRecipes(){ const id=Terraria.ID.ItemID; this.CreateRecipe().AddIngredient(Number(id.BottledHoney||1134),10).AddIngredient(Number(id.BeeWax||2431),3).AddIngredient(Number(id.JungleSpores||331),6).AddTile(Terraria.ID.TileID.Anvils).Register(); }
}

export class OceanCrest extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/OceanCrest'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item;i.width=18;i.height=26;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,0,40,0);i.rare=Terraria.ID.ItemRarityID.Green;i.accessory=true;i.expert=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){
        const s=State(player); if(s)s.OceanCrestEquipped=true;
        let wet=player?.wet===true;
        try { wet = wet || (Terraria.Main.raining===true && player.ZoneOverworldHeight===true); } catch (_) { }
        if(wet) try { player.pickSpeed=Math.max(0.1,Number(player.pickSpeed||1)-0.15); } catch (_) { }
    }
}
