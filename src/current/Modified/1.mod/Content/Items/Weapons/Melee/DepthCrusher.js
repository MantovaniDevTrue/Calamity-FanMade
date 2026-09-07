import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
export class DepthCrusher extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/DepthCrusher';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=56;i.height=50;i.damage=48;i.knockBack=7.25;i.useTime=65;i.useAnimation=65;i.shoot=ModProjectile.getTypeByName('DepthCrusherProjectile');i.shootSpeed=6;i.noMelee=true;i.noUseGraphic=true;i.melee=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;this.MenuCategories.push('melee');}
}
