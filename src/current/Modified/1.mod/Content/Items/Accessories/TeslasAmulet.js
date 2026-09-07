import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

const DrawAnimationVertical = new NativeClass('Terraria.DataStructures','DrawAnimationVertical');
function resizeSet(holder,name,index,value){try{let a=holder[name];const n=Number(index)+1;if(Number(a.length)<n){a=a.cloneResized(n);holder[name]=a;}a[Number(index)]=value;}catch(e){}}

export class TeslasAmulet extends ModItem {
    constructor(){ super(); this.Texture='Items/Accessories/TeslasAmulet'; this.ResearchUnlockCount=1; }
    SetStaticDefaults(){
        try{ const a=DrawAnimationVertical.new();a.Frame=0;a.FrameCounter=0;a.FrameCount=12;a.TicksPerFrame=5;a.PingPong=false;Terraria.Main.RegisterItemAnimation(this.Type,a);}catch(e){}
        resizeSet(Terraria.ID.ItemID.Sets,'AnimatesAsSoul',this.Type,true);
    }
    SetDefaults(){ const i=this.Item;i.width=34;i.height=32;i.maxStack=1;i.rare=Terraria.ID.ItemRarityID.Orange;i.value=Terraria.Item.buyPrice(0,5,0,0);i.accessory=true;this.MenuCategories.push('accessory'); }
    UpdateAccessory(item,player,hideVisual){ const s=ModPlayer.getByName('AerialiteAccessoryPlayer'); if(s)s.EnableTesla(player,hideVisual!==true); }
    AddRecipes(){ this.CreateRecipe().AddIngredient(ModItem.getTypeByName('AerialiteBar'),8).AddIngredient(ModItem.getTypeByName('SeaPrism'),8).AddIngredient(ModItem.getTypeByName('StormlionMandible'),4).AddTile(Terraria.ID.TileID.Anvils).Register(); }
}
