import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import {
    SetBrokenBiomeRightDown,
    SeedBrokenBiomeProjectile,
    IsStandingForAttunement,
    BrokenBiomeBiomeName,
    BrokenBiomeZoneSnapshot,
    TryClaimBrokenBiomeHoldout,
    BindBrokenBiomeHoldoutIndex,
    ReleaseBrokenBiomeHoldout,
    BrokenBiomeBladeSelectedSlot,
    StopBrokenBiomeHeldAttack
} from './../../Core/BrokenBiomeBladeRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function N(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function ownerIndex(player) { return Math.max(0, Math.floor(N(Terraria.PlayerIndex(player), N(Terraria.Main.myPlayer)))); }
function isLocal(player) { return ownerIndex(player) === Math.floor(N(Terraria.Main.myPlayer, -1)); }
function isBlade(item) {
    const type = Math.floor(N(ModItem.getTypeByName('BrokenBiomeBlade')));
    return type > 0 && Math.floor(N(item?.type)) === type;
}
function rawRightDown(player) {
    try { if (player.controlUseTile === true) return true; } catch (e) { }
    try { if (Math.floor(N(player.altFunctionUse)) === 2) return true; } catch (e) { }
    return false;
}
function startHoldout(player, item, source) {
    if (!player || !item || !isBlade(item) || !isLocal(player)) return false;
    const holdoutType = Math.floor(N(ModProjectile.getTypeByName('BrokenBiomeBladeHoldout')));
    if (!(holdoutType > 0)) return false;

    const owner = ownerIndex(player);
    // Attunement and attack held-projectiles are mutually exclusive. Ensure an old
    // swing cannot survive into the 120-tick attunement animation.
    StopBrokenBiomeHeldAttack(owner, 'attunement-start');
    // TLPro mobile does not update ownedProjectileCounts synchronously inside ItemCheck.
    // Claim a JS-side lock before spawning so PreItemCheck/PostItemCheck cannot create
    // dozens of holdouts during the same press/frame.
    if (!TryClaimBrokenBiomeHoldout(item, player, owner)) return false;

    const mayAttune = IsStandingForAttunement(player) && Math.floor(N(player.itemAnimation)) <= 0;
    const rect = Terraria.PlayerRect(player);
    const spawn = Vector2.new(N(rect.X) + N(rect.Width) * 0.5 + 18, N(rect.Y));
    let projectileSource = null;
    try { projectileSource = player.GetProjectileSource_Item(item); } catch (e) { }
    if (!projectileSource) {
        try { projectileSource = player.GetSource_ItemUse(item); } catch (e) { }
    }
    const index = NewProjectile(projectileSource, spawn, Vector2.Zero, holdoutType, 0, 0, owner, 0, 0, 0, null);
    if (index < 0) {
        ReleaseBrokenBiomeHoldout(item, player, owner, -1);
        return false;
    }

    BindBrokenBiomeHoldoutIndex(item, player, owner, index);
    const slot = BrokenBiomeBladeSelectedSlot(player);
    SeedBrokenBiomeProjectile(index, owner, { mayAttune, inputSource: String(source || ''), slot });
    try {
        const z = BrokenBiomeZoneSnapshot(player);
        tl.log(`[CalamityPort BrokenBiomeBlade] secondary input captured ONCE; source=${source}; mayAttune=${mayAttune}; biome=${BrokenBiomeBiomeName(player)}; zones=desert:${z.desert},underworld:${z.underworld},snow:${z.snow},sky:${z.sky},corrupt:${z.corrupt},crimson:${z.crimson}; holdout=${index}; slot=${slot}.`);
    } catch (e) { }
    return true;
}

export class BrokenBiomeBladeInputPlayer extends ModPlayer {
    constructor() {
        super();
        this.preRightDown = false;
        this.preBladeItem = null;
        this.watcherLogged = false;
    }

    PreItemCheck(player) {
        const item = player?.HeldItem;
        if (!isLocal(player) || !isBlade(item)) {
            this.preRightDown = false;
            this.preBladeItem = null;
            return true;
        }

        if (!this.watcherLogged) {
            this.watcherLogged = true;
            try { tl.log('[CalamityPort BrokenBiomeBlade] mobile secondary-input watcher active (PreItemCheck/PostItemCheck).'); } catch (e) { }
        }

        const down = rawRightDown(player);
        this.preRightDown = down;
        this.preBladeItem = item;
        SetBrokenBiomeRightDown(item, player, down, 'pre-itemcheck');
        if (down) startHoldout(player, item, 'pre-itemcheck');
        return true;
    }

    PostItemCheck(player) {
        const item = player?.HeldItem;
        if (!isLocal(player) || !isBlade(item)) {
            if (this.preBladeItem) SetBrokenBiomeRightDown(this.preBladeItem, player, false, 'post-itemcheck-clear');
            this.preRightDown = false;
            this.preBladeItem = null;
            return;
        }

        const down = this.preRightDown || rawRightDown(player);
        SetBrokenBiomeRightDown(item, player, down, 'post-itemcheck');
        if (down) startHoldout(player, item, this.preRightDown ? 'pre-itemcheck-held' : 'post-itemcheck');

        this.preRightDown = false;
        this.preBladeItem = null;
    }

    UpdateDead(player) {
        const item = player?.HeldItem;
        if (isBlade(item)) SetBrokenBiomeRightDown(item, player, false, 'dead');
        this.preRightDown = false;
        this.preBladeItem = null;
    }
}
