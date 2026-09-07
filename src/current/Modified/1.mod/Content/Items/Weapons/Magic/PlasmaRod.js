import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
export class PlasmaRod extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/PlasmaRod';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){try{Terraria.Item.staff[this.Type]=true;}catch(_){} }
 SetDefaults(){const i=this.Item;i.width=40;i.height=40;i.damage=8;i.magic=true;i.mana=10;i.useTime=20;i.useAnimation=20;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=2.5;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.UseSound=Terraria.ID.SoundID.Item109;i.autoReuse=true;i.shoot=ModProjectile.getTypeByName('PlasmaRay');i.shootSpeed=11;this.MenuCategories.push('magic');}
}
