import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class BloodBound extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Pets/BloodBound';
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
        Terraria.Main.vanityPet[this.Type] = false;
        Terraria.Main.lightPet[this.Type] = false;
        try {
            Terraria.Main.persistentBuff[this.Type] = false;
        } catch (e) { }
    }

    UpdatePlayer(player, index) {
        if (!player || !player.active || player.dead)
            return;
        try {
            player.buffTime[index] = 18000;
        } catch (e) { }
        const type = Number(ModProjectile.getTypeByName('PerforaMini') || 0);
        if (type > 0 && CountOwned(player, type) <= 0 && Number(Terraria.PlayerIndex(player)) === Number(Terraria.Main.myPlayer))
            try {
                NewProjectile(player.GetProjectileSource_Item(player.HeldItem), Terraria.PlayerCenter(player), Vector2.Zero, type, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
            } catch (e) { }
    }
}
