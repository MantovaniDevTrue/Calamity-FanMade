import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function source(player, item) {
    try { return player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { }
    try { return null; } catch (_) { return null; }
}
function projectileAt(index) {
    try { return Terraria.Main.projectile.get_Item(Number(index)); } catch (_) { return null; }
}
function setNative(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a.set_Item(Number(index),value);return true;}catch(_){}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}return false;}catch(_){return false;}}
function safeSpawn(pos,player,w,h){const x=Number(pos?.X)||0,y=Number(pos?.Y)||0;function solid(c){try{return Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'](Vector2.new((Number(c.X)||0)-w/2,(Number(c.Y)||0)-h/2),w,h);}catch(_){return false;}}const wanted=Vector2.new(x,y);if(!solid(wanted))return wanted;let base=null;try{base=player.MountedCenter;}catch(_){base=wanted;}for(const oy of [-48,-80,-112,40]){const c=Vector2.new(Number(base.X)||x,(Number(base.Y)||y)+oy);if(!solid(c))return c;}return base;}

export class BelladonnaSpiritStaff extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/BelladonnaSpiritStaff';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults(){setNative(Terraria.ID.ItemID.Sets,'GamepadWholeScreenUseRange',this.Type,true);try{Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type]=true;}catch(_){}setNative(Terraria.ID.ItemID.Sets,'LockOnIgnoresCollision',this.Type,true);try{Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type]=true;}catch(_){}setNative(Terraria.ID.ItemID.Sets,'StaffMinionSlotsRequired',this.Type,1);try{Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type]=1;}catch(_){} }

    SetDefaults() {
        try { this.CloneDefaults(Terraria.ID.ItemID.BabyBirdStaff); } catch (_) { }
        const i = this.Item;
        i.width = 40;
        i.height = 42;
        i.damage = 22;
        i.knockBack = 1;
        i.mana = 10;
        i.summon = true;
        i.useAnimation = 36;
        i.useTime = 36;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.UseSound = Terraria.ID.SoundID.Item44;
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        i.noMelee = true;
        i.autoReuse = true;
        i.buffType = ModBuff.getTypeByName('BelladonnaSpiritBuff');
        i.shoot = ModProjectile.getTypeByName('BelladonnaSpirit');
        i.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    ModifyShootStats(item, player, stats) {
        try {
            const m = Terraria.Main.MouseWorld;
            if (m && Number.isFinite(Number(m.X)) && Number.isFinite(Number(m.Y))) stats.position = safeSpawn(Vector2.new(Number(m.X), Number(m.Y)), player, 28, 48);
            else stats.position = Terraria.PlayerCenter(player);
        } catch (_) { stats.position = Terraria.PlayerCenter(player); }
        stats.velocity = Vector2.Zero;
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const pType = Number(ModProjectile.getTypeByName('BelladonnaSpirit') || type || 0);
        const bType = Number(ModBuff.getTypeByName('BelladonnaSpiritBuff') || 0);
        if (!(pType > 0 && bType > 0)) return false;
        try { player.AddBuff(bType, 2, false); } catch (_) { }
        const id = NewProjectile(source(player, item), position, Vector2.Zero, pType, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        const p = projectileAt(id);
        if (p) {
            p.damage = Math.max(1, Number(damage) || Number(item.damage) || 22);
            p.originalDamage = Number(item.damage) || 22;
            p.minion = true; p.minionSlots = 1; p.friendly = true; p.hostile = false; p.netUpdate = true;
        }
        return false;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(Terraria.ID.ItemID.Vine, 4)
            .AddIngredient(Terraria.ID.ItemID.JungleSpores, 5)
            .AddIngredient(Terraria.ID.ItemID.Stinger, 8)
            .AddIngredient(Terraria.ID.ItemID.RichMahogany, 25)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
