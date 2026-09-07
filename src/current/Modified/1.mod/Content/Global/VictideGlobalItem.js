import { Terraria, Modules } from './../../TL/ModImports.js';
import { GlobalItem } from './../../TL/GlobalItem.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { IsVictideSetActive } from './../../Core/VictideRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let CachedSeashellType = 0;
function DamageSoftCap(value, cap) {
    const input = Math.max(0, Number(value) || 0);
    if (input < cap)
        return Math.floor(input);
    const ratio = Math.sqrt(input / cap) / 1.25 + 0.2;
    return Math.floor(cap * ratio);
}

export class VictideGlobalItem extends GlobalItem {
    Shoot(item, player, position, velocity, type, damage, knockBack) {
        if (!IsVictideSetActive(player))
            return true;
        if (Number(Terraria.PlayerIndex(player)) !== Number(Terraria.Main.myPlayer))
            return true;
        if (item.channel === true)
            return true;
        if (!(item.melee === true || item.ranged === true || item.magic === true || item.summon === true))
            return true;
        if (Math.random() >= 0.10)
            return true;
        if (!(CachedSeashellType > 0))
            CachedSeashellType = Number(ModProjectile.getTypeByName('Seashell') || 0);
        if (!(CachedSeashellType > 0))
            return true;
        let source = null;
        try {
            source = player.GetProjectileSource_Item(item);
        } catch (e) { }
        const shellDamage = Math.max(1, DamageSoftCap(Number(damage) * 2, 46));
        const shellVelocity = Vector2.Multiply(velocity, 1.25);
        NewProjectile(source, position, shellVelocity, CachedSeashellType, shellDamage, 1, Terraria.PlayerIndex(player), 0, 0, 0, null);
        return true;
    }
}
