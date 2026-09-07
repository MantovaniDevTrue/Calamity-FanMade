import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
export class BallOFugu extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/BallOFugu';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=30;i.height=10;i.damage=25;i.melee=true;i.useAnimation=20;i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.noUseGraphic=true;i.knockBack=8;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.channel=true;i.shoot=ModProjectile.getTypeByName('BallOFuguProj');i.shootSpeed=12;this.MenuCategories.push('melee');}
}
