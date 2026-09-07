import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { IsStealthStrike, MarkRogueProjectile, MarkStealthStrike } from './../../../Core/RogueRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function center(e){try{const r=e['Rectangle getRect()']();return Vector2.new(N(r.X)+N(r.Width)*.5,N(r.Y)+N(r.Height)*.5);}catch(_){try{return e.Center;}catch(_){return Vector2.Zero;}}}
function projectileAt(i){try{return Terraria.Main.projectile.get_Item(Number(i));}catch(_){return null;}}
function source(){try{return null;}catch(_){return null;}}
function rotate(v,a,scale=1){const x=N(v?.X),y=N(v?.Y),c=Math.cos(a),s=Math.sin(a);return Vector2.new((x*c-y*s)*scale,(x*s+y*c)*scale);}
function childState(p){return FusionEntityData.GetProjectileBag(p,'crystalline',()=>({age:0,mode:0,split:false}));}
function spawnChild(parent,velocity,damage,mode){
    const type=Number(ModProjectile.getTypeByName('Crystalline2')||0);if(!(type>0))return null;
    const id=NewProjectile(source(),center(parent),velocity,type,Math.max(1,Math.floor(N(damage))),N(parent.knockBack),N(parent.owner),0,0,0,null);
    const q=projectileAt(id);if(!q)return null;
    const st=childState(q);st.mode=mode;st.age=0;st.split=false;
    MarkRogueProjectile(q,'Crystalline',true);if(mode>=1)MarkStealthStrike(q,'Crystalline',true);
    if(mode===2)q.timeLeft=20;
    return q;
}

export class CrystallineProj extends ModProjectile{
    constructor(){super();this.Texture='Items/Weapons/Rogue/Crystalline';this.AIType=Terraria.ID.ProjectileID.BoneJavelin;}
    SetDefaults(){const p=this.Projectile;p.width=20;p.height=20;p.friendly=true;p.penetrate=1;p.timeLeft=120;p.melee=false;p.ranged=false;p.magic=false;try{p.aiStyle=Number(Terraria.ID.ProjAIStyleID.StickProjectile);}catch(_){p.aiStyle=2;}}
    AI(p){
        p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/4;
        const st=FusionEntityData.GetProjectileBag(p,'crystallineMain',()=>({age:0,split:false}));st.age=N(st.age)+1;
        if(!st.split&&st.age>=30&&Math.floor(N(p.owner))===Math.floor(N(Terraria.Main.myPlayer))){st.split=true;const stealth=IsStealthStrike(p),angles=[-50,50,150];for(const deg of angles){const v=rotate(p.velocity,deg*Math.PI/180,1);spawnChild(p,v,N(p.damage)*.5,stealth?1:0);}}
    }
}

export class Crystalline2 extends ModProjectile{
    constructor(){super();this.Texture='Items/Weapons/Rogue/Crystalline';}
    SetDefaults(){const p=this.Projectile;p.width=20;p.height=20;p.friendly=true;p.penetrate=1;p.timeLeft=30;p.melee=false;p.ranged=false;p.magic=false;}
    AI(p){
        const st=childState(p);st.age=N(st.age)+1;p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/4;
        if(st.mode===1&&!st.split&&st.age>=10&&Math.floor(N(p.owner))===Math.floor(N(Terraria.Main.myPlayer))){st.split=true;const angles=[-50,50,150];for(const deg of angles)spawnChild(p,rotate(p.velocity,deg*Math.PI/180,.8),N(p.damage)*.5,2);}
    }
    OnKill(p){
        const st=childState(p);if(N(st.mode)<1||Math.floor(N(p.owner))!==Math.floor(N(Terraria.Main.myPlayer)))return;
        const c=center(p);for(let i=0;i<3;i++){const v=Vector2.new(Math.random()*16-8,Math.random()*16-8);const id=NewProjectile(source(),c,v,Terraria.ID.ProjectileID.CrystalShard,Math.max(1,Math.floor(N(p.damage)*.4)),2,N(p.owner),0,0,0,null);const q=projectileAt(id);if(q){try{q.melee=false;q.ranged=false;q.magic=false;}catch(_){}}}
    }
}
