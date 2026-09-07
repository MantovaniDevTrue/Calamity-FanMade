import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { IsVictideSummonerActive } from './../../../Core/VictideRuntime.js';
import { PlayItemSound } from '../../../Common/Snippets/LegacySoundCompat.js';

const { Vector2, Color } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
let CachedSpikeType = 0;
function NPCRect(npc) {
    if (!npc)
        return null;
    try {
        return npc['Rectangle getRect()']();
    } catch (e) {
        return null;
    }
}

function NPCCenter(npc) {
    const r = NPCRect(npc);
    return r ? Vector2.new(Number(r.X) + Number(r.Width) * 0.5, Number(r.Y) + Number(r.Height) * 0.5) : null;
}

function IsValidTarget(npc, proj, range) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.life) <= 0 || Number(npc.lifeMax) <= 5)
        return false;
    try {
        if (!npc['bool CanBeChasedBy(object attacker, bool ignoreDontTakeDamage)'](proj, false))
            return false;
    } catch (e) { }
    const center = NPCCenter(npc);
    if (!center)
        return false;
    const dx = Number(center.X) - Number(proj.Center.X);
    const dy = Number(center.Y) - Number(proj.Center.Y);
    return dx * dx + dy * dy <= range * range;
}

function ResolveTarget(found) {
    if (found === null || found === undefined)
        return null;
    try {
        if (found.active !== undefined)
            return found;
    } catch (e) { }
    const i = Math.floor(Number(found));
    if (Number.isFinite(i) && i >= 0 && i < 200) {
        try {
            return Terraria.Main.npc[i];
        } catch (e) { }
    }
    return null;
}

function AcquireTarget(proj, player) {
    try {
        if (player.HasMinionAttackTargetNPC) {
            const selected = Terraria.Main.npc[Math.floor(Number(player.MinionAttackTargetNPC))];
            if (IsValidTarget(selected, proj, 450))
                return selected;
        }
    } catch (e) { }
    try {
        const found = ResolveTarget(proj.FindTargetWithinRange(300, true));
        if (IsValidTarget(found, proj, 300))
            return found;
    } catch (e) { }
    return null;
}

function MoveToward(proj, target, responsiveness) {
    const x = Number(target.X) - Number(proj.Center.X);
    const y = Number(target.Y) - Number(proj.Center.Y);
    proj.velocity = Vector2.new(x * responsiveness, y * responsiveness);
}

function DustBurst(proj, count) {
    if (Terraria.Main.netMode === 2)
        return;
    for (let i = 0; i < count; i++) {
        try {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.7 + Math.random() * 2.0;
            const d = NewDust(proj.position, proj.width, proj.height, 179, Math.cos(angle) * speed, Math.sin(angle) * speed, 0, Color.White, 0.9);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        } catch (e) { }
    }
}

export class VictideSeaSnail extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/VictideSeaSnail';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 7;
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 30;
        p.height = 30;
        p.netImportant = true;
        p.friendly = false;
        p.hostile = false;
        p.ignoreWater = true;
        p.minion = true;
        p.minionSlots = 0;
        p.timeLeft = 90000;
        p.penetrate = -1;
        p.tileCollide = false;
    }

    OnSpawn(proj) {
        const s = FusionEntityData.GetProjectileBag(proj, 'victideSeaSnail', () => ({ stand: 0, frameCounter: 0, fire: 30, target: null }));
        s.stand = 0;
        s.frameCounter = 0;
        s.fire = 30;
        s.target = null;
        DustBurst(proj, 18);
    }

    Fire(proj, player, target) {
        if (Number(proj.owner) !== Number(Terraria.Main.myPlayer))
            return;
        if (!(CachedSpikeType > 0))
            CachedSpikeType = Number(ModProjectile.getTypeByName('UrchinSpike') || 0);
        if (!(CachedSpikeType > 0))
            return;
        let source = null;
        try {
            source = proj.GetProjectileSource_FromThis();
        } catch (e) { }
        const count = 3 + Math.floor(Math.random() * 4);
        const center = NPCCenter(target) || proj.Center;
        const baseX = Number(center.X) - Number(proj.Center.X);
        const baseY = Number(center.Y) - Number(proj.Center.Y);
        const length = Math.max(1, Math.sqrt(baseX * baseX + baseY * baseY));
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 1.1;
            const speed = 7 + Math.random() * 3;
            const vx = baseX / length * speed + Math.cos(spread) * (Math.random() - 0.5) * 2.2;
            const vy = baseY / length * speed + Math.sin(spread) * (Math.random() - 0.5) * 2.2;
            NewProjectile(source, proj.Center, Vector2.new(vx, vy), CachedSpikeType, proj.damage, 1, proj.owner, 0, 0, 0, null);
        }
        try {
            PlayItemSound(42, proj.Center, 0, 0.8);
        } catch (e) { }
        DustBurst(proj, 6);
    }

    AI(proj) {
        const player = Terraria.Main.player[Number(proj.owner)];
        if (!player || player.dead || !IsVictideSummonerActive(player)) {
            proj.timeLeft = 0;
            return;
        }
        proj.timeLeft = 2;
        const s = FusionEntityData.GetProjectileBag(proj, 'victideSeaSnail', () => ({ stand: 0, frameCounter: 0, fire: 30, target: null }));
        const velocity = Terraria.PlayerVelocity(player);
        const moving = Math.abs(Number(velocity.X)) + Math.abs(Number(velocity.Y)) > 0.18;
        if (moving)
            s.stand = 0;
        else
            s.stand = Number(s.stand || 0) + 1;
        const direction = Number(Terraria.PlayerDirection(player)) || 1;
        const center = Terraria.PlayerCenter(player);
        const hidden = Number(s.stand) < 200;
        const desired = hidden
            ? Vector2.new(Number(center.X), Number(center.Y) - 60)
            : Vector2.new(Number(center.X) - direction * 34, Number(center.Y) + 18);
        MoveToward(proj, desired, hidden ? 0.24 : 0.13);
        proj.rotation = hidden ? Number(proj.rotation) + 0.14 : Number(proj.rotation) * 0.82;
        s.frameCounter = Number(s.frameCounter || 0) + 1;
        if (s.frameCounter >= 6) {
            s.frameCounter = 0;
            if (hidden)
                proj.frame = Math.max(0, Number(proj.frame) - 1);
            else
                proj.frame = Math.min(6, Number(proj.frame) + 1);
        }
        const dx = Number(proj.Center.X) - Number(center.X);
        const dy = Number(proj.Center.Y) - Number(center.Y);
        if (dx * dx + dy * dy > 500 * 500) {
            proj.Center = desired;
            proj.velocity = Vector2.Zero;
            proj.netUpdate = true;
        }
        s.fire = Number(s.fire || 0) - 1;
        if (!IsValidTarget(s.target, proj, 320) || s.fire % 12 === 0)
            s.target = AcquireTarget(proj, player);
        if (s.target && s.fire <= 0) {
            this.Fire(proj, player, s.target);
            s.fire = 60;
        }
        try {
        } catch (e) { }
    }

    CanDamage() {
        return false;
    }

    OnKill(proj) {
        DustBurst(proj, 18);
    }
}
