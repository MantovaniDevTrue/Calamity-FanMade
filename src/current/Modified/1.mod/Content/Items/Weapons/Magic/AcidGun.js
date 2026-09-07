import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function rot(v,a){const x=N(v.X),y=N(v.Y),c=Math.cos(a),s=Math.sin(a);return Vector2.new(x*c-y*s,x*s+y*c);}function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
export class AcidGun extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/AcidGun';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=42;i.height=28;i.damage=18;i.magic=true;i.mana=12;i.useAnimation=20;i.useTime=20;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=1.5;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.UseSound=Terraria.ID.SoundID.Item13;i.autoReuse=true;i.shootSpeed=14;i.shoot=ModProjectile.getTypeByName('AcidGunStream');this.MenuCategories.push('magic');}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('AcidGunStream')||0),dmg=Math.max(1,Math.floor(N(damage)>0?N(damage):N(item.damage,18))),o=Terraria.PlayerIndex(player),s=src(player,item);if(!(t>0))return false;for(const a of [-8,0,8])NewProjectile(s,position,rot(velocity,a*Math.PI/180),t,dmg,N(kb,1.5),o,0,0,0,null);return false;}
 AddRecipes(){const wood=Number(ModItem.getTypeByName('Acidwood')||0),scale=Number(ModItem.getTypeByName('SulphuricScale')||0);if(wood>0&&scale>0)this.CreateRecipe().AddIngredient(wood,15).AddIngredient(scale,12).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
