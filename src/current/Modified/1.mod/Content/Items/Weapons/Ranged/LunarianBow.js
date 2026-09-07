import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function norm(v, speed) { const x=N(v.X), y=N(v.Y), l=Math.sqrt(x*x+y*y)||1; return Vector2.new(x/l*speed,y/l*speed); }
function rot(v,a){const x=N(v.X),y=N(v.Y),c=Math.cos(a),s=Math.sin(a);return Vector2.new(x*c-y*s,x*s+y*c);}

export class LunarianBow extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Ranged/LunarianBow'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const i=this.Item;i.width=32;i.height=62;i.damage=27;i.ranged=true;i.useTime=22;i.useAnimation=22;
        i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=2;i.value=Terraria.Item.buyPrice(0,10,0,0);
        i.rare=Terraria.ID.ItemRarityID.LightRed;i.UseSound=Terraria.ID.SoundID.Item75;i.autoReuse=true;
        i.shoot=ModProjectile.getTypeByName('LunarBolt');i.shootSpeed=8;i.useAmmo=Terraria.ID.AmmoID.Arrow;
        this.MenuCategories.push('ranged');
    }
    Shoot(item,player,position,velocity,type,damage,knockBack) {
        let shotType=Number(type)||0;
        const lunar=Number(ModProjectile.getTypeByName('LunarBolt')||0);
        try { if (shotType===Number(Terraria.ID.ProjectileID.WoodenArrowFriendly) && lunar>0) shotType=lunar; } catch (_) { }
        if (!(shotType>0)) return false;
        const src=player.GetProjectileSource_Item(item), owner=Terraria.PlayerIndex(player);
        const base=norm(velocity,15), spread=Math.PI*0.1;
        for(let k=0;k<2;k++){
            const off=(k-0.5)*spread;
            const side=rot(base,off), spawn=Vector2.new(N(position.X)+N(side.X),N(position.Y)+N(side.Y));
            NewProjectile(src,spawn,base,shotType,damage,knockBack,owner,0,0,0,null);
        }
        return false;
    }
    AddRecipes(){
        const gel=Number(ModItem.getTypeByName('PurifiedGel')||0);if(!(gel>0))return;
        this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.DemonBow,1).AddIngredient(Terraria.ID.ItemID.BeesKnees,1).AddIngredient(Terraria.ID.ItemID.MoltenFury,1).AddIngredient(gel,10).AddTile(Terraria.ID.TileID.DemonAltar).Register();
        this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.TendonBow,1).AddIngredient(Terraria.ID.ItemID.BeesKnees,1).AddIngredient(Terraria.ID.ItemID.MoltenFury,1).AddIngredient(gel,10).AddTile(Terraria.ID.TileID.DemonAltar).Register();
    }
}
