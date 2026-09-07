import { Terraria, Modules } from './../../TL/ModImports.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../Core/FrozenCubeTargetRuntime.js';
const { Vector2 } = Modules;
export function CanChase(npc){try{return !!(npc&&npc.active&&Number(npc.life)>0&&npc.friendly!==true&&npc.dontTakeDamage!==true);}catch(_){return false;}}
export function FindTarget(projectile,maxDistance=450,requireLOS=true){
    ScanFrozenCubeNPCs(2);
    const pc=projectile.Center,cx=Number(pc.X),cy=Number(pc.Y),maxSq=Number(maxDistance)*Number(maxDistance);
    let best=null,bestSq=maxSq;
    for(const idx of FrozenCubeTrackedIndices()){
        const npc=FrozenCubeNPC(idx);if(!CanChase(npc))continue;
        const c=npc.Center,dx=Number(c.X)-cx,dy=Number(c.Y)-cy,d=dx*dx+dy*dy;
        if(d<bestSq){best=npc;bestSq=d;}
    }
    if(best&&requireLOS){try{if(!Terraria.Collision.CanHitLine(projectile.position,projectile.width,projectile.height,best.position,best.width,best.height))return null;}catch(_){}}
    return best;
}
export function Home(projectile,npc,speed=6,inertia=20){
    if(!CanChase(npc))return false;
    const c=npc.Center,p=projectile.Center,dx=Number(c.X)-Number(p.X),dy=Number(c.Y)-Number(p.Y),len=Math.sqrt(dx*dx+dy*dy);
    if(!(len>0.001))return false;
    const desired=Vector2.new(dx/len*Number(speed),dy/len*Number(speed));
    const v=projectile.velocity,inv=Math.max(1,Number(inertia));
    projectile.velocity=Vector2.new((Number(v.X)*(inv-1)+Number(desired.X))/inv,(Number(v.Y)*(inv-1)+Number(desired.Y))/inv);
    return true;
}
