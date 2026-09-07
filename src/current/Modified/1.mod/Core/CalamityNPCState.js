export class CalamityNPCState {
    // Terraria has 200 NPC slots. Use a fixed slot table for the normal hot path so AI/
    // draw callbacks do not allocate a `${whoAmI}:${type}` string and hit Map every time.
    // The Map remains only as a compatibility fallback for invalid/nonstandard slot ids.
    static Slots = new Array(200).fill(null);
    static States = new Map();

    static Index(npc) {
        const i = Math.floor(Number(npc?.whoAmI));
        return Number.isFinite(i) && i >= 0 && i < 200 ? i : -1;
    }

    static Key(npc) {
        return `${Number(npc?.whoAmI)}:${Number(npc?.type)}`;
    }

    static Create(npc, knownWhoAmI = null, knownType = null) {
        const whoAmI = knownWhoAmI == null ? Number(npc?.whoAmI) : Number(knownWhoAmI);
        const type = knownType == null ? Number(npc?.type) : Number(knownType);
        return {
            whoAmI,
            type,
            age: 0,
            retargetTimer: 0,
            jumpCooldown: 0,
            stuckTicks: 0,
            lastX: Number(npc?.position?.X),
            lastDirection: Number(npc?.direction) || 1,
            phase: 0,
            attackTimer: 0,
            decisionTimer: 0,
            subphaseTimer: 0,
            flyAwayTimer: 0,
            superchargeTimer: 0,
            superchargedEver: false,
            charging: false,
            chargeRadius: 0,
            lastChargedCount: 0,
            flags: 0
        };
    }

    static Get(npc) {
        const index = this.Index(npc);
        const type = Number(npc?.type);
        if (index >= 0) {
            let state = this.Slots[index];
            if (!state || state.type !== type) {
                state = this.Create(npc, index, type);
                this.Slots[index] = state;
            }
            return state;
        }

        const key = this.Key(npc);
        let state = this.States.get(key);
        if (!state || state.type !== type) {
            state = this.Create(npc, null, type);
            this.States.set(key, state);
        }
        return state;
    }

    static Reset(npc) {
        const index = this.Index(npc);
        const type = Number(npc?.type);
        const state = this.Create(npc, index >= 0 ? index : null, type);
        if (index >= 0) this.Slots[index] = state;
        else this.States.set(this.Key(npc), state);
        return state;
    }

    static Update(npc) {
        const state = this.Get(npc);
        state.age++;
        if (state.retargetTimer > 0) state.retargetTimer--;
        if (state.jumpCooldown > 0) state.jumpCooldown--;
        if (state.attackTimer > 0) state.attackTimer--;
        if (state.decisionTimer > 0) state.decisionTimer--;
        if (state.superchargeTimer > 0) state.superchargeTimer--;
        return state;
    }

    static Remove(npc) {
        const index = this.Index(npc);
        if (index >= 0) {
            const state = this.Slots[index];
            const type = Number(npc?.type);
            if (!state || state.type === type) this.Slots[index] = null;
            return;
        }
        this.States.delete(this.Key(npc));
    }

    static Clear() {
        for (let i = 0; i < this.Slots.length; i++) this.Slots[i] = null;
        this.States.clear();
    }

    static Count() {
        let count = this.States.size;
        for (let i = 0; i < this.Slots.length; i++) if (this.Slots[i]) count++;
        return count;
    }
}
