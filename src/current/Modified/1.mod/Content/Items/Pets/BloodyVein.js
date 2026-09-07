import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class BloodyVein extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Pets/BloodyVein';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 32;
        i.height = 32;
        i.maxStack = 1;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.useTime = 20;
        i.useAnimation = 20;
        i.noMelee = true;
        i.UseSound = Terraria.ID.SoundID.NPCHit9;
        i.value = Terraria.Item.sellPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.buffType = 0;
        i.buffTime = 0;
        i.shoot = 0;
        i.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    PostSetupContent() {
        this.Item.buffType = 0;
        this.Item.buffTime = 0;
        this.Item.shoot = 0;
        this.Item.shootSpeed = 0;
    }

    UseItem(item, player) {
        if (!player || !player.active || player.dead)
            return false;
        const buff = Number(ModBuff.getTypeByName('BloodBound') || 0), pet = Number(ModProjectile.getTypeByName('PerforaMini') || 0);
        if (!(buff > 0 && pet > 0))
            return false;
        if (CountOwned(player, pet) > 0) {
            for (let i = 0; i < 1000; i++) {
                const p = Terraria.Main.projectile[i];
                if (p && p.active && Number(p.owner) === Number(Terraria.PlayerIndex(player)) && Number(p.type) === pet)
                    try {
                        p.Kill();
                    } catch (e) {
                        p.active = false;
                    }
            }
            try {
                player.ClearBuff(buff);
            } catch (e) { }
            return true;
        }
        player.AddBuff(buff, 18000, false);
        NewProjectile(player.GetProjectileSource_Item(item), Terraria.PlayerCenter(player), Vector2.Zero, pet, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
        return true;
    }

    Shoot() {
        return false;
    }
}
