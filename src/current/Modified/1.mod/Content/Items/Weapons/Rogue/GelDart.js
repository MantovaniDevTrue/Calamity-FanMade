import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, MarkRogueProjectile, MarkStealthStrike } from './../../../../Core/RogueRuntime.js';
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function getProj(i){try{return Terraria.Main.projectile.get_Item(Number(i));}catch(e){return null;}}
export class GelDart extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/Rogue/GelDart';this.ResearchUnlockCount=1;}
    SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=26;i.height=54;i.damage=21;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=11;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useTime=11;i.knockBack=2.5;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,10,0,0);i.rare=Terraria.ID.ItemRarityID.LightRed;i.shoot=ModProjectile.getTypeByName('GelDartProjectile');i.shootSpeed=14;this.MenuCategories.push('thrown');}
    Shoot(item,player,position,velocity,type,damage,knockBack){const stealth=ConsumeStealthStrike(player,item);let source=null;try{source=player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(e){}const idx=NewProjectile(source,position,velocity,Number(type),damage,knockBack,Terraria.PlayerIndex(player),0,0,0,null);const p=getProj(idx);if(p){MarkRogueProjectile(p,'GelDart',false);if(stealth){MarkStealthStrike(p,'GelDart',false);p.penetrate=6;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;}}return false;}

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),18).AddIngredient(ModItem.getTypeByName('BlightedGel'),18).AddTile(220).Register();
    }
}
