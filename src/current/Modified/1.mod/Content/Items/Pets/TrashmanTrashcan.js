import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

export class TrashmanTrashcan extends ModItem {
    constructor() { super(); this.Texture = 'Items/Pets/TrashmanTrashcan'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const i = this.Item;
        const buff = Number(ModBuff.getTypeByName('DannyDevito') || 0);
        const pet = Number(ModProjectile.getTypeByName('DannyDevitoPet') || 0);
        i.damage = 0;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.width = 20; i.height = 28;
        i.UseSound = Terraria.ID.SoundID.NPCDeath13;
        i.useAnimation = 20; i.useTime = 20;
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.noMelee = true;
        i.value = Terraria.Item.sellPrice(0, 1, 0, 0);
        i.maxStack = 1;
        i.buffType = buff; i.buffTime = 3600;
        i.shoot = pet; i.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }
    UseItem(item, player) {
        if (!player || !player.active || player.dead) return false;
        const buff = Number(ModBuff.getTypeByName('DannyDevito') || 0);
        const pet = Number(ModProjectile.getTypeByName('DannyDevitoPet') || 0);
        if (!(buff > 0 && pet > 0)) return false;
        try { player.AddBuff(buff, 3600, true); } catch (_) { try { player.AddBuff(buff, 3600, false); } catch (_) { } }
        if (Number(Terraria.PlayerIndex(player)) === Number(Terraria.Main.myPlayer) && CountOwned(player, pet) <= 0) {
            let source = null;
            try { source = player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { }
            try { NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Zero, pet, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null); } catch (_) { }
        }
        return true;
    }
    Shoot() { return false; }
}
