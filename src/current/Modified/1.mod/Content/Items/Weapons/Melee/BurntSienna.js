import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function Source(player,item){try{return player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(_){}try{return null;}catch(_){return null;}}
export class BurntSienna extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Melee/BurntSienna';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=42;i.height=54;i.damage=32;i.melee=true;i.useAnimation=24;i.useTime=24;i.useTurn=true;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=5.5;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.shootSpeed=5;this.MenuCategories.push('melee');}
 OnHitNPC(item,player,npc){if(!npc||N(npc.life)>0)return;try{if(player.moonLeech===true)return;}catch(_){}const t=Number(ModProjectile.getTypeByName('BurntSiennaProj')||0);if(!(t>0))return;const src=Source(player,item),owner=Terraria.PlayerIndex(player),c=npc.Center||Terraria.PlayerCenter(player),sx=Math.floor(Math.random()*3),sy=3+Math.floor(Math.random()*2);for(const vx of [-sx,sx,0])NewProjectile(src,c,Vector2.new(vx,-sy),t,0,0,owner,0,0,0,null);}
}
