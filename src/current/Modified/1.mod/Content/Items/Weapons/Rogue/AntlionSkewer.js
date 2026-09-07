import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';
export class AntlionSkewer extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/AntlionSkewer';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=58;i.height=56;i.damage=19;i.melee=false;i.ranged=false;i.magic=false;i.summon=false;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=28;i.useTime=28;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=2;i.shoot=ModProjectile.getTypeByName('AntlionSkewerProj');i.shootSpeed=12;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Green;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,knockBack){const stealth=ConsumeStealthStrike(player,item);SpawnMarkedProjectile(player,item,position,velocity,type,damage,knockBack,'AntlionSkewer',stealth,false,0,0,0);return false;}
}
