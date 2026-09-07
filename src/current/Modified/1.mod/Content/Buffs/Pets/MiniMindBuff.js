import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class MiniMindBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Pets/MiniMindBuff';
        this.NextSpawnAttempt = 0;
        this.SpawnFailureLogged = false;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
        Terraria.Main.vanityPet[this.Type] = false;
        Terraria.Main.lightPet[this.Type] = false;
        Terraria.Main.persistentBuff[this.Type] = false;
    }

    UpdatePlayer(player, buffIndex) {
        if (!player || !player.active || player.dead)
            return;
        try {
            player.buffTime[buffIndex] = 18000;
        } catch (e) { }
        const type = Number(ModProjectile.getTypeByName('MiniHiveMind') || 0);
        if (!(type > 0) || CountOwned(player, type) > 0 || Number(Terraria.PlayerIndex(player)) !== Number(Terraria.Main.myPlayer))
            return;
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        if (tick < Number(this.NextSpawnAttempt || 0))
            return;
        let source = null;
        try {
            source = player.GetProjectileSource_Item(player.HeldItem);
        } catch (e) { }
        try {
            NewProjectile(source, Terraria.PlayerCenter(player), Vector2.new(0, 0), type, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
            this.NextSpawnAttempt = tick + 15;
        } catch (e) {
            this.NextSpawnAttempt = tick + 120;
            if (!this.SpawnFailureLogged) {
                this.SpawnFailureLogged = true;
                tl.log(`[CalamityPort] Mini Hive Mind spawn retry throttled after failure: ${e}`);
            }
        }
    }
}
