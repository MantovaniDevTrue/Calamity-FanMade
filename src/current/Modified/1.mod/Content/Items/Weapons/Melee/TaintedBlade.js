import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';
let EvilFleshGroup=null;
export class TaintedBlade extends ModItem{
    constructor(){super();this.Texture='Items/Weapons/Melee/TaintedBlade';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=46;i.height=46;i.damage=48;i.melee=true;i.useTurn=true;i.useAnimation=27;i.useTime=27;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=5;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;this.MenuCategories.push('melee');}
    OnHitNPC(item,player,npc){try{npc['void AddBuff(int type, int time, bool quiet)'](Terraria.ID.BuffID.Poisoned,240,false);}catch(_){try{npc.AddBuff(Terraria.ID.BuffID.Poisoned,240,false);}catch(__){}}}
    AddRecipeGroups(){if(EvilFleshGroup)return;const id=Terraria.ID.ItemID;const a=[id.RottenChunk,id.Vertebrae].map(Number).filter(v=>v>0);if(a.length)EvilFleshGroup=ModRecipe.CreateRecipeGroup('Any Evil Flesh',a);}
    AddRecipes(){const r=this.CreateRecipe().AddIngredient(ModItem.getTypeByName('Acidwood'),10);if(EvilFleshGroup)r.AddRecipeGroup(EvilFleshGroup,8);else r.AddIngredient(Terraria.ID.ItemID.RottenChunk,8);r.AddIngredient(Terraria.ID.ItemID.Deathweed,2).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
