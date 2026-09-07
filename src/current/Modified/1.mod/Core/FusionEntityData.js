const MAX_NPCS = 200;
const MAX_PROJECTILES = 1000;
function EntityNumber(entity, name, fallback = 0) {
    try {
        const value = Number(entity && entity[name]);
        return Number.isFinite(value) ? value : fallback;
    } catch (e) {
        return fallback;
    }
}

function CreateEntry(entity, kind, token, seed = null) {
    const data = Object.create(null);
    if (seed && typeof seed === 'object') {
        for (const key of Object.keys(seed))
            data[key] = seed[key];
    }
    return {
        kind,
        token,
        type: EntityNumber(entity, 'type', -1),
        owner: kind === 'projectile' ? EntityNumber(entity, 'owner', -1) : -1,
        identity: kind === 'projectile' ? EntityNumber(entity, 'identity', -1) : -1,
        data,
        bags: Object.create(null)
    };
}

export class FusionEntityData {
    static NPCSlots = new Array(MAX_NPCS);

    // Projectile.whoAmI is inherited from Entity. On TLPro Android the first
    // inherited-member access for each NativeObject can enumerate the entire
    // Projectile -> Entity -> Object chain. Projectiles already expose owner,
    // identity and type directly, so projectile-local JS state is keyed by the
    // native network identity instead of the inherited 0..999 slot.
    static ProjectileOwners = new Map();

    static NextToken = 1;
    static ActiveNPCSlots = 0;
    static ActiveProjectileSlots = 0;
    static NPCResets = 0;
    static ProjectileResets = 0;

    static ValidNPCIndex(index) {
        return index >= 0 && index < MAX_NPCS;
    }

    static ValidProjectileIdentity(owner, identity) {
        return Number.isFinite(owner) && Number.isFinite(identity) && owner >= 0 && identity >= 0;
    }

    static ProjectileOwnerMap(owner, create = false) {
        let map = this.ProjectileOwners.get(owner);
        if (!map && create) {
            map = new Map();
            this.ProjectileOwners.set(owner, map);
        }
        return map || null;
    }

    static ResetNPC(npc, seed = null) {
        const index = EntityNumber(npc, 'whoAmI', -1);
        if (!this.ValidNPCIndex(index))
            return null;
        if (!this.NPCSlots[index])
            this.ActiveNPCSlots++;
        const entry = CreateEntry(npc, 'npc', this.NextToken++, seed);
        this.NPCSlots[index] = entry;
        this.NPCResets++;
        return entry;
    }

    static ResetProjectile(proj, seed = null) {
        const owner = Math.floor(EntityNumber(proj, 'owner', -1));
        const identity = Math.floor(EntityNumber(proj, 'identity', -1));
        if (!this.ValidProjectileIdentity(owner, identity))
            return null;
        const map = this.ProjectileOwnerMap(owner, true);
        if (!map.has(identity))
            this.ActiveProjectileSlots++;
        const entry = CreateEntry(proj, 'projectile', this.NextToken++, seed);
        map.set(identity, entry);
        this.ProjectileResets++;
        return entry;
    }

    static EnsureNPC(npc) {
        const index = EntityNumber(npc, 'whoAmI', -1);
        if (!this.ValidNPCIndex(index))
            return null;
        const type = EntityNumber(npc, 'type', -1);
        let entry = this.NPCSlots[index];
        if (!entry || entry.type !== type)
            entry = this.ResetNPC(npc);
        return entry;
    }

    static EnsureProjectile(proj) {
        const type = Math.floor(EntityNumber(proj, 'type', -1));
        const owner = Math.floor(EntityNumber(proj, 'owner', -1));
        const identity = Math.floor(EntityNumber(proj, 'identity', -1));
        if (!this.ValidProjectileIdentity(owner, identity))
            return null;
        const map = this.ProjectileOwnerMap(owner, false);
        let entry = map ? map.get(identity) : null;
        if (!entry || entry.type !== type || entry.owner !== owner || entry.identity !== identity)
            entry = this.ResetProjectile(proj);
        return entry;
    }

    static GetNPC(npc) {
        return this.EnsureNPC(npc)?.data ?? null;
    }

    static GetProjectile(proj) {
        return this.EnsureProjectile(proj)?.data ?? null;
    }

    static GetNPCBag(npc, name = 'default', factory = null) {
        const entry = this.EnsureNPC(npc);
        if (!entry)
            return null;
        if (!Object.prototype.hasOwnProperty.call(entry.bags, name)) {
            entry.bags[name] = typeof factory === 'function' ? factory(npc) : Object.create(null);
        }
        return entry.bags[name];
    }

    static GetProjectileBag(proj, name = 'default', factory = null) {
        const entry = this.EnsureProjectile(proj);
        if (!entry)
            return null;
        if (!Object.prototype.hasOwnProperty.call(entry.bags, name)) {
            entry.bags[name] = typeof factory === 'function' ? factory(proj) : Object.create(null);
        }
        return entry.bags[name];
    }

    static PeekProjectileBag(proj, name = 'default') {
        const type = Math.floor(EntityNumber(proj, 'type', -1));
        const owner = Math.floor(EntityNumber(proj, 'owner', -1));
        const identity = Math.floor(EntityNumber(proj, 'identity', -1));
        if (!this.ValidProjectileIdentity(owner, identity))
            return null;
        const map = this.ProjectileOwnerMap(owner, false);
        const entry = map ? map.get(identity) : null;
        if (!entry || entry.type !== type || entry.owner !== owner || entry.identity !== identity)
            return null;
        return Object.prototype.hasOwnProperty.call(entry.bags, name) ? entry.bags[name] : null;
    }

    static ClearNPC(npc) {
        const index = EntityNumber(npc, 'whoAmI', -1);
        if (!this.ValidNPCIndex(index) || !this.NPCSlots[index])
            return;
        this.NPCSlots[index] = null;
        this.ActiveNPCSlots = Math.max(0, this.ActiveNPCSlots - 1);
    }

    static ClearProjectile(proj) {
        const owner = Math.floor(EntityNumber(proj, 'owner', -1));
        const identity = Math.floor(EntityNumber(proj, 'identity', -1));
        if (!this.ValidProjectileIdentity(owner, identity))
            return;
        const map = this.ProjectileOwnerMap(owner, false);
        if (!map || !map.has(identity))
            return;
        map.delete(identity);
        if (map.size === 0)
            this.ProjectileOwners.delete(owner);
        this.ActiveProjectileSlots = Math.max(0, this.ActiveProjectileSlots - 1);
    }

    static ClearAll() {
        this.NPCSlots = new Array(MAX_NPCS);
        this.ProjectileOwners = new Map();
        this.ActiveNPCSlots = 0;
        this.ActiveProjectileSlots = 0;
    }

    static GetStats() {
        return {
            npcSlots: this.ActiveNPCSlots,
            projectileSlots: this.ActiveProjectileSlots,
            npcCapacity: MAX_NPCS,
            projectileCapacity: MAX_PROJECTILES,
            npcResets: this.NPCResets,
            projectileResets: this.ProjectileResets,
            nextToken: this.NextToken
        };
    }
}
