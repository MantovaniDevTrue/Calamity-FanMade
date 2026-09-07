import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}}
function setArray(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}try{a.set_Item(Number(index),value);return true;}catch(_){}return false;}catch(_){return false;}}

export class SquirrelSquireStaff extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/Summon/SquirrelSquireStaff';this.ResearchUnlockCount=1;}
    SetStaticDefaults(){setArray(Terraria.Item,'staff',this.Type,true);setArray(Terraria.ID.ItemID.Sets,'GamepadWholeScreenUseRange',this.Type,true);setArray(Terraria.ID.ItemID.Sets,'LockOnIgnoresCollision',this.Type,true);}
    SetDefaults(){
        const i=this.Item;i.damage=8;i.summon=true;i.sentry=true;i.shoot=ModProjectile.getTypeByName('SquirrelSquireMinion');i.knockBack=.5;
        i.useAnimation=30;i.useTime=30;i.mana=10;i.width=46;i.height=52;i.noMelee=true;i.autoReuse=true;
        i.value=Terraria.Item.buyPrice(0,0,50,0);i.rare=Terraria.ID.ItemRarityID.White;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;
        i.UseSound=Terraria.ID.SoundID.Item44;i.shootSpeed=1;i.buffType=ModBuff.getTypeByName('SquirrelSquireSentryBuff');this.MenuCategories.push('summon');
    }
    Shoot(item,player,position,velocity,type,damage,kb){
        let pos=Terraria.PlayerCenter(player);try{const m=Terraria.Main.MouseWorld;if(m)pos=Vector2.new(N(m.X,N(pos.X)),N(m.Y,N(pos.Y))-16);}catch(_){}
        const buff=Number(ModBuff.getTypeByName('SquirrelSquireSentryBuff')||0);if(buff>0)try{player.AddBuff(buff,2,false);}catch(_){}
        const id=NewProjectile(src(player,item),pos,Vector2.Zero,Number(type),Math.max(1,Math.floor(N(damage,N(item.damage,8)))),N(kb,.5),Terraria.PlayerIndex(player),0,0,0,null);
        try{if(id>=0){const p=Terraria.Main.projectile.get_Item(Number(id));if(p){p.originalDamage=Math.max(1,Math.floor(N(damage,8)));p.netUpdate=true;}}player.UpdateMaxTurrets();}catch(_){}
        return false;
    }
    AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Wood,10).AddIngredient(Terraria.ID.ItemID.Acorn,1).AddTile(Terraria.ID.TileID.WorkBenches).Register();}
}
