import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class GeliticBlade extends ModItem {
    constructor(){ super(); this.Texture='Items/Weapons/Melee/GeliticBlade'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=44;i.height=70;i.damage=38;i.melee=true;i.useAnimation=30;i.useTime=30;i.useTurn=true;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=5.25;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,10,0,0);i.rare=Terraria.ID.ItemRarityID.LightRed;i.shoot=ModProjectile.getTypeByName('GelWave');i.shootSpeed=16;this.MenuCategories.push('melee'); }
    OnHitNPC(item,player,npc){ try{npc.AddBuff(Number(Terraria.ID.BuffID.Slimed||137),300,false);}catch(e){} }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),18).AddIngredient(ModItem.getTypeByName('BlightedGel'),18).AddTile(220).Register();
    }
}
