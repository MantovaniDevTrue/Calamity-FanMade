import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
const DrawAnimationVertical=new NativeClass('Terraria.DataStructures','DrawAnimationVertical');

export class Driftwood extends ModItem {
    constructor(){ super(); this.Texture='Items/Placeables/FurnitureDriftwood/Driftwood'; this.ResearchUnlockCount=100; }
    SetDefaults(){ const i=this.Item; i.width=28; i.height=22; i.maxStack=ModItem.CommonMaxStack; i.value=Terraria.Item.sellPrice(0,0,0,10); i.rare=Terraria.ID.ItemRarityID.White; i.material=true; this.MenuCategories.push('material'); }
}

export class BloodOrb extends ModItem {
    constructor(){ super(); this.Texture='Items/Materials/BloodOrb'; this.ResearchUnlockCount=100; }
    SetStaticDefaults(){try{const a=DrawAnimationVertical.new();a.Frame=0;a.FrameCounter=0;a.FrameCount=4;a.TicksPerFrame=6;a.PingPong=false;Terraria.Main.RegisterItemAnimation(this.Type,a);Terraria.ID.ItemID.Sets.AnimatesAsSoul[this.Type]=true;Terraria.ID.ItemID.Sets.ItemIconPulse[this.Type]=true;}catch(_){} }
    SetDefaults(){ const i=this.Item; i.width=16; i.height=28; i.maxStack=ModItem.CommonMaxStack; i.value=Terraria.Item.sellPrice(0,0,0,40); i.rare=Terraria.ID.ItemRarityID.Green; i.material=true; this.MenuCategories.push('material'); }
}
