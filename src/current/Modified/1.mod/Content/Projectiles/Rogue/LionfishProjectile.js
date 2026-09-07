import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { IsStealthStrike, SpawnMarkedProjectile } from './../../../Core/RogueRuntime.js';
import { FindTarget } from './../../../Core/PerforatorRewardRuntime.js';
const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function bag(p) { return FusionEntityData.GetProjectileBag(p, 'lionfish', () => ({ age: 0, stuck: -1, ox: 0, oy: 0, nextSpike: 0 })); }

export class LionfishProjectile extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/Lionfish'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 30; p.height = 30; p.friendly = true; p.hostile = false; p.ignoreWater = true;
        p.penetrate = -1; p.alpha = 255; p.timeLeft = 1200; p.tileCollide = true; p.aiStyle = -1;
        p.usesIDStaticNPCImmunity = true; p.idStaticNPCHitCooldown = 10;
    }
    AI(p) {
        const s = bag(p); s.age++;
        if (s.stuck >= 0) {
            let n = null; try { n = Terraria.Main.npc[s.stuck]; } catch (_) { }
            if (!n || !n.active || N(n.life) <= 0) { try { p.Kill(); } catch (_) { p.active = false; } return; }
            p.Center = Vector2.new(N(n.Center.X) + s.ox, N(n.Center.Y) + s.oy);
            p.velocity = Vector2.Zero; p.friendly = false; p.tileCollide = false; p.timeLeft = Math.min(N(p.timeLeft), 240);
            return;
        }
        p.alpha = Math.max(0, N(p.alpha) - 25);
        p.spriteDirection = N(p.velocity.X) >= 0 ? 1 : -1;
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + (p.spriteDirection < 0 ? Math.PI : 0);
        if (s.age >= 45) { p.velocity = Vector2.new(N(p.velocity.X) * 0.98, N(p.velocity.Y) + 0.35); }

        if (IsStealthStrike(p) && N(p.owner) === N(Terraria.Main.myPlayer) && s.age >= s.nextSpike) {
            s.nextSpike = s.age + 7;
            const spike = Number(ModProjectile.getTypeByName?.('UrchinSpikeFugu') || 0);
            if (spike > 0) {
                const owner = (() => { try { return Terraria.Main.player[Math.floor(N(p.owner))]; } catch (_) { return null; } })();
                const oc = owner ? Terraria.PlayerCenter(owner) : p.Center;
                let dx = N(p.Center.X) - N(oc.X), dy = N(p.Center.Y) - N(oc.Y), d = Math.sqrt(dx*dx+dy*dy);
                if (d < 0.01) { const a = Math.random()*Math.PI*2; dx=Math.cos(a);dy=Math.sin(a);d=1; }
                const speed = 4.5 + Math.random()*2;
                const a = (Math.random()-0.5)*Math.PI*0.5, c=Math.cos(a), ss=Math.sin(a);
                const vx=(dx/d*c-dy/d*ss)*speed, vy=(dx/d*ss+dy/d*c)*speed;
                let src=null;
                try {
                    const ownerIndex=Math.floor(N(p.owner,-1));
                    const ownerPlayer=ownerIndex>=0&&ownerIndex<255?Terraria.Main.player[ownerIndex]:null;
                    if(ownerPlayer) src=ownerPlayer['IEntitySource GetProjectileSource_Item(Item item)'](ownerPlayer.HeldItem);
                } catch(_){}
                if(!src){try{src=null;}catch(_){}}
                try{NewProjectile(src,p.Center,Vector2.new(vx,vy),spike,Math.max(1,Math.floor(N(p.damage)*0.5)),N(p.knockBack)*0.5,N(p.owner),0,1,0,null);}catch(_){}
            }
        }
    }
    OnHitNPC(p, npc) {
        try { npc.buffImmune[Terraria.ID.BuffID.Venom] = false; } catch (_) { }
        try { npc.AddBuff(Terraria.ID.BuffID.Venom, 240, false); } catch (_) { }
        const s = bag(p);
        if (s.stuck >= 0 || !npc || !npc.active) return;
        s.stuck = Math.floor(N(npc.whoAmI, -1));
        s.ox = N(p.Center.X) - N(npc.Center.X); s.oy = N(p.Center.Y) - N(npc.Center.Y);
        p.friendly = false; p.tileCollide = false; p.velocity = Vector2.Zero; p.timeLeft = Math.min(N(p.timeLeft), 240);
    }
    CanDamage(p) { return bag(p).stuck < 0; }
}

export class UrchinSpikeFugu extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Melee/UrchinSpikeFugu'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 6; p.height = 6; p.friendly = true; p.hostile = false; p.ignoreWater = true;
        p.alpha = 255; p.penetrate = 2; p.timeLeft = 90; p.tileCollide = true; p.aiStyle = -1;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.noEnchantments = true;
    }
    AI(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'fuguSpike', () => ({ age: 0 })); s.age++;
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X));
        p.alpha = Math.max(0, 255 - Math.floor(Math.min(12, s.age) / 12 * 255));
        if (s.age >= 12) {
            const t = FindTarget(p.Center, 256, p);
            if (t) {
                let dx=N(t.Center.X)-N(p.Center.X),dy=N(t.Center.Y)-N(p.Center.Y),d=Math.sqrt(dx*dx+dy*dy);
                if(d>0.001){const vx=(N(p.velocity.X)*20+dx/d*12)/21,vy=(N(p.velocity.Y)*20+dy/d*12)/21;p.velocity=Vector2.new(vx,vy);}
            } else if (s.age >= 48) p.velocity = Vector2.Multiply(p.velocity,0.9);
        }
    }
    CanDamage(p) { const s=FusionEntityData.PeekProjectileBag(p,'fuguSpike'); return !s || Number(s.age)>=12; }
    OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.Poisoned,120,false);}catch(_){} }
}
