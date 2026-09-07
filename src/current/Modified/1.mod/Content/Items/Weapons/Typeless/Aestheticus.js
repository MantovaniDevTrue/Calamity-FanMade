import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
export class Aestheticus extends ModItem{
    constructor(){super();this.Texture='Items/Weapons/Typeless/Aestheticus';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=58;i.height=58;i.damage=8;i.useAnimation=25;i.useTime=25;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=3;i.UseSound=Terraria.ID.SoundID.Item109;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.shoot=ModProjectile.getTypeByName('CursorProj');i.shootSpeed=5;}
    OnHitNPC(item,player,npc){const b=Number(ModBuff.getTypeByName('Vaporfied')||0);if(b>0)try{npc.AddBuff(b,120,false);}catch(_){}}
    AddRecipes(){this.CreateRecipe().AddIngredient(ModItem.getTypeByName('AerialiteBar'),5).AddIngredient(ModItem.getTypeByName('SeaPrism'),10).AddIngredient(75,5).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
