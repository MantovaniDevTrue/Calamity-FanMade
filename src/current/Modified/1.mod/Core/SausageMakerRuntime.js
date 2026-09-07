import { Terraria } from './../TL/ModImports.js';

const ActiveSpears = new Array(256);

function ProjectileOwnerIndex(projectile) {
    if (!projectile)
        return -1;
    let value = -1;
    try {
        value = Number(projectile.owner);
    } catch (e) {
        return -1;
    }
    return Number.isFinite(value) ? Math.floor(value) : -1;
}

function PlayerIndex(player) {
    if (!player)
        return -1;
    let value = -1;
    try {
        value = Number(player.whoAmI);
    } catch (e) {
        return -1;
    }
    return Number.isFinite(value) ? Math.floor(value) : -1;
}

export function RegisterSausageSpear(projectile) {
    const owner = ProjectileOwnerIndex(projectile);
    if (owner < 0 || owner >= ActiveSpears.length)
        return;
    ActiveSpears[owner] = {
        whoAmI: Number(projectile.whoAmI),
        identity: Number(projectile.identity),
        type: Number(projectile.type)
    };
}

export function ClearSausageSpear(projectile) {
    const owner = ProjectileOwnerIndex(projectile);
    if (owner < 0 || owner >= ActiveSpears.length)
        return;
    const entry = ActiveSpears[owner];
    if (!entry)
        return;
    if (Number(entry.whoAmI) === Number(projectile.whoAmI) || Number(entry.identity) === Number(projectile.identity)) {
        ActiveSpears[owner] = null;
    }
}

export function CanUseSausageMaker(player, projectileType) {
    const owner = PlayerIndex(player);
    if (owner < 0 || owner >= ActiveSpears.length)
        return true;
    const entry = ActiveSpears[owner];
    if (!entry)
        return true;
    let projectile = null;
    try {
        projectile = Terraria.Main.projectile[Math.floor(Number(entry.whoAmI))];
    } catch (e) { }
    const valid = projectile && projectile.active &&
        Number(projectile.owner) === owner &&
        Number(projectile.type) === Number(projectileType) &&
        Number(projectile.identity) === Number(entry.identity);
    if (!valid) {
        ActiveSpears[owner] = null;
        return true;
    }
    return false;
}
