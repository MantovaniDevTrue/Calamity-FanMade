import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';
import { FusionEntityData } from './../../../../Core/FusionEntityData.js';
const {Vector2}=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let AnyGoldBarGroup=null;
export class SparkSpreader extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/SparkSpreader';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=56;i.height=26;i.damage=16;i.ranged=true;i.knockBack=1;i.autoReuse=true;i.useTime=48;i.useAnimation=48;i.reuseDelay=12;i.useAmmo=Terraria.ID.AmmoID.Gel;i.shootSpeed=6;i.shoot=ModProjectile.getTypeByName('SparkSpreaderFire');i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.UseSound=Terraria.ID.SoundID.Item34;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;this.MenuCategories.push('ranged');}
 HoldoutOffset(){return {X:-4,Y:0};}
 Shoot(item,player,position,velocity,type,damage,knockBack){
  const t=Number(ModProjectile.getTypeByName('SparkSpreaderFire')||0);if(!(t>0))return false;
  const src=player.GetProjectileSource_Item(item),owner=Terraria.PlayerIndex(player),vx=Number(velocity.X),vy=Number(velocity.Y);
  for(let k=0;k<4;k++){
    const idx=NewProjectile(src,position,Vector2.new(vx,vy),t,damage,knockBack,owner,0,0,0,null);
    if(idx<0)continue;
    try{
      const p=Terraria.Main.projectile.get_Item(Number(idx));
      if(!p)continue;
      const st=FusionEntityData.GetProjectileBag(p,'sparkSpreaderFire',()=>({configured:false,delay:0,vx:0,vy:0,age:0}));
      st.configured=true;st.delay=k*12;st.vx=vx;st.vy=vy;st.age=0;
      if(st.delay>0){p.velocity=Vector2.Zero;p.friendly=false;}
    }catch(_){}
  }
  return false;
}
 AddRecipeGroups(){if(AnyGoldBarGroup)return;const id=Terraria.ID.ItemID;const a=[id.GoldBar,id.PlatinumBar].map(Number).filter(v=>v>0);if(a.length)AnyGoldBarGroup=ModRecipe.CreateRecipeGroup('Any Gold Bar',a);}
 AddRecipes(){const r=this.CreateRecipe();if(AnyGoldBarGroup)r.AddRecipeGroup(AnyGoldBarGroup,10);else r.AddIngredient(Terraria.ID.ItemID.GoldBar,10);r.AddIngredient(Terraria.ID.ItemID.Ruby,1).AddIngredient(Terraria.ID.ItemID.Gel,12).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
