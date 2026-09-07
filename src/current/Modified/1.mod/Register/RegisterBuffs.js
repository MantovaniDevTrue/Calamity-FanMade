import { AqueousHunterDroneBuff } from './../Content/Buffs/Summon/AqueousHunterDroneBuff.js';
import { Vaporfied } from './../Content/Buffs/DamageOverTime/Vaporfied.js';
import { GalvanicCorrosion } from './../Content/Buffs/StatDebuffs/GalvanicCorrosion.js';
import { CrushDepth } from './../Content/Buffs/DamageOverTime/CrushDepth.js';
import { FishAlert } from './../Content/Buffs/StatDebuffs/FishAlert.js';
import { Irradiated } from './../Content/Buffs/StatDebuffs/Irradiated.js';
import { HermitCrab } from './../Content/Buffs/Summon/HermitCrab.js';
import { SnapClamDebuff } from './../Content/Buffs/DamageOverTime/SnapClamDebuff.js';
import { AmidiasBlessing } from './../Content/Buffs/StatBuffs/AmidiasBlessing.js';
import { ModBuff } from './../TL/ModBuff.js';
import { BrittleStar } from './../Content/Buffs/Summon/BrittleStar.js';
import { PuffWarriorBuff } from './../Content/Buffs/Summon/PuffWarriorBuff.js';
import { FungalClumpBuff } from './../Content/Buffs/Summon/FungalClumpBuff.js';
import { Mushy } from './../Content/Buffs/StatBuffs/Mushy.js';
import { BrainRot } from './../Content/Buffs/DamageOverTime/BrainRot.js';
import { DankCreeperBuff } from './../Content/Buffs/Summon/DankCreeperBuff.js';
import { MiniMindBuff } from './../Content/Buffs/Pets/MiniMindBuff.js';
import { BeldumBuff } from './../Content/Buffs/Pets/BeldumBuff.js';
import { BurningBlood } from './../Content/Buffs/DamageOverTime/BurningBlood.js';
import { FleshBallBuff } from './../Content/Buffs/Summon/FleshBallBuff.js';
import { BloodBound } from './../Content/Buffs/Pets/BloodBound.js';
import { BloodfinBoost } from './../Content/Buffs/Potions/BloodfinBoost.js';
import { Corroslime } from './../Content/Buffs/Summon/Corroslime.js';
import { Crimslime } from './../Content/Buffs/Summon/Crimslime.js';
import { WulfrumDroidBuff } from './../Content/Buffs/Summon/WulfrumDroidBuff.js';
import { SeaSnailBuff } from './../Content/Buffs/Summon/SeaSnailBuff.js';
import { AnechoicCoatingBuff } from './../Content/Buffs/Potions/AnechoicCoatingBuff.js';
import { Clamity } from './../Content/Buffs/StatDebuffs/Clamity.js';
import { ValkyrieBuff } from './../Content/Buffs/Summon/ValkyrieBuff.js';
import { ChiBuff } from './../Content/Buffs/StatBuffs/ChiBuff.js';
import { ChiRegenBuff } from './../Content/Buffs/StatBuffs/ChiRegenBuff.js';

import { WindChilled } from './../Content/Buffs/DamageOverTime/WindChilled.js';
import { Trippy } from './../Content/Buffs/Alcohol/Trippy.js';
import { CorruptionEffigyBuff } from './../Content/Buffs/Placeables/CorruptionEffigyBuff.js';
import { CrimsonEffigyBuff } from './../Content/Buffs/Placeables/CrimsonEffigyBuff.js';
import { BloodyMaryBuff } from './../Content/Buffs/Alcohol/BloodyMaryBuff.js';
import { StaticDischarge } from './../Content/Buffs/DamageOverTime/StaticDischarge.js';
import { RiptideDebuff } from './../Content/Buffs/DamageOverTime/RiptideDebuff.js';
import { BabySlimeGodBuff } from './../Content/Buffs/Summon/BabySlimeGodBuff.js';
import { OnyxExcavatorBuff } from './../Content/Buffs/Mounts/OnyxExcavatorBuff.js';
import { SulphurskinBuff } from './../Content/Buffs/Potions/SulphurskinBuff.js';

import { OceanSpiritBuff } from './../Content/Buffs/Pets/OceanSpiritBuff.js';
import { DannyDevito } from './../Content/Buffs/Pets/DannyDevito.js';
import { HerringBuff } from './../Content/Buffs/Summon/HerringBuff.js';

import { BelladonnaSpiritBuff } from './../Content/Buffs/Summon/BelladonnaSpiritBuff.js';

import { SolarSpirit } from './../Content/Buffs/Summon/SolarSpirit.js';

// Phase 13.20.0: append-only buff IDs.
import { TemporalSadness } from './../Content/Buffs/StatDebuffs/TemporalSadness.js';
import { BabyStormlionBuff } from './../Content/Buffs/Summon/BabyStormlionBuff.js';


// Phase 13.21.0: pre-Hardmode arsenal batch 3.
import { CinderBlossomBuff } from './../Content/Buffs/Summon/CinderBlossomBuff.js';

// Phase 13.24.0: append-only summon buff ID.
import { FrostBlossomBuff } from './../Content/Buffs/Summon/FrostBlossomBuff.js';

// Phase 13.25.4: mobile sentry control buffs (append-only).
import { SquirrelSquireSentryBuff } from './../Content/Buffs/Summon/SquirrelSquireSentryBuff.js';
import { HarvestSentryBuff } from './../Content/Buffs/Summon/HarvestSentryBuff.js';

// Phase 13.26.0: Deathstare summon buff.
import { MiniatureEyeofCthulhu } from './../Content/Buffs/Summon/MiniatureEyeofCthulhu.js';

import { MarniteLiftBuff } from './../Content/Buffs/Mounts/MarniteLiftBuff.js';

// Phase 13.26.3: summon buffs for batch 10.
import { VileFeederBuff, BabyBloodCrawlerBuff, SmallSkeletonBuff, EyeOfNightBuff } from './../Content/Buffs/Summon/PreHardmodeSummonBatch10Buffs.js';

// Phase 13.26.4: final pre-Slime God summon support.
import { EnchantedKnifeStaffBuff, CnidarianSummonTagBuff } from './../Content/Buffs/Summon/PreHardmodeSummonBatch11Buffs.js';

export function RegisterBuffs() {
    ModBuff.register(Irradiated);
    ModBuff.register(HermitCrab);
    ModBuff.register(SnapClamDebuff);
    ModBuff.register(AmidiasBlessing);
    ModBuff.register(BrittleStar);
    ModBuff.register(PuffWarriorBuff);
    ModBuff.register(FungalClumpBuff);
    ModBuff.register(Mushy);
    ModBuff.register(BrainRot);
    ModBuff.register(DankCreeperBuff);
    ModBuff.register(MiniMindBuff);
    ModBuff.register(BeldumBuff);
    ModBuff.register(BurningBlood);
    ModBuff.register(FleshBallBuff);
    ModBuff.register(BloodBound);
    ModBuff.register(BloodfinBoost);
    ModBuff.register(Corroslime);
    ModBuff.register(Crimslime);
    ModBuff.register(WulfrumDroidBuff);
    ModBuff.register(SeaSnailBuff);
    ModBuff.register(AnechoicCoatingBuff);
    ModBuff.register(Clamity);
    ModBuff.register(ValkyrieBuff);
    ModBuff.register(ChiBuff);
    ModBuff.register(ChiRegenBuff);
    ModBuff.register(WindChilled);
    ModBuff.register(Trippy);
    ModBuff.register(CorruptionEffigyBuff);
    ModBuff.register(CrimsonEffigyBuff);
    ModBuff.register(BloodyMaryBuff);
    ModBuff.register(StaticDischarge);
    ModBuff.register(RiptideDebuff);
    ModBuff.register(FishAlert);
    ModBuff.register(CrushDepth);

    ModBuff.register(BabySlimeGodBuff);
    ModBuff.register(OnyxExcavatorBuff);
    ModBuff.register(SulphurskinBuff);
    ModBuff.register(OceanSpiritBuff);
    ModBuff.register(DannyDevito);
    ModBuff.register(HerringBuff);
    // Phase 13.11.0 append-only debuff ID.
    ModBuff.register(GalvanicCorrosion);
    // Phase 13.12.0 append-only debuff ID.
    ModBuff.register(Vaporfied);
    // Phase 13.14.0: append-only Draedon summon buff ID.
    ModBuff.register(AqueousHunterDroneBuff);
    // Phase 13.15.0: append-only summon buff ID.
    ModBuff.register(BelladonnaSpiritBuff);
    // Phase 13.18.0: append-only summon buff ID.
    ModBuff.register(SolarSpirit);

    // Phase 13.20.0: append-only buff IDs.
    ModBuff.register(TemporalSadness);
    ModBuff.register(BabyStormlionBuff);

    // Phase 13.21.0 append-only buff ID.
    ModBuff.register(CinderBlossomBuff);

    // Phase 13.24.0 append-only buff ID.
    ModBuff.register(FrostBlossomBuff);

    // Phase 13.25.4 append-only mobile sentry controls.
    ModBuff.register(SquirrelSquireSentryBuff);
    ModBuff.register(HarvestSentryBuff);

    // Phase 13.26.0 append-only summon buff ID.
    ModBuff.register(MiniatureEyeofCthulhu);

    // Phase 13.26.1: append-only Marnite Lift buff ID.
    ModBuff.register(MarniteLiftBuff);


    // Phase 13.26.3: append-only summon buff IDs.
    ModBuff.register(VileFeederBuff);
    ModBuff.register(BabyBloodCrawlerBuff);
    ModBuff.register(SmallSkeletonBuff);
    ModBuff.register(EyeOfNightBuff);

    // Phase 13.26.4: append-only summon support IDs.
    ModBuff.register(EnchantedKnifeStaffBuff);
    ModBuff.register(CnidarianSummonTagBuff);

}
