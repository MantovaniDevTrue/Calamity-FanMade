import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 }=Modules;
export class AbyssShocker extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/AbyssShocker';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=86;i.height=32;i.damage=30;i.magic=true;i.mana=14;i.useAnimation=19;i.useTime=19;i.knockBack=0.25;i.shoot=ModProjectile.getTypeByName('LightningArc');i.shootSpeed=14;i.UseSound=Terraria.ID.SoundID.Item13;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.autoReuse=true;i.noMelee=true;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;this.MenuCategories.push('magic');}
 ModifyShootStats(item,player,stats){const x=Number(stats.velocity.X),y=Number(stats.velocity.Y),m=Math.sqrt(x*x+y*y)||1;stats.position=Vector2.Add(stats.position,Vector2.new(x/m*56,y/m*56));}
}
