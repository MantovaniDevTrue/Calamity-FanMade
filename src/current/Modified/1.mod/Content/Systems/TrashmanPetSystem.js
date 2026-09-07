import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { ModProjectile } from './../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }

export class TrashmanPetSystem extends ModSystem {
    constructor() { super(); this.Reset(); }
    Reset() { this.ItemType = 0; this.BuffType = 0; this.PetType = 0; this.Timer = 0; this.Tracked = -1; this.WasEquipped = false; this.Applied = false; }
    PostSetupContent() {
        this.ItemType = I(ModItem.getTypeByName('TrashmanTrashcan'));
        this.BuffType = I(ModBuff.getTypeByName('DannyDevito'));
        this.PetType = I(ModProjectile.getTypeByName('DannyDevitoPet'));
    }
    OnWorldLoad() { this.Timer = 0; this.Tracked = -1; this.WasEquipped = false; this.Applied = false; this.NextRecoveryScan = 0; }
    Equipped(player) { try { const item = player?.miscEquips?.[0]; return item && I(item.type) === this.ItemType ? item : null; } catch (_) { return null; } }
    HasBuff(player) { try { return this.BuffType > 0 && I(player.FindBuffIndex(this.BuffType), -1) >= 0; } catch (_) { return false; } }
    TrackedPet(player) {
        const i = I(this.Tracked, -1); if (i < 0 || i >= 1000) return null;
        try { const p = Terraria.Main.projectile[i]; if (p && p.active && I(p.type) === this.PetType && I(p.owner) === I(Terraria.PlayerIndex(player))) return p; } catch (_) { }
        this.Tracked = -1; return null;
    }
    FindExisting(player) {
        const owner = I(Terraria.PlayerIndex(player), -1);
        for (let i = 0; i < 1000; i++) { let p = null; try { p = Terraria.Main.projectile[i]; } catch (_) { } if (p && p.active && I(p.type) === this.PetType && I(p.owner) === owner) return i; }
        return -1;
    }
    Spawn(player, item) {
        let source = null; try { source = player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { }
        try { const idx = I(NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Zero, this.PetType, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null), -1); if (idx >= 0) this.Tracked = idx; return idx; } catch (_) { return -1; }
    }
    Update() {
        if (Terraria.Main.gameMenu === true) return;
        const player = Terraria.Main.LocalPlayer; if (!player || !player.active || player.dead) return;
        if (!(this.ItemType > 0 && this.BuffType > 0 && this.PetType > 0)) this.PostSetupContent();
        if (this.Timer-- > 0) return; this.Timer = 9;
        const item = this.Equipped(player);
        if (!item) {
            if (this.WasEquipped && this.Applied) { try { const bi = I(player.FindBuffIndex(this.BuffType), -1); if (bi >= 0) player.DelBuff(bi); } catch (_) { } }
            this.WasEquipped = false; this.Applied = false; this.Tracked = -1; return;
        }
        if (!this.WasEquipped) { this.WasEquipped = true; if (!this.HasBuff(player)) { try { player.AddBuff(this.BuffType, 3600, true); this.Applied = true; } catch (_) { try { player.AddBuff(this.BuffType, 3600, false); this.Applied = true; } catch (_) { } } } }
        else if (!this.HasBuff(player)) { try { player.AddBuff(this.BuffType, 3600, true); } catch (_) { try { player.AddBuff(this.BuffType, 3600, false); } catch (_) { } } }
        if (this.TrackedPet(player)) return;
        let tick = 0; try { tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0); } catch (_) { }
        if (tick >= Number(this.NextRecoveryScan || 0)) {
            this.NextRecoveryScan = tick + 120;
            const existing = this.FindExisting(player); if (existing >= 0) { this.Tracked = existing; return; }
        }
        this.Spawn(player, item);
    }
}
