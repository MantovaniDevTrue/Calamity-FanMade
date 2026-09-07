import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModProjectile } from './../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const MAX_PLAYERS = 256;
const MAX_PROJECTILES = 1000;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function PlayerIndex(player) {
    try {
        const index = Number(Terraria.PlayerIndex(player));
        if (Number.isFinite(index) && index >= 0 && index < MAX_PLAYERS)
            return Math.floor(index);
    } catch (e) { }
    try {
        const index = Number(player.whoAmI);
        if (Number.isFinite(index) && index >= 0 && index < MAX_PLAYERS)
            return Math.floor(index);
    } catch (e) { }
    return -1;
}

function ProjectileSlot(projectile) {
    const slot = Math.floor(Number(projectile && projectile.whoAmI));
    return slot >= 0 && slot < MAX_PROJECTILES ? slot : -1;
}

export class LuxorPlayer extends ModPlayer {
    constructor() {
        super();
        this.Functional = new Array(MAX_PLAYERS).fill(false);
        this.Vanity = new Array(MAX_PLAYERS).fill(false);
        this.HitPending = new Array(MAX_PLAYERS).fill(false);
        this.CrystalSlot = new Array(MAX_PLAYERS).fill(-1);
        this.Hits = new Array(MAX_PLAYERS).fill(0);
        this.Shots = new Array(MAX_PLAYERS).fill(0);
        this.LastClass = new Array(MAX_PLAYERS).fill(0);
        this.LastShotClass = new Array(MAX_PLAYERS).fill(0);
        this.LuxorType = 0;
        this.GeneratedTypes = null;
        this.ValidationTick = new Array(MAX_PLAYERS).fill(0);
    }

    ResetPlayer(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.Functional[index] = false;
        this.Vanity[index] = false;
        this.HitPending[index] = false;
        this.CrystalSlot[index] = -1;
        this.Hits[index] = 0;
        this.Shots[index] = 0;
        this.LastClass[index] = 0;
        this.LastShotClass[index] = 0;
        this.ValidationTick[index] = 0;
    }

    OnEnterWorld(player) {
        this.ResetPlayer(player);
    }

    OnRespawn(player) {
        this.ResetPlayer(player);
    }

    UpdateDead(player) {
        this.ResetPlayer(player);
    }

    ResetEffects(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.Functional[index] = false;
        this.Vanity[index] = false;
    }

    SetFunctional(player, item) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.Functional[index] = true;
    }

    SetVanity(player, item) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        this.Vanity[index] = true;
    }

    IsFunctional(player) {
        const index = PlayerIndex(player);
        return index >= 0 && this.Functional[index] === true;
    }

    IsVanityOnly(player) {
        const index = PlayerIndex(player);
        return index >= 0 && this.Vanity[index] === true && this.Functional[index] !== true;
    }

    IsActive(player) {
        const index = PlayerIndex(player);
        return index >= 0 && (this.Functional[index] === true || this.Vanity[index] === true);
    }

    SetLastClass(player, classType) {
        const index = PlayerIndex(player);
        if (index >= 0)
            this.LastClass[index] = Math.max(0, Math.floor(Number(classType) || 0));
    }

    GetLastClass(player) {
        const index = PlayerIndex(player);
        return index >= 0 ? Math.max(0, Math.floor(Number(this.LastClass[index]) || 0)) : 0;
    }

    HasPendingHit(player) {
        const index = PlayerIndex(player);
        return index >= 0 && this.HitPending[index] === true;
    }

    ConsumePendingHit(player, classType) {
        const index = PlayerIndex(player);
        if (index < 0)
            return false;
        if (!this.HitPending[index])
            return false;
        this.HitPending[index] = false;
        this.Shots[index]++;
        this.LastShotClass[index] = Math.max(0, Math.floor(Number(classType) || 0));
        return true;
    }

    MarkHit(player) {
        const index = PlayerIndex(player);
        if (index < 0 || !this.Functional[index])
            return;
        this.HitPending[index] = true;
        this.Hits[index]++;
    }

    ResolveGeneratedTypes() {
        if (this.GeneratedTypes)
            return this.GeneratedTypes;
        const names = [
            'Luxor',
            'LuxorsGiftMelee',
            'LuxorsGiftRanged',
            'LuxorsGiftMagic',
            'LuxorsGiftSummon',
            'LuxorsGiftRogue',
            'LuxorsGiftClassless'
        ];
        const set = new Set();
        for (const name of names) {
            const type = Number(ModProjectile.getTypeByName(name) || 0);
            if (type > 0)
                set.add(type);
        }
        if (set.size >= 7)
            this.GeneratedTypes = set;
        return set;
    }

    IsGeneratedProjectile(projectile) {
        return !!(projectile && this.ResolveGeneratedTypes().has(Number(projectile.type)));
    }

    OnHitNPC(player, item, npc, damageDone, knockBack) {
        if (Number(damageDone) > 0)
            this.MarkHit(player);
    }

    OnHitNPCWithProj(player, npc, projectile) {
        if (!projectile || projectile.friendly !== true || this.IsGeneratedProjectile(projectile))
            return;
        this.MarkHit(player);
    }

    FindExistingCrystal(player) {
        if (!(this.LuxorType > 0))
            this.LuxorType = Number(ModProjectile.getTypeByName('Luxor') || 0);
        if (!(this.LuxorType > 0))
            return -1;
        const owner = PlayerIndex(player);
        if (owner < 0)
            return -1;
        for (let i = 0; i < MAX_PROJECTILES; i++) {
            const projectile = Terraria.Main.projectile[i];
            if (projectile && projectile.active && Number(projectile.type) === this.LuxorType && Number(projectile.owner) === owner)
                return i;
        }
        return -1;
    }

    EnsureCrystal(player, item = null) {
        const index = PlayerIndex(player);
        if (index < 0 || !player || !player.active || player.dead)
            return -1;
        if (!(this.LuxorType > 0))
            this.LuxorType = Number(ModProjectile.getTypeByName('Luxor') || 0);
        if (!(this.LuxorType > 0))
            return -1;

        const knownSlot = Math.floor(Number(this.CrystalSlot[index]));
        if (knownSlot >= 0 && knownSlot < MAX_PROJECTILES) {
            const known = Terraria.Main.projectile[knownSlot];
            if (known && known.active && Number(known.type) === this.LuxorType && Number(known.owner) === index)
                return knownSlot;
        }

        try {
            if (Number(player.ownedProjectileCounts[this.LuxorType]) > 0) {
                const existing = this.FindExistingCrystal(player);
                if (existing >= 0) {
                    this.CrystalSlot[index] = existing;
                    return existing;
                }
            }
        } catch (e) { }

        if (index !== Number(Terraria.Main.myPlayer))
            return -1;

        let source = null;
        if (item) {
            try {
                source = player.GetProjectileSource_Item(item);
            } catch (e) {
                try {
                    source = player['IEntitySource GetProjectileSource_Item(Item item)'](item);
                } catch (ignored) { }
            }
        }
        if (!source) {
            try {
                source = player.GetProjectileSource_Item(player.HeldItem);
            } catch (e) { }
        }
        const slot = NewProjectile(
            source,
            Terraria.PlayerCenter(player),
            Vector2.Zero,
            this.LuxorType,
            0,
            0,
            index,
            0,
            60,
            0,
            null
        );
        if (slot >= 0 && slot < MAX_PROJECTILES)
            this.CrystalSlot[index] = slot;
        return slot;
    }

    PostUpdate(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return;
        // UpdateAccessory/UpdateVanityAccessory only set flags. Spawn/validate the
        // crystal once here instead of doing the same NativeObject work twice
        // per frame.
        if (this.Functional[index] === true || this.Vanity[index] === true) {
            const knownSlot = Math.floor(Number(this.CrystalSlot[index]));
            this.ValidationTick[index] = (Math.floor(Number(this.ValidationTick[index]) || 0) + 1) % 12;
            if (knownSlot < 0 || this.ValidationTick[index] === 0)
                this.EnsureCrystal(player, null);
        } else {
            this.HitPending[index] = false;
            this.ValidationTick[index] = 0;
        }
    }

    GetStatus(player) {
        const index = PlayerIndex(player);
        if (index < 0)
            return 'player=invalid';
        const slot = Math.floor(Number(this.CrystalSlot[index]));
        let active = false;
        let timer = -1;
        if (slot >= 0 && slot < MAX_PROJECTILES) {
            const projectile = Terraria.Main.projectile[slot];
            active = !!(projectile && projectile.active && Number(projectile.type) === Number(this.LuxorType));
            if (active) {
                try { timer = Number(projectile.ai.get_Item(1)); } catch (e) { }
            }
        }
        return `equipped=${this.Functional[index] === true}, vanity=${this.Vanity[index] === true}, crystal=${active}, pending=${this.HitPending[index] === true}, class=${this.LastClass[index]}, timer=${Math.max(-1, Math.floor(timer))}, hits=${this.Hits[index]}, shots=${this.Shots[index]}, lastShotClass=${this.LastShotClass[index]}`;
    }
}
