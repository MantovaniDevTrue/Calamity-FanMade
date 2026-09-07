import { Terraria, Modules } from './../TL/ModImports.js';
import { ModPlayer } from './../TL/ModPlayer.js';
import { ProjAI } from './../TL/ProjAI.js';

const { Vector2, Color, TileData } = Modules;
const States = new Map();
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const GreenDust = Math.floor(Number(Terraria.ID.DustID.GreenTorch) || 107);
let PurgeTick = -1;

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Tick() { try { return I(Terraria.Main.GameUpdateCount, 0); } catch (e) { return 0; } }
function Owner(p) {
    const i = I(p?.owner, -1); if (i < 0 || i >= 255) return null;
    try { if (i === I(Terraria.Main.myPlayer, -2) && Terraria.Main.LocalPlayer) return Terraria.Main.LocalPlayer; } catch (e) { }
    try { return Terraria.Main.player.get_Item(i); } catch (e) { try { return Terraria.Main.player[i]; } catch (_) { return null; } }
}
function Rect(p) {
    try { const f = p['Rectangle getRect()']; if (typeof f === 'function') return f(); } catch (e) { }
    try { return p.getRect(); } catch (e) { return null; }
}
function Center(p) {
    const r = Rect(p);
    if (r) return { x:N(r.X) + N(r.Width) * 0.5, y:N(r.Y) + N(r.Height) * 0.5 };
    try { return { x:N(p.Center.X), y:N(p.Center.Y) }; } catch (e) { return {x:0,y:0}; }
}
function Velocity(p) {
    try { return { x:N(p.velocity.X), y:N(p.velocity.Y) }; } catch (e) { return {x:0,y:0}; }
}
function SetVelocity(p, x, y) { try { p.velocity = Vector2.new(x, y); } catch (e) { } }
function Key(p) { return `${I(p?.owner,-1)}:${I(p?.identity,-1)}:${I(p?.type,-1)}`; }
function StateFor(p) {
    const key = Key(p); let s = States.get(key);
    if (!s) {
        s = { key, owner:I(p.owner,-1), mode:0, timer:300, targetX:0, targetY:0, caught:-1, waterY:0, waterTick:-9999, waterX:0, waterCenterY:0, lastSeen:Tick() };
        States.set(key, s);
    }
    s.lastSeen = Tick();
    return s;
}
function Purge() {
    const t = Tick(); if (t === PurgeTick || (t % 120) !== 0) return; PurgeTick = t;
    for (const [k,s] of States) if (t - N(s.lastSeen,-9999) > 180) States.delete(k);
}
function Liquid(x,y) {
    const maxX = I(Terraria.Main.maxTilesX,0), maxY = I(Terraria.Main.maxTilesY,0);
    if (x < 1 || y < 1 || x >= maxX-1 || y >= maxY-1) return 0;
    try { return N(new TileData(x,y).liquid,0); } catch (e) { return 0; }
}
function OpenCell(x,y) {
    const maxX = I(Terraria.Main.maxTilesX,0), maxY = I(Terraria.Main.maxTilesY,0);
    if (x < 2 || y < 2 || x >= maxX-2 || y >= maxY-2) return false;
    try {
        const t = new TileData(x,y);
        if (N(t.liquid,0) > 0) return false;
        let active = false;
        try { active = t['bool active()']() === true; } catch (e) { try { active = t.active === true; } catch (_) { } }
        if (!active) return true;
        const type = I(t.type,-1);
        if (type < 0) return true;
        // The ring may overlap decorative/non-solid tiles, matching the original's
        // IsTileSolid() check; only reject active tiles marked solid by Terraria.
        try { return Terraria.Main.tileSolid[type] !== true; } catch (e) { return false; }
    } catch (e) { return false; }
}
function WaterLine(p,s,c) {
    const tick = Tick();
    if (tick - s.waterTick < 8 && Math.abs(c.x-s.waterX)<12 && Math.abs(c.y-s.waterCenterY)<12) return s.waterY;
    const maxY = I(Terraria.Main.maxTilesY,0);
    const tx = Math.max(1, Math.min(I(Terraria.Main.maxTilesX,0)-2, Math.floor(c.x/16)));
    const ty = Math.max(1, Math.min(maxY-2, Math.floor(c.y/16)));
    let found = c.y;
    const here = Liquid(tx,ty);
    if (here > 0) {
        for (let d=1; d<=96 && ty-d>0; d++) {
            if (Liquid(tx,ty-d) <= 0) {
                const wetY = ty-d+1, amount = Liquid(tx,wetY);
                found = wetY*16 + (1 - amount/255)*16;
                break;
            }
        }
    } else {
        for (let d=1; d<=96 && ty+d<maxY-1; d++) {
            const amount = Liquid(tx,ty+d);
            if (amount > 0) { found=(ty+d)*16 + (1-amount/255)*16; break; }
        }
    }
    s.waterTick=tick; s.waterX=c.x; s.waterCenterY=c.y; s.waterY=found;
    return found;
}
function OnScreen(x,y) {
    try {
        const pos = Terraria.Main.screenPosition;
        const sx=N(pos.X), sy=N(pos.Y);
        const sw=Math.max(1,I(Terraria.Main.screenWidth,1)), sh=Math.max(1,I(Terraria.Main.screenHeight,1));
        return x>=sx && x<sx+sw && y>=sy && y<sy+sh;
    } catch(e) { return true; }
}
function WaterColumnNearSurface(x,waterY) {
    const tx=Math.max(1,Math.min(I(Terraria.Main.maxTilesX,0)-2,Math.floor(x/16)));
    const base=Math.max(1,Math.min(I(Terraria.Main.maxTilesY,0)-3,Math.floor(waterY/16)));
    // Keep the airborne rift above the same body of water as the bobber. This avoids
    // choosing open air over a beach/ledge when the bobber is close to shore.
    for(let d=0;d<=4;d++) if(Liquid(tx,base+d)>0)return true;
    return false;
}
function ChooseRift(s,c,waterY) {
    // The official Acrobatic Bobber deliberately spawns its rift in open air up to
    // ~200 px above the water. That is comfortable on keyboard, but on touch it can
    // demand a very large underwater run-up. Preserve the airborne mechanic while
    // constraining the target to a mobile-reachable envelope around the bobber.
    for (let i=0;i<64;i++) {
        const x = c.x + (Math.random()*320-160);
        const y = waterY - (24 + Math.random()*64); // 24..88 px above the surface
        const tx = Math.floor(x/16), ty=Math.floor(y/16);
        if (!OnScreen(x,y) || !OpenCell(tx,ty) || !WaterColumnNearSurface(x,waterY)) continue;
        s.targetX=x; s.targetY=y; return true;
    }
    // Safe fallback: always close enough to reach with one short jump.
    s.targetX=c.x; s.targetY=waterY-40; return true;
}
function DrawRift(s) {
    if (!s || s.targetX===0 && s.targetY===0) return;
    const tick=Tick(); if ((tick + (s.owner&7)) % 15 !== 0) return;
    // Eight dusts every 15 ticks: ~32 particles/s for an active rift, much cheaper
    // than the original continuously refreshed high-resolution particle.
    for (let i=0;i<8;i++) {
        const a=i*Math.PI/4, r=15;
        try {
            const idx=NewDust(Vector2.new(s.targetX+Math.cos(a)*r-1,s.targetY+Math.sin(a)*r-1),2,2,GreenDust,0,0,80,Color.White,.9);
            let d=null; try{d=Terraria.Main.dust.get_Item(idx);}catch(e){try{d=Terraria.Main.dust[idx];}catch(_){}}
            if(d){try{d.noGravity=true;}catch(e){} try{d.velocity=Vector2.Zero;}catch(e){}}
        } catch (e) { }
    }
}
function FishingCheck(p) {
    try { const f=p['void FishingCheck()']; if(typeof f==='function'){f();return true;} } catch(e){}
    try { p.FishingCheck(); return true; } catch(e){}
    return false;
}
function PrepareReel(p,owner,ai,local,c) {
    const caught=I(local[1],0);
    // Same three-way handoff used by Calamity's ReelTheBobberChecks helper.
    if(caught===1){
        try { Terraria.NPC.SpawnOnPlayer(I(p.owner,0),370); } catch(e){}
        ai[0]=2;
    } else if(caught<1){
        const npcType=Math.max(0,-caught);
        if(npcType>0){
            let y=Math.floor(c.y); if(npcType===618)y+=64;
            try { if(npcType===682) Terraria.NPC.unlockedSlimeRedSpawn=true; } catch(e){}
            try {
                const src=Terraria.NPC.GetSpawnSourceForNaturalSpawn();
                Terraria.NPC.NewNPC(src,Math.floor(c.x),y,npcType,0,0,0,0,0,I(p.owner,255));
            } catch(e){}
        }
        ai[0]=2;
    } else {
        let lineSafe=false; try{lineSafe=owner.accFishingLine===true;}catch(e){}
        if(!lineSafe && Math.random()<1/7){ ai[0]=2; ai[1]=0; local[1]=0; }
        else { ai[1]=caught; ai[0]=1; }
    }
    try{p.netUpdate=true;}catch(e){}
}
function HitAnyRift(p,s,ai,local,c) {
    const t=Tick();
    for (const other of States.values()) {
        if (other.owner!==s.owner || N(other.mode,0)!==0 || other.caught===-1 || (other.targetX===0&&other.targetY===0) || t-N(other.lastSeen,-9999)>3) continue;
        const dx=c.x-other.targetX,dy=c.y-other.targetY;
        if(dx*dx+dy*dy>=16*16)continue;
        local[1]=other.caught;
        ai[0]=-1;
        other.targetX=s.targetX; other.targetY=s.targetY; other.caught=s.caught;
        try{p.netUpdate=true;}catch(e){}
        return true;
    }
    return false;
}

export function AcrobaticFishingPreAI(p) {
    if (!p) return true;
    const owner=Owner(p); if(!owner || owner.active===false || owner.dead===true)return true;
    const playerRuntime=ModPlayer.getByName('AcrobaticFishingPlayer');
    if(!playerRuntime || !playerRuntime.IsEnabled(owner))return true;
    playerRuntime.MarkActive(owner);
    Purge();

    const s=StateFor(p), ai=new ProjAI(p), local=new ProjAI(p,true);
    let mode=N(ai[0],0);
    s.mode=mode;
    const c=Center(p), waterY=WaterLine(p,s,c);

    // Once a ring has been touched, let vanilla fishing AI perform the actual
    // reel-in/item delivery. We only hand it the caught item state.
    if(mode===-1){
        const v=Velocity(p), speed=Math.sqrt(v.x*v.x+v.y*v.y);
        if(waterY<=c.y || speed<.5){
            PrepareReel(p,owner,ai,local,c);
            return true;
        }
        // Keep the airborne return physics under the minigame until it reaches water.
    } else if(mode!==0){
        return true;
    }

    let v=Velocity(p), vx=v.x,vy=v.y;
    if(waterY>=c.y)vy+=.4; else vy-=.1;
    vx*=.975;vy*=.975;
    if(p.wet===true){vx*=.99;vy*=.99;}

    if(mode===0){
        const input=playerRuntime.GetInput(owner);
        if(input.up){
            if(waterY<c.y){
                // Official underwater acceleration: build upward momentum for the jump.
                vy-=vy<0?.6:.3;
            } else if(s.caught!==-1 && (s.targetX!==0||s.targetY!==0)){
                // Mobile-only surface assist. The original expects carried momentum and
                // adds 0.4 gravity while airborne; touch input can lose that momentum at
                // the waterline. A small extra lift makes the official airborne rift
                // reliably reachable without auto-steering the bobber.
                vy-=.55;
            } else if(vy<0){
                vy-=.3;
            }
        }
        if(input.down)vy+=.25;
        if(input.left)vx-=.25;
        if(input.right)vx+=.25;
        if(input.up||input.down||input.left||input.right){try{p.netUpdate=true;}catch(e){}}

        if(waterY<=c.y-8)s.timer-=1+Math.floor(Math.random()*4);
        if(s.timer<=0){
            if(FishingCheck(p)){
                const aiAfter=new ProjAI(p), localAfter=new ProjAI(p,true);
                if(N(aiAfter[1],0)<0){
                    s.caught=I(localAfter[1],-1);
                    aiAfter[1]=0; localAfter[1]=0;
                    ChooseRift(s,c,waterY);
                    s.timer=600;
                }
            }
        }
        DrawRift(s);
        // Multiple-bobber support: touching any active ring transfers that ring's catch.
        HitAnyRift(p,s,ai,local,c);
        mode=N(ai[0],0);
        s.mode=mode;
    }

    SetVelocity(p,vx,vy);
    if(mode===-1){
        const speed=Math.sqrt(vx*vx+vy*vy);
        if(waterY<=c.y||speed<.5){PrepareReel(p,owner,ai,local,c);return true;}
    }
    // While freely steering the bobber, skip vanilla AI exactly like the official
    // Acrobatic Bobber minigame. Projectile movement/collision still remains native.
    return false;
}
