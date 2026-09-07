import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { HasDeathstare, MarkDeathstareOwner } from './../../../../Core/DeathstareRuntime.js';
const {Vector2}=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function projectileAt(i){try{return Terraria.Main.projectile.get_Item(Number(i));}catch(_){return null;}}
function setNative(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a.set_Item(Number(index),value);return true;}catch(_){}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}return false;}catch(_){return false;}}
export class DeathstareRod extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/Summon/DeathstareRod';this.ResearchUnlockCount=1;}
    SetStaticDefaults(){setNative(Terraria.ID.ItemID.Sets,'GamepadWholeScreenUseRange',this.Type,true);try{Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type]=true;}catch(_){}setNative(Terraria.ID.ItemID.Sets,'LockOnIgnoresCollision',this.Type,true);try{Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type]=true;}catch(_){}setNative(Terraria.ID.ItemID.Sets,'StaffMinionSlotsRequired',this.Type,1);try{Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type]=1;}catch(_){} }
    SetDefaults(){try{this.CloneDefaults(Terraria.ID.ItemID.BabyBirdStaff);}catch(_){}const i=this.Item;i.width=46;i.height=46;i.damage=20;i.mana=10;i.summon=true;i.useAnimation=36;i.useTime=36;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.noMelee=true;i.knockBack=2;i.value=Terraria.Item.buyPrice(0,0,40,0);i.rare=Terraria.ID.ItemRarityID.Green;i.UseSound=Terraria.ID.SoundID.NPCHit8;i.buffType=ModBuff.getTypeByName('MiniatureEyeofCthulhu');i.shoot=ModProjectile.getTypeByName('DeathstareEyeball');this.MenuCategories.push('summon');}
    CanUseItem(item,player){return !HasDeathstare(player);}
    Shoot(item,player,position,velocity,type,damage,knockBack){const t=Number(ModProjectile.getTypeByName('DeathstareEyeball')||0),b=Number(ModBuff.getTypeByName('MiniatureEyeofCthulhu')||0),owner=Terraria.PlayerIndex(player);if(!(t>0&&b>0))return false;const d=Math.max(1,Math.floor(Number(damage)||Number(item.damage)||20));try{player.AddBuff(b,2,false);}catch(_){}const idx=NewProjectile(player.GetProjectileSource_Item(item),Terraria.PlayerCenter(player),Vector2.Zero,t,d,knockBack,owner,0,0,0,null);if(idx>=0){MarkDeathstareOwner(owner);const p=projectileAt(idx);if(p){p.damage=d;p.originalDamage=Math.max(d,Math.floor(Number(item.damage)||20));p.minionSlots=1;p.friendly=true;p.hostile=false;p.netUpdate=true;}}return false;}
}
