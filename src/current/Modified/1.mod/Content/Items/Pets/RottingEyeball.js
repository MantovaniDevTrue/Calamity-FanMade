import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function ForEachOwnedPet(player, type, callback) {
    let count = 0;
    if (!player || !(type > 0))
        return count;
    try {
        const nativeCount = Math.max(0, Math.floor(Number(player.ownedProjectileCounts[type]) || 0));
        if (!callback || nativeCount <= 0)
            return nativeCount;
    } catch (e) { }
    for (let i = 0; i < 1000; i++) {
        try {
            const proj = Terraria.Main.projectile[i];
            if (!proj || !proj.active)
                continue;
            if (Number(proj.owner) !== Number(Terraria.PlayerIndex(player)))
                continue;
            if (Number(proj.type) !== Number(type))
                continue;
            count++;
            if (callback)
                callback(proj);
        } catch (e) { }
    }
    return count;
}

export class RottingEyeball extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Pets/RottingEyeball';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 32;
        this.Item.height = 32;
        this.Item.maxStack = 1;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        this.Item.useTime = 20;
        this.Item.useAnimation = 20;
        this.Item.noMelee = true;
        this.Item.UseSound = Terraria.ID.SoundID.NPCHit2;
        this.Item.value = Terraria.Item.sellPrice(0, 2, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.Item.buffType = 0;
        this.Item.buffTime = 0;
        this.Item.shoot = 0;
        this.Item.shootSpeed = 0;
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
        const buff = Number(ModBuff.getTypeByName('MiniMindBuff') || 0);
        const pet = Number(ModProjectile.getTypeByName('MiniHiveMind') || 0);
        if (!(buff > 0 && pet > 0))
            return false;
        const existing = ForEachOwnedPet(player, pet, proj => {
            try {
                proj.Kill();
            } catch (e) {
                try {
                    proj.active = false;
                } catch (ignored) { }
            }
        });
        if (existing > 0) {
            try {
                player.ClearBuff(buff);
            } catch (e) { }
            return true;
        }
        try {
            player.AddBuff(buff, 18000, false);
        } catch (e) {
            try {
                player.AddBuff(buff, 18000, true);
            } catch (ignored) { }
        }
        let source = null;
        try {
            source = player.GetProjectileSource_Item(item);
        } catch (e) { }
        try {
            const index = NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Zero, pet, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
            if (index >= 0) {
                const proj = Terraria.Main.projectile[index];
                if (proj)
                    proj.netUpdate = true;
            }
        } catch (e) {
            tl.log(`[CalamityPort] Mini Hive Mind manual spawn failed: ${e}`);
        }
        return true;
    }

    Shoot() {
        return false;
    }
}
