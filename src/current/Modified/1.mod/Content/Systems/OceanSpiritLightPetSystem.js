import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { ModProjectile } from './../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }

export class OceanSpiritLightPetSystem extends ModSystem {
    constructor() { super(); this.Reset(); }

    Reset() {
        this.ItemType = 0;
        this.BuffType = 0;
        this.ProjectileType = 0;
        this.TrackedIndex = -1;
        this.WasEquipped = false;
        this.AppliedByEquip = false;
        this.Timer = 0;
        this.NextRespawn = 0;
        this.LoggedEquip = false;
    }

    PostSetupContent() {
        this.ItemType = N(ModItem.getTypeByName('StrangeOrb'), 0);
        this.BuffType = N(ModBuff.getTypeByName('OceanSpiritBuff'), 0);
        this.ProjectileType = N(ModProjectile.getTypeByName('OceanSpirit'), 0);
    }

    OnWorldLoad() {
        this.TrackedIndex = -1;
        this.WasEquipped = false;
        this.AppliedByEquip = false;
        this.Timer = 0;
        this.NextRespawn = 0;
        this.LoggedEquip = false;
    }

    OnWorldUnload() {
        this.TrackedIndex = -1;
        this.WasEquipped = false;
        this.AppliedByEquip = false;
    }

    EquippedItem(player) {
        try {
            const item = player?.miscEquips?.[1];
            return item && N(item.type, 0) === this.ItemType ? item : null;
        } catch (_) { return null; }
    }

    HasBuff(player) {
        try { return this.BuffType > 0 && N(player.FindBuffIndex(this.BuffType), -1) >= 0; } catch (_) { return false; }
    }

    RemoveAppliedBuff(player) {
        if (!this.AppliedByEquip || !player || this.BuffType <= 0) return;
        try {
            const index = N(player.FindBuffIndex(this.BuffType), -1);
            if (index >= 0) player.DelBuff(index);
        } catch (_) { }
        this.AppliedByEquip = false;
    }

    TrackedPet(player) {
        const i = N(this.TrackedIndex, -1);
        if (i < 0 || i >= 1000 || !player) return null;
        try {
            const p = Terraria.Main.projectile[i];
            if (p && p.active && N(p.type) === this.ProjectileType && N(p.owner) === N(Terraria.PlayerIndex(player))) return p;
        } catch (_) { }
        this.TrackedIndex = -1;
        return null;
    }

    FindExistingPet(player) {
        if (!player || this.ProjectileType <= 0) return -1;
        const owner = N(Terraria.PlayerIndex(player), -1);
        for (let i = 0; i < 1000; i++) {
            let p = null;
            try { p = Terraria.Main.projectile[i]; } catch (_) { }
            if (p && p.active && N(p.owner) === owner && N(p.type) === this.ProjectileType) return i;
        }
        return -1;
    }

    Spawn(player, item) {
        if (!player || !item || this.ProjectileType <= 0) return -1;
        let source = null;
        try { source = player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { }
        try {
            const index = N(NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Zero, this.ProjectileType, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null), -1);
            if (index >= 0) this.TrackedIndex = index;
            return index;
        } catch (_) { return -1; }
    }

    ApplyEquippedLight(player) {
        if (!player || this.ItemType <= 0) return;
        const item = this.EquippedItem(player);
        if (!item) return;
        let x = 0, y = 0;
        try {
            const i = N(this.TrackedIndex, -1);
            const p = i >= 0 && i < 1000 ? Terraria.Main.projectile[i] : null;
            if (p && p.active && N(p.type) === this.ProjectileType) {
                const r = p['Rectangle getRect()']();
                x = N(r.X) + N(r.Width) * 0.5; y = N(r.Y) + N(r.Height) * 0.5;
            }
        } catch (_) { }
        if (!(x || y)) {
            try { const c = Terraria.PlayerCenter(player); x = N(c.X); y = N(c.Y) - 40; } catch (_) { return; }
        }
        const wet = !!(player.wet || player.honeyWet || player.lavaWet || player.shimmerWet);
        try {
            if (wet) Terraria.Lighting.AddLight(Math.floor(x / 16), Math.floor(y / 16), 0, 2, 2.5);
            else Terraria.Lighting.AddLight(Math.floor(x / 16), Math.floor(y / 16), 0, 1.32, 1.65);
        } catch (_) { }
    }

    Update() {
        if (Terraria.Main.gameMenu === true) return;
        const player = Terraria.Main.LocalPlayer;
        if (!player || player.dead === true) return;
        if (!(this.ItemType > 0 && this.BuffType > 0 && this.ProjectileType > 0)) this.PostSetupContent();
        // Do not probe miscEquips through the native bridge every frame while this
        // light pet is not equipped. State detection already runs at 6 Hz. Once
        // equipped, keep the AddLight path at full rate for smooth lighting.
        if (this.WasEquipped) this.ApplyEquippedLight(player);
        if (this.Timer-- > 0) return;
        this.Timer = 9; // six state checks per second; no world/projectile scan on the healthy path.

        const item = this.EquippedItem(player);
        if (item && !this.WasEquipped) this.ApplyEquippedLight(player);

        if (!item) {
            if (this.WasEquipped) this.RemoveAppliedBuff(player);
            this.WasEquipped = false;
            this.TrackedIndex = -1;
            this.LoggedEquip = false;
            return;
        }

        if (!this.WasEquipped) {
            this.WasEquipped = true;
            if (!this.HasBuff(player)) {
                try { player.AddBuff(this.BuffType, 3600, true); this.AppliedByEquip = true; }
                catch (_) { try { player.AddBuff(this.BuffType, 3600, false); this.AppliedByEquip = true; } catch (_) { } }
            }
        } else if (!this.HasBuff(player)) {
            try { player.AddBuff(this.BuffType, 3600, true); } catch (_) { try { player.AddBuff(this.BuffType, 3600, false); } catch (_) { } }
        }

        // Healthy path only checks the one tracked projectile slot. A full 1000-slot lookup happens
        // only when entering the light-pet slot or after the tracked projectile actually disappears.
        if (this.TrackedPet(player)) return;
        const tick = N(Terraria.Main.GameUpdateCount, 0);
        if (tick < this.NextRespawn) return;
        this.NextRespawn = tick + 120;

        const existing = this.FindExistingPet(player);
        if (existing >= 0) { this.TrackedIndex = existing; return; }
        const spawned = this.Spawn(player, item);
        if (spawned >= 0 && !this.LoggedEquip) {
            this.LoggedEquip = true;
            try { tl.log(`[CalamityPort OceanSpirit] light-pet slot activated; projectile=${spawned}, single-spawn controller active.`); } catch (_) { }
        }
    }
}
