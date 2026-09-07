import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModRecipe } from './../../../TL/ModRecipe.js';

let AnyGoldBar = null, AnyCopperBar = null, AnySiltBlock = null, AnyEvilBar = null, Boss2Material = null;
function EnsureGroups(){
    if(!AnyGoldBar){ const a=[Terraria.ID.ItemID.GoldBar,Terraria.ID.ItemID.PlatinumBar].map(Number).filter(v=>v>0); if(a.length) AnyGoldBar=ModRecipe.CreateRecipeGroup('Any Gold Bar',a); }
    if(!AnyCopperBar){ const a=[Terraria.ID.ItemID.CopperBar,Terraria.ID.ItemID.TinBar].map(Number).filter(v=>v>0); if(a.length) AnyCopperBar=ModRecipe.CreateRecipeGroup('Any Copper Bar',a); }
    if(!AnySiltBlock){ const a=[Terraria.ID.ItemID.SiltBlock,Terraria.ID.ItemID.SlushBlock,Terraria.ID.ItemID.DesertFossil].map(Number).filter(v=>v>0); if(a.length) AnySiltBlock=ModRecipe.CreateRecipeGroup('Any Silt Block',a); }
    if(!AnyEvilBar){ const a=[Terraria.ID.ItemID.DemoniteBar,Terraria.ID.ItemID.CrimtaneBar].map(Number).filter(v=>v>0); if(a.length) AnyEvilBar=ModRecipe.CreateRecipeGroup('Any Evil Bar',a); }
    if(!Boss2Material){ const a=[Terraria.ID.ItemID.ShadowScale,Terraria.ID.ItemID.TissueSample].map(Number).filter(v=>v>0); if(a.length) Boss2Material=ModRecipe.CreateRecipeGroup('Evil Boss Material',a); }
}
function A(item,w,h,rare,gold=1,silver=0,defense=0){
    item.width=w; item.height=h; item.maxStack=1; item.value=Terraria.Item.buyPrice(0,gold,silver,0); item.rare=rare; item.accessory=true;
    if(defense>0)item.defense=defense;
}
function State(){ return ModPlayer.getByName('PreSlimeGodAccessoryPlayer'); }
function Enable(player,name,visible=true){ const s=State(); if(s&&typeof s.Enable==='function')s.Enable(player,name,visible); }
function Mod(name){ return Number(ModItem.getTypeByName(name)||0); }
function AddGroup(recipe,group,fallback,stack){ if(group) recipe.AddRecipeGroup(group,stack); else if(Number(fallback)>0) recipe.AddIngredient(Number(fallback),stack); return recipe; }
function RogueState(player){ const s=ModPlayer.getByName('CalamityPlayerState'); return s&&(!s.IsLocalPlayer||s.IsLocalPlayer(player))?s:null; }

class AccessoryBase extends ModItem {
    constructor(){ super(); this.Texture=`Items/Accessories/${this.constructor.name}`; this.ResearchUnlockCount=1; }
    AddRecipeGroups(){ EnsureGroups(); }
}

export class AlluringBait extends AccessoryBase {
    SetDefaults(){A(this.Item,26,26,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){ player.fishingSkill=Number(player.fishingSkill||0)+10; Enable(player,'AlluringBait'); }
}
export class AncientFossil extends AccessoryBase {
    SetDefaults(){A(this.Item,26,26,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player){ Enable(player,'AncientFossil'); }
    AddRecipes(){EnsureGroups(); const r=this.CreateRecipe(); AddGroup(r,AnySiltBlock,Terraria.ID.ItemID.SiltBlock,100).AddTile(Terraria.ID.TileID.Furnaces).Register();}
}
export class ArchaicPowder extends AccessoryBase {
    SetDefaults(){A(this.Item,56,34,Terraria.ID.ItemRarityID.Orange,5);}
    UpdateAccessory(item,player){ Enable(player,'ArchaicPowder'); }
    AddRecipes(){
        const fossil=Mod('AncientFossil'), chisel=Number(Terraria.ID.ItemID.AncientChisel||0); if(!(fossil>0&&chisel>0))return;
        // TLPro completion adaptation: Ancient Bone Dust and Scorched Bone are not yet standalone materials in this port.
        // Bone + Obsidian preserve the same early-game mining/trap-upgrade progression without adding dead materials.
        this.CreateRecipe().AddIngredient(fossil,1).AddIngredient(chisel,1).AddIngredient(Terraria.ID.ItemID.Bone,18).AddIngredient(Terraria.ID.ItemID.Obsidian,10).AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
export class CleansingJelly extends AccessoryBase {
    SetDefaults(){A(this.Item,18,40,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player){Enable(player,'CleansingJelly');}
}
export class CounterScarf extends AccessoryBase {
    SetDefaults(){A(this.Item,30,38,Terraria.ID.ItemRarityID.Orange,20);}
    UpdateAccessory(item,player){ Enable(player,'CounterScarf'); try{player.dashType=1;}catch(_){} }
}
export class EnchantedPearl extends AccessoryBase {
    SetDefaults(){A(this.Item,26,26,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){player.fishingSkill=Number(player.fishingSkill||0)+10;Enable(player,'EnchantedPearl');}
    AddRecipes(){const prism=Mod('SeaPrism'),remains=Mod('SeaRemains');if(!(prism>0&&remains>0))return;this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.WhitePearl,1).AddIngredient(prism,10).AddIngredient(remains,3).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class FishStocks extends AccessoryBase {
    SetDefaults(){A(this.Item,30,38,Terraria.ID.ItemRarityID.Blue,7,77);}
    UpdateAccessory(item,player){Enable(player,'FishStocks');const s=State();if(s&&s.ApplyFishStocks)s.ApplyFishStocks(player);}
}
export class GiantShell extends AccessoryBase {
    SetDefaults(){A(this.Item,30,28,Terraria.ID.ItemRarityID.Blue,1,0,4);}
    UpdateAccessory(item,player){Enable(player,'GiantShell');}
}
export class IlmerisSpark extends AccessoryBase {
    SetDefaults(){A(this.Item,26,26,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player){Enable(player,'IlmerisSpark');}
}
export class LifeJelly extends AccessoryBase {
    SetDefaults(){A(this.Item,18,40,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player){Enable(player,'LifeJelly');}
}
export class MarniteRepulsionShield extends AccessoryBase {
    SetDefaults(){A(this.Item,24,30,Terraria.ID.ItemRarityID.Blue,1,0,2);}
    UpdateAccessory(item,player,hideVisual){Enable(player,'MarniteRepulsionShield',hideVisual!==true);}
    AddRecipes(){EnsureGroups();const r=this.CreateRecipe();AddGroup(r,AnyGoldBar,Terraria.ID.ItemID.GoldBar,5).AddIngredient(Terraria.ID.ItemID.Granite,15).AddIngredient(Terraria.ID.ItemID.Marble,15).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class OldDie extends AccessoryBase {
    SetDefaults(){A(this.Item,24,26,Terraria.ID.ItemRarityID.Orange,20);}
    UpdateAccessory(item,player){player.luck=Number(player.luck||0)+0.2;Enable(player,'OldDie');}
}
export class RaidersTalisman extends AccessoryBase {
    SetDefaults(){A(this.Item,30,36,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){Enable(player,'RaidersTalisman');}
    AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Leather,5).AddIngredient(Terraria.ID.ItemID.Obsidian,20).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class RottenDogtooth extends AccessoryBase {
    SetDefaults(){A(this.Item,14,22,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player){Enable(player,'RottenDogtooth');}
}
export class SandCloak extends AccessoryBase {
    SetDefaults(){A(this.Item,30,44,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){Enable(player,'SandCloak');}
}
export class ScuttlersJewel extends AccessoryBase {
    SetDefaults(){A(this.Item,26,26,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player){Enable(player,'ScuttlersJewel');}
}
export class SeaSpiritAmulet extends AccessoryBase {
    SetDefaults(){A(this.Item,26,26,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player,hideVisual){Enable(player,'SeaSpiritAmulet',hideVisual!==true);}
}
export class ShieldoftheOcean extends AccessoryBase {
    SetDefaults(){A(this.Item,24,28,Terraria.ID.ItemRarityID.Green,2,0,2);}
    UpdateAccessory(item,player){Enable(player,'ShieldoftheOcean');}
    AddRecipes(){const r=Mod('SeaRemains');if(!(r>0))return;this.CreateRecipe().AddIngredient(r,5).AddIngredient(Terraria.ID.ItemID.Starfish,5).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class SilencingSheath extends AccessoryBase {
    SetDefaults(){A(this.Item,32,34,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){
        Enable(player,'SilencingSheath'); const s=RogueState(player); if(s){s.RogueStealthMax=Number(s.RogueStealthMax||0)+0.1;s.RogueStealthStandstillBonus=Number(s.RogueStealthStandstillBonus||0)+0.04;s.RogueStealthMovingBonus=Number(s.RogueStealthMovingBonus||0)+0.04;}
    }
    AddRecipes(){EnsureGroups();const r=this.CreateRecipe();AddGroup(r,AnyEvilBar,Terraria.ID.ItemID.DemoniteBar,8).AddIngredient(Terraria.ID.ItemID.Silk,10);AddGroup(r,Boss2Material,Terraria.ID.ItemID.ShadowScale,3).AddTile(Terraria.ID.TileID.TinkerersWorkbench).Register();}
}
export class SpiritGlyph extends AccessoryBase {
    SetDefaults(){A(this.Item,24,30,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){Enable(player,'SpiritGlyph');}
    AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Diamond,5).AddIngredient(Terraria.ID.ItemID.Obsidian,15).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class SpringStool extends AccessoryBase {
    SetDefaults(){A(this.Item,30,46,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){Enable(player,'SpringStool');}
    AddRecipes(){EnsureGroups();const r=this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.PortableStool,1);AddGroup(r,AnyCopperBar,Terraria.ID.ItemID.CopperBar,3).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class StatMeter extends ModItem {
    constructor(){super();this.Texture='Items/Accessories/StatMeter';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=26;i.height=26;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;}
}
export class TheBee extends AccessoryBase {
    SetDefaults(){A(this.Item,24,28,Terraria.ID.ItemRarityID.Orange,5);}
    UpdateAccessory(item,player){Enable(player,'TheBee');}
}
export class ThePointer extends AccessoryBase {
    SetDefaults(){A(this.Item,26,26,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player){
        Enable(player,'ThePointer');
        // Mobile adaptation: expose Terraria's native lock-on button while equipped.
        try{Terraria.GameInput.LockOnHelper.ForceUsability=true;}catch(_){try{Terraria.LockOnHelper.ForceUsability=true;}catch(__){}}
    }
    AddRecipes(){EnsureGroups();const r=this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Glass,1);AddGroup(r,AnyCopperBar,Terraria.ID.ItemID.CopperBar,2);r.AddRecipeGroup('IronBar',3).AddIngredient(Terraria.ID.ItemID.ManaCrystal,1).AddTile(Terraria.ID.TileID.WorkBenches).Register();}
}
export class UnholyTonic extends AccessoryBase {
    SetDefaults(){A(this.Item,20,20,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){Enable(player,'UnholyTonic');if(player.ZoneCorrupt===true)player.statDefense=Number(player.statDefense||0)+3;}
    AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.VilePowder,15).AddIngredient(Terraria.ID.ItemID.RottenChunk,10).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class ViciousTonic extends AccessoryBase {
    SetDefaults(){A(this.Item,20,20,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){Enable(player,'ViciousTonic');if(player.ZoneCrimson===true)player.statDefense=Number(player.statDefense||0)+3;}
    AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.ViciousPowder,15).AddIngredient(Terraria.ID.ItemID.Vertebrae,10).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class VitalJelly extends AccessoryBase {
    SetDefaults(){A(this.Item,18,40,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player){player.moveSpeed=Number(player.moveSpeed||0)+0.12;player.jumpSpeedBoost=Number(player.jumpSpeedBoost||0)+0.6;Enable(player,'VitalJelly');}
}
export class VoltaicJelly extends AccessoryBase {
    SetDefaults(){A(this.Item,20,22,Terraria.ID.ItemRarityID.Green,2);}
    UpdateAccessory(item,player){Enable(player,'VoltaicJelly');}
}
export class WulfrumAcrobaticsPack extends AccessoryBase {
    SetDefaults(){A(this.Item,20,22,Terraria.ID.ItemRarityID.Blue,1);}
    UpdateAccessory(item,player,hideVisual){player.moveSpeed=Number(player.moveSpeed||0)+0.08;player.maxFallSpeed=Number(player.maxFallSpeed||10)*1.25;Enable(player,'WulfrumAcrobaticsPack',hideVisual!==true);}
    AddRecipes(){const scrap=Mod('WulfrumMetalScrap'),core=Mod('EnergyCore');if(!(scrap>0&&core>0))return;this.CreateRecipe().AddIngredient(scrap,5).AddIngredient(core,1).AddIngredient(Terraria.ID.ItemID.Chain,2).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class JellyChargedBattery extends AccessoryBase {
    SetDefaults(){A(this.Item,20,22,Terraria.ID.ItemRarityID.LightRed,10);}
    UpdateAccessory(item,player){player.minionDamage=Number(player.minionDamage||1)+0.07;Enable(player,'VoltaicJelly');Enable(player,'JellyChargedBattery');}
    AddRecipes(){const b=Mod('WulfrumBattery'),v=Mod('VoltaicJelly'),gel=Mod('PurifiedGel'),m=Mod('StormlionMandible');if(!(b>0&&v>0&&gel>0&&m>0))return;this.CreateRecipe().AddIngredient(b,1).AddIngredient(v,1).AddIngredient(gel,10).AddIngredient(m,2).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
export class RadiantOoze extends AccessoryBase {
    SetDefaults(){A(this.Item,20,20,Terraria.ID.ItemRarityID.LightRed,10);}
    UpdateAccessory(item,player,hideVisual){Enable(player,'RadiantOoze',hideVisual!==true);}
    AddRecipes(){const a=Mod('BlightedGel'),b=Mod('PurifiedGel');if(!(a>0&&b>0))return;this.CreateRecipe().AddIngredient(a,45).AddIngredient(b,15).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
