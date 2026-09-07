import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

export class StrangeOrb extends ModItem {
    constructor() { super(); this.Texture = 'Items/Pets/StrangeOrb'; this.ResearchUnlockCount = 1; }

    SetDefaults() {
        const i = this.Item;
        const buff = Number(ModBuff.getTypeByName('OceanSpiritBuff') || 0);
        const pet = Number(ModProjectile.getTypeByName('OceanSpirit') || 0);

        // Faithful Terraria Item.DefaultToVanitypet(projectile, buff) values.
        // Buffs and projectiles load before items in TLPro, so these IDs are already valid here.
        // They MUST be present in SetDefaults: the mobile misc-equipment UI classifies the item
        // from the live Item instance (especially item.shoot), not from ModItem.PostSetupContent.
        i.damage = 0;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.width = 16;
        i.height = 30;
        i.UseSound = Terraria.ID.SoundID.Item2;
        i.useAnimation = 20;
        i.useTime = 20;
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.noMelee = true;
        i.value = Terraria.Item.sellPrice(0, 2, 0, 0);
        i.maxStack = 1;
        i.buffType = buff;
        i.buffTime = 3600;
        i.shoot = pet;
        i.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    PostSetupContent() {
        // Diagnostic only. Do not mutate the template here: doing so is too late for live Items.
        try {
            const pet = Number(ModProjectile.getTypeByName('OceanSpirit') || 0);
            const buff = Number(ModBuff.getTypeByName('OceanSpiritBuff') || 0);
            const lightProj = pet > 0 && Terraria.ID.ProjectileID.Sets.LightPet[pet] === true;
            const lightBuff = buff > 0 && Terraria.Main.lightPet[buff] === true;
            tl.log(`[CalamityPort OceanSpirit] Strange Orb defaults ready; shoot=${Number(this.Item.shoot)}, buff=${Number(this.Item.buffType)}, projectileLight=${lightProj}, buffLight=${lightBuff}.`);
        } catch (_) { }
    }

    UseItem(item, player) {
        if (!player || !player.active || player.dead) return false;
        const buff = Number(ModBuff.getTypeByName('OceanSpiritBuff') || 0);
        const pet = Number(ModProjectile.getTypeByName('OceanSpirit') || 0);
        if (!(buff > 0 && pet > 0)) return false;

        try { player.AddBuff(buff, 3600, true); } catch (_) {
            try { player.AddBuff(buff, 3600, false); } catch (_) { }
        }

        if (Number(Terraria.PlayerIndex(player)) === Number(Terraria.Main.myPlayer) && CountOwned(player, pet) <= 0) {
            let source = null;
            try { source = player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { }
            try {
                const index = NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Zero, pet, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
                try { tl.log(`[CalamityPort OceanSpirit] Strange Orb spawned single light pet; index=${Number(index)}.`); } catch (_) { }
            } catch (e) {
                try { tl.log(`[CalamityPort OceanSpirit] Strange Orb spawn failed: ${e}`); } catch (_) { }
            }
        }
        return true;
    }

    Shoot() { return false; }
}
