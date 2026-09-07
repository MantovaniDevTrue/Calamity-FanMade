import { Terraria } from './../TL/ModImports.js';

const Magazines = new Map();
const Holdouts = new Map();
function PlayerKey(player) {
    const id = Number(player && Terraria.PlayerIndex(player));
    return Number.isFinite(id) ? Math.floor(id) : -1;
}

export class M1GarandRuntime {
    static GetShots(player) {
        const key = PlayerKey(player);
        if (key < 0)
            return 0;
        if (!Magazines.has(key))
            Magazines.set(key, 0);
        return Math.max(0, Math.min(8, Math.floor(Number(Magazines.get(key)) || 0)));
    }
    static SetShots(player, value) {
        const key = PlayerKey(player);
        if (key < 0)
            return 0;
        const shots = Math.max(0, Math.min(8, Math.floor(Number(value) || 0)));
        Magazines.set(key, shots);
        return shots;
    }
    static ConsumeShot(player) {
        const current = this.GetShots(player);
        return this.SetShots(player, Math.max(0, current - 1));
    }
    static Reload(player) {
        return this.SetShots(player, 8);
    }
    static SetHoldout(player, projectileIndex) {
        const key = PlayerKey(player);
        if (key >= 0)
            Holdouts.set(key, Math.floor(Number(projectileIndex) || -1));
    }
    static ClearHoldout(player, projectileIndex = null) {
        const key = PlayerKey(player);
        if (key < 0)
            return;
        if (projectileIndex === null || Number(Holdouts.get(key)) === Number(projectileIndex))
            Holdouts.delete(key);
    }
    static GetHoldoutIndex(player) {
        const key = PlayerKey(player);
        if (key < 0)
            return -1;
        return Math.floor(Number(Holdouts.get(key)) || -1);
    }
    static HasActiveHoldout(player, projectileType) {
        const key = PlayerKey(player);
        if (key < 0)
            return false;
        const cached = this.GetHoldoutIndex(player);
        if (cached >= 0 && cached < 1000) {
            try {
                const proj = Terraria.Main.projectile[cached];
                if (proj && proj.active && Number(proj.owner) === key && Number(proj.type) === Number(projectileType))
                    return true;
            } catch (e) { }
        }
        for (let i = 0; i < 1000; i++) {
            try {
                const proj = Terraria.Main.projectile[i];
                if (proj && proj.active && Number(proj.owner) === key && Number(proj.type) === Number(projectileType)) {
                    Holdouts.set(key, i);
                    return true;
                }
            } catch (e) { }
        }
        Holdouts.delete(key);
        return false;
    }
    static Summary(player) {
        return `${this.GetShots(player)}/8 rounds, holdout=${this.GetHoldoutIndex(player)}`;
    }
}
