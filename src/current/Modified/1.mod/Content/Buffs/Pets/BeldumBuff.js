import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

export class BeldumBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Pets/BeldumBuff';
        this.NextSpawnAttempt = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
        Terraria.Main.vanityPet[this.Type] = true;
        Terraria.Main.lightPet[this.Type] = false;
    }

    UpdatePlayer(player, buffIndex) {
        if (!player || !player.active) return;
        if (player.dead) return;
        try { player.buffTime[buffIndex] = 18000; } catch (e) { }

        const type = Number(ModProjectile.getTypeByName('Beldum') || 0);
        if (!(type > 0) || CountOwned(player, type) > 0 || Number(Terraria.PlayerIndex(player)) !== Number(Terraria.Main.myPlayer)) return;
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        if (tick < this.NextSpawnAttempt) return;
        let source = null;
        try { source = player.GetSource_Buff(buffIndex); } catch (e) {
            try { source = player.GetProjectileSource_Item(player.HeldItem); } catch (_) { }
        }
        try {
            NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Zero, type, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
            this.NextSpawnAttempt = tick + 15;
        } catch (e) {
            this.NextSpawnAttempt = tick + 120;
            try { tl.log(`[CalamityPort IronBall] Beldum buff spawn retry throttled: ${e}`); } catch (_) { }
        }
    }
}
