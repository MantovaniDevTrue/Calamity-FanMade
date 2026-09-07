import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function SafeBestClassDamage(player, state, baseDamage) {
    let m = 1;
    for (const key of ['meleeDamage', 'rangedDamage', 'magicDamage', 'minionDamage']) {
        try {
            const v = Number(player[key]);
            if (Number.isFinite(v))
                m = Math.max(m, v);
        } catch (e) { }
    }
    try {
        m = Math.max(m, 1 + Math.max(0, Number(state?.RogueDamageBonus || 0)));
    } catch (e) { }
    return Math.max(1, Math.floor(Number(baseDamage) * m));
}

function Rotate(v, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return Vector2.new(Number(v.X) * c - Number(v.Y) * s, Number(v.X) * s + Number(v.Y) * c);
}

export class AmidiasPendant extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/AmidiasPendant';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 26;
        i.height = 46;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Green;
        i.accessory = true;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (!state || !state.IsLocalPlayer(player) || player.dead)
            return;
        let timer = Number(state.AmidiasPendantCountdown || 0);
        if (timer <= 0)
            timer = 140;
        timer -= 1 + Math.floor(Math.random() * 3);
        state.AmidiasPendantCountdown = timer;
        if (timer > 0)
            return;
        state.AmidiasPendantCountdown = 140;
        const type = Number(ModProjectile.getTypeByName('PearlAuraShard') || 0);
        if (!(type > 0))
            return;
        const center = Terraria.PlayerCenter(player);
        const sx = Number(center.X) - 300 + Math.random() * 600, sy = Number(center.Y) - 1000;
        let dx = Number(center.X) - sx, dy = Number(center.Y) - sy;
        const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const base = Vector2.new(dx / len * 25, dy / len * 25);
        const source = player.GetProjectileSource_Item(item);
        const damage = SafeBestClassDamage(player, state, 30);
        for (let k = 0; k < 2; k++) {
            const spawn = Vector2.new(sx + k * 30 - 30, sy);
            let vel = Rotate(base, (-45 + 45 * k) * Math.PI / 180);
            vel = Vector2.new(Number(vel.X) / 3 + (Math.random() * 3 - 1.5), Number(vel.Y) / 2);
            NewProjectile(source, spawn, vel, type, damage, 5, Terraria.PlayerIndex(player), 0, 0, 0, null);
        }
    }
}
