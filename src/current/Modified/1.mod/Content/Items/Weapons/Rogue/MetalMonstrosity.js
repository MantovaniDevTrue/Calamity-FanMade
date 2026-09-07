import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, MarkRogueProjectile, MarkStealthStrike } from './../../../../Core/RogueRuntime.js';
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}function spawned(id){try{return Terraria.Main.projectile.get_Item(Number(id));}catch(_){return null;}}
export class MetalMonstrosity extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/MetalMonstrosity';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=i.height=32;i.damage=28;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.autoReuse=true;i.noUseGraphic=true;i.noMelee=true;i.UseSound=Terraria.ID.SoundID.Item1;i.rare=Terraria.ID.ItemRarityID.Orange;i.value=Terraria.Item.buyPrice(0,4,0,0);i.useAnimation=i.useTime=45;i.knockBack=12;i.shoot=ModProjectile.getTypeByName('MetalChunk');i.shootSpeed=7;this.MenuCategories.push('rogue');}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),t=Number(ModProjectile.getTypeByName('MetalChunk')||type||0);if(!(t>0))return false;const id=NewProjectile(src(player,item),position,velocity,t,Math.max(1,Math.floor(N(damage,N(item.damage,28)))),N(kb,12),Terraria.PlayerIndex(player),0,0,0,null),p=spawned(id);if(p){MarkRogueProjectile(p,'MetalMonstrosity',false);if(stealth){MarkStealthStrike(p,'MetalMonstrosity',false);p.penetrate=3;}}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.SpikyBall,500).AddIngredient(Terraria.ID.ItemID.Spike,80).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
