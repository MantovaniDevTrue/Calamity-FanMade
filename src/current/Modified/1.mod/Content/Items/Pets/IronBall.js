import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

export class IronBall extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Pets/IronBall';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 20;
        this.Item.height = 20;
        this.Item.maxStack = 1;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        this.Item.useTime = 20;
        this.Item.useAnimation = 20;
        this.Item.noMelee = true;
        this.Item.useTurn = false;
        this.Item.autoReuse = false;
        this.Item.UseSound = Terraria.ID.SoundID.NPCHit4;
        this.Item.value = Terraria.Item.sellPrice(0, 2, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.Item.buffType = 0;
        this.Item.buffTime = 0;
        this.Item.shoot = 0;
        this.Item.shootSpeed = 0;
        this.MenuCategories.push('summon');
        // Keep the pet item explicitly reachable from TLPro's dedicated Calamity cheat tab.
        // ItemLoader also adds all mod items later, but this direct category membership makes
        // Iron Ball available even if another late menu pass is skipped by the host.
        this.MenuCategories.push('Calamity');
    }

    PostSetupContent() {
        this.Item.buffType = Number(ModBuff.getTypeByName('BeldumBuff') || 0);
        this.Item.buffTime = 18000;
        this.Item.shoot = 0;
        this.Item.shootSpeed = 0;
    }

    UseItem(item, player) {
        if (!player || !player.active || player.dead) return false;
        const buff = Number(ModBuff.getTypeByName('BeldumBuff') || 0);
        const pet = Number(ModProjectile.getTypeByName('Beldum') || 0);
        if (!(buff > 0 && pet > 0)) return false;

        try { player.AddBuff(buff, 18000, true); } catch (e) {
            try { player.AddBuff(buff, 18000, false); } catch (_) { }
        }

        if (CountOwned(player, pet) <= 0 && Number(Terraria.PlayerIndex(player)) === Number(Terraria.Main.myPlayer)) {
            let source = null;
            try { source = player.GetProjectileSource_Item(item); } catch (e) { }
            try {
                NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Zero, pet, 0, 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
            } catch (e) {
                try { tl.log(`[CalamityPort IronBall] Beldum manual spawn failed: ${e}`); } catch (_) { }
            }
        }
        return true;
    }

    Shoot() { return false; }
}
