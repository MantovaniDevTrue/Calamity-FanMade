import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';

export class GildedDagger extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/Rogue/GildedDagger';this.ResearchUnlockCount=1;}
    SetDefaults(){
        this.RoguePrefix=true;const i=this.Item;i.width=32;i.height=26;i.damage=14;i.melee=false;i.ranged=false;i.magic=false;i.summon=false;
        i.noMelee=true;i.noUseGraphic=true;i.useAnimation=18;i.useTime=18;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=1;
        i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;
        i.shoot=ModProjectile.getTypeByName('GildedDaggerProj');i.shootSpeed=15;this.MenuCategories.push('thrown');
    }
    Shoot(item,player,position,velocity,type,damage,knockBack){
        const t=Number(ModProjectile.getTypeByName('GildedDaggerProj')||type||0);if(!(t>0))return false;
        const stealth=ConsumeStealthStrike(player,item),mult=stealth?StealthDamageMultiplier(player,'GildedDagger'):1;
        const p=SpawnMarkedProjectile(player,item,position,velocity,t,damage*mult,knockBack,'GildedDagger',stealth,false,0,stealth?1:0,0);
        if(p&&stealth){try{p.penetrate=4;p.netUpdate=true;}catch(_){} }
        return false;
    }
    AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.GoldBar,12).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
