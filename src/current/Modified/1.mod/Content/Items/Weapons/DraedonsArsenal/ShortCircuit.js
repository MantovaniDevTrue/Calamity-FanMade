import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { WorldDB } from './../../../../TL/WorldDB.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';
const { Vector2 } = Modules;
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function Rotate(v,a,s=1){const x=N(v.X),y=N(v.Y),c=Math.cos(a),q=Math.sin(a);return Vector2.new((x*c-y*q)*s,(x*q+y*c)*s);}

function setShortCircuitPose(player) {
    if (Math.floor(N(player.altFunctionUse)) === 2) return;
    const center = SafePlayerCenter(player), aim = AimFromMouse(player, center);
    FaceAim(player, aim);
    const gravDir = N(player.gravDir, 1) < 0 ? -1 : 1;
    const reverseAngle = Math.atan2(-N(aim.Y), -N(aim.X));
    const armRotation = reverseAngle * gravDir + Math.PI / 2;
    try { player.SetCompositeArmFront(true, Terraria.Player.CompositeArmStretchAmount.Full, armRotation); } catch (_) { }
    const itemRotation = armRotation + (Math.PI / 2) * gravDir;
    const max = Math.max(1, N(player.itemTimeMax, 8)), time = Math.max(0, N(player.itemTime, 0));
    const progress = 0.5 - time / max;
    let pullback = 7;
    if (progress < 0.4) pullback -= 2.75 * Math.pow((0.6 - progress) / 0.6, 2);
    const mounted = player.MountedCenter;
    const pos = Vector2.new(N(mounted.X) + Math.cos(itemRotation) * pullback, N(mounted.Y) + Math.sin(itemRotation) * pullback);
    CleanHoldStyleTLPro(player, itemRotation, pos, Vector2.new(42, 24), Vector2.new(-24, 4));
}

export class ShortCircuit extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/DraedonsArsenal/ShortCircuit';this.ResearchUnlockCount=1;}
    SetStaticDefaults(){
        try{Terraria.ID.ItemID.Sets.ItemsThatAllowRepeatedRightClick[this.Type]=true;}catch(_){}
        try{Terraria.ID.ItemID.Sets.IsRangedSpecialistWeapon[this.Type]=true;}catch(_){}
    }
    SetDefaults(){
        const i=this.Item;
        i.width=42;i.height=24;i.ranged=true;i.damage=11;i.knockBack=7;
        i.useTime=8;i.useAnimation=8;i.autoReuse=true;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee=true;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;
        i.UseSound=Terraria.ID.SoundID.Item11;
        // Primary fire is deliberately native on TLPro. The previous manual path could be
        // suppressed by the mobile secondary-input bridge before ModItem.Shoot was reached.
        i.shoot=ModProjectile.getTypeByName('ShortCircuitShot');
        i.shootSpeed=6;
        this.MenuCategories.push('ranged');
    }
    CanUseItem(){ return true; }
    UseStyle(item,player){ setShortCircuitPose(player); }
    ModifyShootStats(item,player,stats){
        // Official primary shot is 1.5x base speed with +-0.15 rad spread and a small muzzle offset.
        // Keep the projectile mobile-optimized internally; this only prepares the native spawn.
        try{
            const v=stats.velocity;
            const out=Rotate(v,(Math.random()-.5)*0.30,1.5);
            stats.velocity=out;
            const pos=stats.position;
            stats.position=Vector2.new(N(pos.X)+N(out.X),N(pos.Y)+N(out.Y)-5);
        }catch(_){}
    }
    Shoot(item,player,position,velocity,type,damage,knockBack){
        // A real altFunctionUse=2 is handled by DraedonTier1InputPlayer (taser hook).
        // Never treat controlUseTile as alt-fire on mobile; normal touch always reaches native fire.
        try{if(Math.floor(N(player.altFunctionUse))===2)return false;}catch(_){}
        return true;
    }
    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('MysteriousCircuitry'),7)
            .AddIngredient(ModItem.getTypeByName('DubiousPlating'),5)
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'),4)
            .AddIngredient(ModItem.getTypeByName('SeaPrism'),7)
            .AddCondition(() => !!WorldDB.Instance && WorldDB.get('calamity:draedon:sunkenSeaSchematicFound') === true)
            .AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
