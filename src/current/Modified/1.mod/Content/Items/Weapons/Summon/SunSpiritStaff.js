import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { GetSunSpirit, IncreaseSunSpiritPower, SunSpiritPower } from './../../../../Core/PreBossArsenalRuntime.js';
const {Vector2}=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class SunSpiritStaff extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Summon/SunSpiritStaff';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=44;i.height=48;i.damage=22;i.summon=true;i.mana=10;i.useAnimation=36;i.useTime=36;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.noMelee=true;i.knockBack=1.15;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.UseSound=Terraria.ID.SoundID.Item44;i.buffType=ModBuff.getTypeByName('SolarSpirit');i.shoot=ModProjectile.getTypeByName('SunSpiritMinion');this.MenuCategories.push('summon');}
 CanUseItem(item,player){const p=GetSunSpirit(player);if(!p)return true;const max=Math.max(1,Math.floor(Number(player.maxMinions)||1));return SunSpiritPower(p)<max;}
 Shoot(item,player,position,velocity,type,damage,knockBack){const buff=Number(ModBuff.getTypeByName('SolarSpirit')||0),t=Number(ModProjectile.getTypeByName('SunSpiritMinion')||0);if(!(buff>0&&t>0))return false;const existing=GetSunSpirit(player),max=Math.max(1,Math.floor(Number(player.maxMinions)||1));if(existing){IncreaseSunSpiritPower(existing,max);try{player.AddBuff(buff,18000,false);}catch(_){}return false;}const c=Terraria.PlayerCenter(player),spawn=Vector2.new(Number(c.X),Number(c.Y)-80);const idx=NewProjectile(player.GetProjectileSource_Item(item),spawn,Vector2.Zero,t,damage,knockBack,Terraria.PlayerIndex(player),0,0,0,null);if(idx>=0){try{const p=Terraria.Main.projectile.get_Item(Number(idx));if(p){p.originalDamage=item.damage;p.minionSlots=1;p.netUpdate=true;}}catch(_){}}try{player.AddBuff(buff,18000,false);}catch(_){}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Amber,5).AddIngredient(Terraria.ID.ItemID.AntlionMandible,3).AddIngredient(Terraria.ID.ItemID.PalmWood,10).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
