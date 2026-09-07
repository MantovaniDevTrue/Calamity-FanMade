import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
const { Color, Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SolidCollision=Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
function setArray(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}try{a.set_Item(Number(index),value);return true;}catch(_){}return false;}catch(_){return false;}}
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function center(e){try{const r=e['Rectangle getRect()']();return Vector2.new(N(r.X)+N(r.Width)*.5,N(r.Y)+N(r.Height)*.5);}catch(_){try{return e.Center;}catch(__){return Vector2.Zero;}}}
function playerAt(i){try{const a=Terraria.Main.player,g=a&&a['Player get_Item(int index)'];return typeof g==='function'?(g(i)||null):null;}catch(_){return null;}}
function npcAt(i){try{const a=Terraria.Main.npc,g=a&&a['NPC get_Item(int index)'];return typeof g==='function'?(g(i)||null):null;}catch(_){return null;}}
function ownerOf(p){const i=Math.floor(N(p.owner,-1));if(i<0)return null;try{if(i===Math.floor(N(Terraria.Main.myPlayer,-2)))return Terraria.Main.LocalPlayer;}catch(_){}return playerAt(i);}
function valid(n){try{return !!n&&n.active&&!n.friendly&&!n.townNPC&&!n.dontTakeDamage&&N(n.life)>0;}catch(_){return false;}}
function resolveTarget(p,range){try{const f=p['NPC FindTargetWithinRange(float maxRange, bool checkCanHit)'](range,true);if(f&&f.active!==undefined)return valid(f)?f:null;const i=Math.floor(N(f,-1));if(i>=0&&i<200){const n=npcAt(i);return valid(n)?n:null;}}catch(_){}return null;}
function source(){try{return null;}catch(_){return null;}}
function solidRect(x,y,w,h){
    try{return SolidCollision(Vector2.new(x,y),Math.max(1,Math.floor(w)),Math.max(1,Math.floor(h)))===true;}catch(_){return false;}
}
function manualGroundMove(p,st,vx,vy){
    let x=N(p.position.X),y=N(p.position.Y),w=Math.max(1,Math.floor(N(p.width,56))),h=Math.max(1,Math.floor(N(p.height,38)));

    // Se algum frame deixou o corpo alguns pixels dentro do terreno, sobe ate sair.
    // O limite maior evita o Stormjaw ficar preso nas quinas de blocos/half blocks.
    for(let k=0;k<24&&solidRect(x,y,w,h);k++)y-=1;
    try{p.position=Vector2.new(x,y);}catch(_){}

    let grounded=solidRect(x+4,y+h,Math.max(1,w-8),4);
    if(grounded&&vy>=0)vy=0;

    // Resolve o eixo Y em passos de 1 px para nao atravessar piso fino.
    if(Math.abs(vy)>0.001&&solidRect(x,y+vy,w,h)){
        const dir=vy>0?1:-1,limit=Math.ceil(Math.abs(vy));
        let allowed=0;
        for(let step=1;step<=limit;step++){
            const amt=Math.min(Math.abs(vy),step)*dir;
            if(solidRect(x,y+amt,w,h))break;
            allowed=amt;
        }
        vy=allowed;
        if(dir>0)grounded=true;
    }

    // Resolve o eixo X. Primeiro tenta subir suavemente ate um bloco (step-up de ate 18 px).
    // Se a parede for maior, faz um pulo real em vez de zerar X para sempre.
    let nextY=y+vy;
    if(Math.abs(vx)>0.001&&solidRect(x+vx,nextY,w,h)){
        let stepped=false;
        if(grounded){
            for(let up=1;up<=18;up++){
                if(!solidRect(x+vx,nextY-up,w,h)){
                    y-=up;
                    nextY-=up;
                    try{p.position=Vector2.new(x,y);}catch(_){}
                    stepped=true;
                    break;
                }
            }
        }
        if(!stepped){
            if(grounded&&N(st.jumpCooldown)<=0){
                const hop=-10;
                // Mantem parte do impulso horizontal se o destino do pulo estiver livre.
                if(!solidRect(x+vx,y+hop,w,h)){
                    vy=hop;
                    grounded=false;
                    st.jumpCooldown=22;
                }else if(!solidRect(x+vx*.45,y+hop,w,h)){
                    vx*=.45;
                    vy=hop;
                    grounded=false;
                    st.jumpCooldown=22;
                }else{
                    vx=0;
                }
            }else{
                vx=0;
            }
        }
    }

    st.grounded=grounded;
    return {vx,vy,grounded};
}

export class StormjawBaby extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Summon/StormjawBaby';this.BuffType=0;this.SparkType=0;}
    SetStaticDefaults(){try{Terraria.Main.projFrames[this.Type]=10;}catch(_){}try{Terraria.Main.projPet[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type]=true;}catch(_){} }
    PostSetupContent(){this.BuffType=Number(ModBuff.getTypeByName('BabyStormlionBuff')||0);this.SparkType=Number(ModProjectile.getTypeByName('StormjawSpark')||0);}
    OnSpawn(p){const st=FusionEntityData.GetProjectileBag(p,'stormjawBaby',()=>({age:0,target:null,nextScan:0,spark:0,fly:false,jumpCooldown:0,grounded:false,firstAILogged:false,lastX:N(p.Center?.X),stuck:0,contactCooldown:0,baseDamage:0}));const live=Math.floor(N(p.damage,0)),orig=Math.floor(N(p.originalDamage,0));const d=Math.max(1,live>0?live:(orig>0?orig:11));st.baseDamage=d;try{p.damage=d;p.originalDamage=Math.max(d,orig);p.friendly=true;p.minion=true;}catch(_){}}
    SetDefaults(){const p=this.Projectile;p.width=56;p.height=38;p.netImportant=true;p.friendly=true;p.hostile=false;p.ignoreWater=true;p.minionSlots=1;p.timeLeft=18000;p.penetrate=-1;p.tileCollide=false;p.minion=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=20;}
    AI(p){
        const pl=ownerOf(p);if(!pl||!pl.active||pl.dead){try{p.Kill();}catch(_){p.active=false;}return;}
        if(!(this.BuffType>0))this.PostSetupContent();let bi=-1;try{bi=this.BuffType>0?pl.FindBuffIndex(this.BuffType):-1;}catch(_){}
        if(bi<0){try{p.friendly=false;p.damage=0;p.Kill();}catch(_){p.active=false;}return;}
        // O próprio minion renova o buff, igual Belladonna/Herring. Evito escrever em buffTime[index] no NativeObject.
        try{pl.AddBuff(this.BuffType,2,true);}catch(_){}p.timeLeft=2;
        const st=FusionEntityData.GetProjectileBag(p,'stormjawBaby',()=>({age:0,target:null,nextScan:0,spark:0,fly:false,jumpCooldown:0,grounded:false,firstAILogged:false,lastX:N(p.Center?.X),stuck:0,contactCooldown:0,baseDamage:Math.max(1,Math.floor(N(p.damage,N(p.originalDamage,11))))}));
        st.age=N(st.age)+1;
        if(!(N(st.baseDamage)>0))st.baseDamage=Math.max(1,Math.floor(N(p.damage,N(p.originalDamage,11))));
        try{p.friendly=true;p.hostile=false;p.minion=true;if(!(N(p.damage)>0))p.damage=Math.max(1,Math.floor(N(st.baseDamage)));if(!(N(p.originalDamage)>0))p.originalDamage=Math.max(1,Math.floor(N(st.baseDamage)));}catch(_){}
        if(N(st.contactCooldown)>0)st.contactCooldown--;
        if(!st.firstAILogged){st.firstAILogged=true;try{tl.log(`[CalamityPort Stormjaw] first AI reached; owner=${p.owner}; identity=${p.identity}; buffIndex=${bi}.`);}catch(_){}}
        const pc=Terraria.PlayerCenter(pl),c=center(p),pdx=N(pc.X)-N(c.X),pdy=N(pc.Y)-N(c.Y),pdist=Math.sqrt(pdx*pdx+pdy*pdy);
        if(pdist>2000){p.Center=pc;p.velocity=Vector2.Zero;st.fly=false;}
        if(pdist>950||Math.abs(pdy)>320)st.fly=true;else if(st.fly&&pdist<110)st.fly=false;
        p.minionSlots=1;
        const tick=Math.floor(N(Terraria.Main.GameUpdateCount));if(tick>=N(st.nextScan)||!valid(st.target)){st.nextScan=tick+20;st.target=resolveTarget(p,800);}
        const t=valid(st.target)?st.target:null;
        if(st.fly){
            p.tileCollide=false;const d=Math.sqrt(pdx*pdx+pdy*pdy)||1,tx=pdx/d*12,ty=pdy/d*12;p.velocity=Vector2.new((N(p.velocity.X)*14+tx)/15,(N(p.velocity.Y)*14+ty)/15);
            p.spriteDirection=N(p.velocity.X)>=0?1:-1;p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+(p.spriteDirection<0?Math.PI:0);
            p.frameCounter=N(p.frameCounter)+1;if(N(p.frameCounter)>3){p.frameCounter=0;const f=N(p.frame);p.frame=(f<6||f>9||f>=9)?6:f+1;}
            return;
        }
        // A colisao de tile deste minion e resolvida manualmente. No TLPro Android o solver nativo chama Kill ao tocar
        // no bloco; cancelar esse Kill mantem o minion vivo, mas nao devolve a resposta fisica, fazendo ele atravessar o chao.
        p.tileCollide=false;p.rotation=0;
        let goalX=N(pc.X)-(15+N(pl.width)*.5)*N(pl.direction,1)-N(p.minionPos)*40*N(pl.direction,1),goalY=N(pc.Y);
        if(t){const tc=center(t);goalX=N(tc.X);goalY=N(tc.Y);}
        const dx=goalX-N(c.X),dy=goalY-N(c.Y),absx=Math.abs(dx);
        let vx=N(p.velocity.X);const desired=dx<0?-8:8;if(absx>8)vx+=(desired-vx)*0.14;else vx*=0.82;vx=Math.max(-9,Math.min(9,vx));
        const oldVy=N(p.velocity.Y);let vy=oldVy+0.4;if(vy>10)vy=10;
        if(N(st.jumpCooldown)>0)st.jumpCooldown--;
        if(t&&dy<-30&&absx<300&&(st.grounded||Math.abs(oldVy)<0.8)&&N(st.jumpCooldown)<=0){vy=dy<-200?-15:dy<-100?-12:-9;st.grounded=false;st.jumpCooldown=24;}
        const solved=manualGroundMove(p,st,vx,vy);vx=solved.vx;vy=solved.vy;
        const nowX=N(c.X),lastX=N(st.lastX,nowX),movedX=Math.abs(nowX-lastX);st.lastX=nowX;
        if(solved.grounded&&Math.abs(vx)>.45&&movedX<.08)st.stuck=N(st.stuck)+1;else st.stuck=0;
        if(N(st.stuck)>8&&N(st.jumpCooldown)<=0){vy=-10;st.grounded=false;st.jumpCooldown=22;st.stuck=0;}
        p.velocity=Vector2.new(vx,vy);p.spriteDirection=vx>=0?1:-1;
        const attacking=!!t&&Math.sqrt(dx*dx+dy*dy)<90;
        if(attacking){
            // O TLPro nem sempre chama Damage() automaticamente para um projPet custom.
            // Quando o corpo realmente encosta no alvo, dispara o Damage nativo com cooldown local.
            if(N(st.contactCooldown)<=0){let touch=false;try{const a=p['Rectangle getRect()'](),b=t['Rectangle getRect()']();touch=N(a.X)<N(b.X)+N(b.Width)&&N(a.X)+N(a.Width)>N(b.X)&&N(a.Y)<N(b.Y)+N(b.Height)&&N(a.Y)+N(a.Height)>N(b.Y);}catch(_){}if(touch){try{p.Damage();}catch(_){try{p['void Damage()']();}catch(__){}}st.contactCooldown=20;}}
            st.spark=N(st.spark)+1;if(st.spark>=28&&Math.floor(N(p.owner))===Math.floor(N(Terraria.Main.myPlayer))){st.spark=0;if(!(this.SparkType>0))this.SparkType=Number(ModProjectile.getTypeByName('StormjawSpark')||0);if(this.SparkType>0){const cc=center(p),count=1+Math.floor(Math.random()*3);for(let k=0;k<count;k++){const v=Vector2.new(-5+Math.random()*10,-5+Math.random()*10);NewProjectile(source(),cc,v,this.SparkType,N(p.damage),N(p.knockBack),N(p.owner),0,0,0,null);}}}}else if(st.spark>0)st.spark--;
        p.frameCounter=N(p.frameCounter)+1+Math.floor(Math.abs(vx));if(N(p.frameCounter)>10){p.frameCounter=0;p.frame=(N(p.frame)+1)%6;}
    }
    // Fica como guarda de seguranca caso algum sistema externo reative tileCollide. A fisica normal usa manualGroundMove.
    OnTileCollide(){return false;}
    CanDamage(p){return !!(p&&p.active&&p.friendly&&N(p.damage)>0);}
    MinionContactDamage(p){return !!(p&&p.active&&p.friendly&&N(p.damage)>0);}
}

export class StormjawSpark extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/InvisibleProj';}
    SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'MinionShot',this.Type,true);}
    SetDefaults(){const p=this.Projectile;p.width=6;p.height=12;p.friendly=true;p.hostile=false;p.penetrate=3;p.timeLeft=60;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;p.aiStyle=-1;}
    AI(p){const st=FusionEntityData.GetProjectileBag(p,'stormjawSpark',()=>({age:0}));st.age++;if(st.age>5){let vx=N(p.velocity.X)*.97,vy=N(p.velocity.Y)+.2;if(vy>16)vy=16;p.velocity=Vector2.new(vx,vy);}if(Math.random()<.35){const idx=NewDust(p.position,p.width,p.height,229,0,-2,100,Color.White,1+Math.random()*.5);try{const d=Terraria.Main.dust[idx];if(d)d.noGravity=true;}catch(_){}}}
    OnHitNPC(p,npc){const t=Number(ModBuff.getTypeByName('StaticDischarge')||0);if(t>0&&npc){try{npc.AddBuff(t,120,false);}catch(_){}}}
    OnTileCollide(){return false;}
}
