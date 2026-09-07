import { Terraria, Modules } from './../../TL/ModImports.js';
import { GlobalNPC } from './../../TL/GlobalNPC.js';
import { NPCLoader } from './../../TL/Loaders/NPCLoader.js';
import { ModNPC } from './../../TL/ModNPC.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { CalamityNPCState } from './../../Core/CalamityNPCState.js';
import { GraniteShrineAccessoryRuntime } from './../../Core/GraniteShrineAccessoryRuntime.js';
import { TrackFrozenCubeNPC, RemoveFrozenCubeNPC } from './../../Core/FrozenCubeTargetRuntime.js';
import { AntlionCloudDamageMultiplier, ClearAntlionCloud } from './../../Core/PreBossArsenalRuntime.js';

const { Vector2 } = Modules;
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
let CachedLightweightTypes = null;
let CachedPerforatorSegmentTypes = null;
let CachedCalamityPlayerState = null;
let CachedDesertScourgeHeadType = 0;
function DropModItem(npc, name, chance = 1) {
    if (!npc || Math.random() >= Number(chance)) return false;
    const type = Number(ModItem.getTypeByName(name) || 0);
    if (!(type > 0)) return false;
    try {
        const r = npc['Rectangle getRect()']();
        NewItem(r.X, r.Y, r.Width, r.Height, type, 1, false, 0, false);
        return true;
    } catch (_) { return false; }
}
function DropModItemStack(npc, name, chance = 1, minStack = 1, maxStack = minStack) {
    if (!npc || Math.random() >= Number(chance)) return false;
    const type = Number(ModItem.getTypeByName(name) || 0);
    if (!(type > 0)) return false;
    const min = Math.max(1, Math.floor(Number(minStack) || 1));
    const max = Math.max(min, Math.floor(Number(maxStack) || min));
    const stack = min + Math.floor(Math.random() * (max - min + 1));
    try {
        const r = npc['Rectangle getRect()']();
        NewItem(r.X, r.Y, r.Width, r.Height, type, stack, false, 0, false);
        return true;
    } catch (_) { return false; }
}
function GetCalamityPlayerState() {
    if (!CachedCalamityPlayerState)
        CachedCalamityPlayerState = ModPlayer.getByName('CalamityPlayerState');
    return CachedCalamityPlayerState;
}

function ApplyGiantPearlSlow(npc) {
    const state = GetCalamityPlayerState();
    if (!state || state.GiantPearlEquipped !== true)
        return;
    if (!npc || npc.active === false || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.life) <= 0 || Number(npc.lifeMax) <= 5)
        return;
    const px = Number(state.GiantPearlCenterX);
    const py = Number(state.GiantPearlCenterY);
    if (!Number.isFinite(px) || !Number.isFinite(py))
        return;
    let rect = null;
    try {
        rect = npc['Rectangle getRect()']();
    } catch (e) {
        return;
    }
    if (!rect)
        return;
    const dx = Number(rect.X) + Number(rect.Width) * 0.5 - px;
    const dy = Number(rect.Y) + Number(rect.Height) * 0.5 - py;
    if (dx * dx + dy * dy > 120 * 120)
        return;
    const vx = Number(npc.velocity.X);
    const vy = Number(npc.velocity.Y);
    npc.velocity = Vector2.new(vx * 0.9, vy * 0.9);
}

function GetLightweightTypes() {
    if (!CachedLightweightTypes) {
        CachedLightweightTypes = [
            ModNPC.getTypeByName('DesertScourgeBody'),
            ModNPC.getTypeByName('DesertScourgeTail'),
            ModNPC.getTypeByName('DesertNuisanceBody'),
            ModNPC.getTypeByName('DesertNuisanceTail'),
            ModNPC.getTypeByName('DesertNuisanceBodyYoung'),
            ModNPC.getTypeByName('DesertNuisanceTailYoung'),
            ModNPC.getTypeByName('PerforatorBodySmall'),
            ModNPC.getTypeByName('PerforatorTailSmall'),
            ModNPC.getTypeByName('PerforatorBodyMedium'),
            ModNPC.getTypeByName('PerforatorTailMedium'),
            ModNPC.getTypeByName('PerforatorBodyLarge'),
            ModNPC.getTypeByName('PerforatorTailLarge')
        ];
    }
    return CachedLightweightTypes;
}

function GetPerforatorSegmentTypes() {
    if (!CachedPerforatorSegmentTypes) {
        CachedPerforatorSegmentTypes = new Set([
            Number(ModNPC.getTypeByName('PerforatorBodySmall') || -1),
            Number(ModNPC.getTypeByName('PerforatorTailSmall') || -1),
            Number(ModNPC.getTypeByName('PerforatorBodyMedium') || -1),
            Number(ModNPC.getTypeByName('PerforatorTailMedium') || -1),
            Number(ModNPC.getTypeByName('PerforatorBodyLarge') || -1),
            Number(ModNPC.getTypeByName('PerforatorTailLarge') || -1)
        ]);
    }
    return CachedPerforatorSegmentTypes;
}

function IsPerforatorSegment(type) {
    return GetPerforatorSegmentTypes().has(Number(type));
}

function UsesRuntimeState(type) {
    const lightweight = GetLightweightTypes();
    for (const value of lightweight) {
        if (type === value)
            return false;
    }
    return true;
}

export class CalamityGlobalNPC extends GlobalNPC {
    OnSpawn(npc) {
        // Phase 12.74.11 benchmark: Perforator body/tail segments are follower visuals.
        // Do not register dozens of them in accessory target/cooldown systems; heads and
        // the Hive remain normal targets. Their own ModNPC owns the small follow-state.
        if (IsPerforatorSegment(npc.type))
            return;
        TrackFrozenCubeNPC(npc);
        GraniteShrineAccessoryRuntime.OnNPCSpawn(npc);
        const frozenCube = ModPlayer.getByName('FrozenCubePlayer');
        if (frozenCube) frozenCube.ResetNPC(npc);
        if (UsesRuntimeState(npc.type) && NPCLoader.isModType(npc.type))
            CalamityNPCState.Get(npc);
    }

    PostAI(npc) {
        // Frozen Cube targets are event-tracked on spawn/kill. Re-reading every NPC
        // through the NativeObject bridge every AI frame is unnecessary on TLPro.
        // Perforator body/tail segments can number in the dozens late in the fight; skip
        // unrelated accessory/global work for them entirely.
        if (IsPerforatorSegment(npc.type))
            return;
        ApplyGiantPearlSlow(npc);
        if (UsesRuntimeState(npc.type) && NPCLoader.isModType(npc.type))
            CalamityNPCState.Update(npc);
    }

    OnKill(npc) {
        if (IsPerforatorSegment(npc.type)) {
            CalamityNPCState.Remove(npc);
            return;
        }
        RemoveFrozenCubeNPC(npc);
        GraniteShrineAccessoryRuntime.RemoveNPC(npc);
        ClearAntlionCloud(npc);
        if (Number(npc.type) === Number(Terraria.ID.NPCID.Antlion) && Math.random() < 0.05) {
            const type = Number(ModItem.getTypeByName('AntlionSkewer') || 0);
            if (type > 0) {
                try { const r=npc['Rectangle getRect()'](); NewItem(r.X,r.Y,r.Width,r.Height,type,1,false,0,false); } catch (_) { }
            }
        }
        // Phase 13.20.0 vanilla acquisition hooks. In Expert, OnKill emulates the bag's item roll.
        if (Number(npc.type) === Number(Terraria.ID.NPCID.EyeofCthulhu)) {
            const chance = Terraria.Main.expertMode === true ? (1 / 3) : 0.25;
            DropModItem(npc, 'TeardropCleaver', chance);
            // Phase 13.26.0: current Calamity Eye of Cthulhu drop. Independent roll like the original loot table.
            DropModItem(npc, 'DeathstareRod', chance);
        }
        if (Number(npc.type) === Number(Terraria.ID.NPCID.KingSlime)) {
            const chance = Terraria.Main.expertMode === true ? (1 / 3) : 0.25;
            DropModItem(npc, 'CrownJewel', chance);
        }
        const crawdad = Number(Terraria.ID.NPCID.Crawdad || -1);
        const crawdad2 = Number(Terraria.ID.NPCID.Crawdad2 || -2);
        if (Number(npc.type) === crawdad || Number(npc.type) === crawdad2) {
            const chance = Terraria.Main.hardMode === true ? 1 : (Terraria.Main.expertMode === true ? 0.25 : (1 / 7));
            DropModItem(npc, 'CrawCarapace', chance);
        }
        if (!(CachedDesertScourgeHeadType > 0))
            CachedDesertScourgeHeadType = Number(ModNPC.getTypeByName('DesertScourgeHead') || 0);
        if (Terraria.Main.expertMode === true && CachedDesertScourgeHeadType > 0 && Number(npc.type) === CachedDesertScourgeHeadType)
            DropModItem(npc, 'OceanCrest', 1);
        if (Number(npc.type) === Number(Terraria.ID.NPCID.Harpy) && Terraria.NPC.downedBoss1 === true) {
            const chance = Terraria.Main.expertMode === true ? (1 / 30) : 0.02;
            if (Math.random() < chance) {
                const type = Number(ModItem.getTypeByName('SkyGlaze') || 0);
                if (type > 0) { try { const r=npc['Rectangle getRect()'](); NewItem(r.X,r.Y,r.Width,r.Height,type,1,false,0,false); } catch (_) { } }
            }
        }
        // Phase 13.26.4: official pre-Hardmode Blood Orb sources after Eye of Cthulhu.
        if (Terraria.NPC.downedBoss1 === true) {
            const bloodZombie = Number(Terraria.ID.NPCID.BloodZombie || 489);
            const drippler = Number(Terraria.ID.NPCID.Drippler || 490);
            const bride = Number(Terraria.ID.NPCID.TheBride || 53);
            const groom = Number(Terraria.ID.NPCID.TheGroom || 54);
            if (Number(npc.type) === bloodZombie || Number(npc.type) === drippler)
                DropModItemStack(npc, 'BloodOrb', 0.25, 1, 1);
            if (Number(npc.type) === bride || Number(npc.type) === groom)
                DropModItemStack(npc, 'BloodOrb', 1, 3, 6);
        }
        // Phase 13.26.1: vanilla enemy/boss acquisition for the new rogue weapons.
        if (Number(npc.type) === Number(Terraria.ID.NPCID.DarkCaster)) {
            const casterChance = Terraria.Main.expertMode === true ? 0.10 : (1 / 15);
            DropModItem(npc, 'ShinobiBlade', casterChance);
            // Phase 13.26.3: Staff of Necrosteocytes shares the Dark Caster roll rate.
            DropModItem(npc, 'StaffOfNecrosteocytes', casterChance);
        }
        if (Number(npc.type) === Number(Terraria.ID.NPCID.QueenBee))
            DropModItem(npc, 'HardenedHoneycomb', Terraria.Main.expertMode === true ? (1 / 3) : 0.25);

        // Phase 13.26.3: current pre-Hardmode vanilla enemy acquisition.
        let demonType = -1, voodooDemonType = -1, boneSerpentHeadType = -1;
        try { demonType = Number(Terraria.ID.NPCID.Demon); } catch (_) { demonType = 62; }
        try { voodooDemonType = Number(Terraria.ID.NPCID.VoodooDemon); } catch (_) { voodooDemonType = 66; }
        try { boneSerpentHeadType = Number(Terraria.ID.NPCID.BoneSerpentHead); } catch (_) { boneSerpentHeadType = 39; }
        if (Number(npc.type) === demonType || Number(npc.type) === voodooDemonType)
            DropModItem(npc, 'BladecrestOathsword', Terraria.NPC.downedBoss2 === true ? (1 / 15) : 0.02);
        if (Number(npc.type) === boneSerpentHeadType)
            DropModItem(npc, 'OldLordClaymore', Terraria.Main.hardMode === true ? 0.125 : 0.04);

        // Phase 13.24.0: official Plasma Rod acquisition from Tim / Goblin Sorcerer.
        if (Number(npc.type) === Number(Terraria.ID.NPCID.Tim)) {
            const chance = Terraria.Main.expertMode === true ? 0.5 : (1 / 3);
            if (Math.random() < chance) {
                const type = Number(ModItem.getTypeByName('PlasmaRod') || 0);
                if (type > 0) { try { const r=npc['Rectangle getRect()'](); NewItem(r.X,r.Y,r.Width,r.Height,type,1,false,0,false); } catch (_) { } }
            }
        }
        if (Number(npc.type) === Number(Terraria.ID.NPCID.GoblinSorcerer)) {
            const chance = Terraria.Main.expertMode === true ? (1 / 15) : (1 / 25);
            if (Math.random() < chance) {
                const type = Number(ModItem.getTypeByName('PlasmaRod') || 0);
                if (type > 0) { try { const r=npc['Rectangle getRect()'](); NewItem(r.X,r.Y,r.Width,r.Height,type,1,false,0,false); } catch (_) { } }
            }
        }
        // Phase 13.26.5: official vanilla-source accessory drops used by current Calamity.
        const pinkJelly = Number(Terraria.ID.NPCID.PinkJellyfish || -1001);
        const blueJelly = Number(Terraria.ID.NPCID.BlueJellyfish || -1002);
        const greenJelly = Number(Terraria.ID.NPCID.GreenJellyfish || -1003);
        if (Number(npc.type) === pinkJelly) DropModItem(npc, 'LifeJelly', Terraria.Main.expertMode === true ? (1 / 7) : 0.10);
        if (Number(npc.type) === blueJelly) DropModItem(npc, 'CleansingJelly', Terraria.Main.expertMode === true ? (1 / 7) : 0.10);
        if (Number(npc.type) === greenJelly) DropModItem(npc, 'VitalJelly', Terraria.Main.expertMode === true ? 0.20 : 0.125);
        const giantShelly = Number(Terraria.ID.NPCID.GiantShelly || -1004);
        const giantShelly2 = Number(Terraria.ID.NPCID.GiantShelly2 || -1005);
        if (Number(npc.type) === giantShelly || Number(npc.type) === giantShelly2)
            DropModItem(npc, 'GiantShell', Terraria.Main.hardMode === true ? 1 : (Terraria.Main.expertMode === true ? 0.25 : (1 / 7)));
        if (Number(npc.type) === Number(Terraria.ID.NPCID.QueenBee))
            DropModItem(npc, 'TheBee', Terraria.Main.expertMode === true ? (1 / 3) : 0.25);
        if (!(CachedDesertScourgeHeadType > 0)) CachedDesertScourgeHeadType = Number(ModNPC.getTypeByName('DesertScourgeHead') || 0);
        if (CachedDesertScourgeHeadType > 0 && Number(npc.type) === CachedDesertScourgeHeadType)
            DropModItem(npc, 'SandCloak', Terraria.Main.expertMode === true ? (1 / 3) : 0.25);

        if (UsesRuntimeState(npc.type) && NPCLoader.isModType(npc.type))
            CalamityNPCState.Remove(npc);
    }

    ModifyHitPlayer(npc, player, modifiers) {
        const mult = AntlionCloudDamageMultiplier(npc);
        if (mult < 1) modifiers.damage = Math.max(1, Math.floor(Number(modifiers.damage) * mult));
    }

    SetupShop(npc, player, shop) {
        try {
            if (Number(npc.type) === Number(Terraria.ID.NPCID.ArmsDealer) && Terraria.NPC.downedBoss3 === true) {
                const type = ModItem.getTypeByName('M1Garand');
                if (type > 0 && !shop.HasItem(type)) shop.Add(type);
            }
            // TLPro fallback for the still-unported Bandit town NPC.
            if (Number(npc.type) === Number(Terraria.ID.NPCID.GoblinTinkerer)) {
                const world = ModSystem.getByName('CalamityWorldState');
                if (world && world.DownedDesertScourge === true) {
                    for (const name of ['Cinquedea', 'Glaive', 'SlickCane']) {
                        const type = Number(ModItem.getTypeByName(name) || 0);
                        if (type > 0 && !shop.HasItem(type)) shop.Add(type);
                    }
                }
            }
            // Phase 13.26.5 shop acquisition. Exact vanilla vendors are preserved where possible;
            // unported Calamity town/NPC sources use compact mobile fallbacks so every pre-Slime God item is obtainable.
            if (Number(npc.type) === Number(Terraria.ID.NPCID.Clothier)) {
                const type = Number(ModItem.getTypeByName('CounterScarf') || 0);
                if (type > 0 && !shop.HasItem(type)) shop.Add(type);
            }
            if (Number(npc.type) === Number(Terraria.ID.NPCID.GoblinTinkerer)) {
                for (const name of ['StatMeter', 'OldDie']) {
                    const type = Number(ModItem.getTypeByName(name) || 0);
                    if (type > 0 && !shop.HasItem(type)) shop.Add(type);
                }
            }
            if (Number(npc.type) === Number(Terraria.ID.NPCID.SkeletonMerchant)) {
                for (const name of ['GiantShell', 'RottenDogtooth', 'ScuttlersJewel']) {
                    const type = Number(ModItem.getTypeByName(name) || 0);
                    if (type > 0 && !shop.HasItem(type)) shop.Add(type);
                }
            }
            if (Number(npc.type) === Number(Terraria.ID.NPCID.Angler)) {
                const world = ModSystem.getByName('CalamityWorldState');
                const names = ['AlluringBait', 'FishStocks', 'IlmerisSpark'];
                if (world && world.DownedDesertScourge === true) names.push('SeaSpiritAmulet', 'VoltaicJelly');
                for (const name of names) {
                    const type = Number(ModItem.getTypeByName(name) || 0);
                    if (type > 0 && !shop.HasItem(type)) shop.Add(type);
                }
            }
        } catch (e) { }
    }
}
