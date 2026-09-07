import { MarniteRepulsionHitbox, IlmerisElectricSpark, JewelSpike, EnergyOrb, AmuletEnergy, PinkJellyAuraTL, BlueJellyAuraTL } from './../Content/Projectiles/Typeless/PreSlimeGodAccessoryProjectiles.js';
// Phase 13.26.0: Deathstare append-only projectiles.
import { DeathstareEyeball, DeathstareBeam } from './../Content/Projectiles/Summon/DeathstareProjectiles.js';
import { BasherHoldout, SmokingCometYoyo } from './../Content/Projectiles/Melee/PreHardmodeMeleeBatch6Projectiles.js';
import { MagnaCannonHoldout, MagnaShot, PressurizedBubbleStream } from './../Content/Projectiles/Ranged/PreHardmodeRangedBatch6Projectiles.js';
import { CoralSpoutHoldout, CoralSpike, ManaChargedCoral, FlareBoltProjectile, FireImplosion, HellwingBat } from './../Content/Projectiles/Magic/PreHardmodeMagicBatch6Projectiles.js';
import { SquirrelSquireMinion, SquirrelSquireAcorn, HarvestStaffSentry, HarvestStaffMinion } from './../Content/Projectiles/Summon/PreHardmodeSummonBatch6Projectiles.js';
import { PumpkaboomSmall, PumpkaboomBig, NastyChollaBol, NastyChollaNeedle, InfernalKrisProjectile, InfernalKrisCinder, InfernalKrisExplosion } from './../Content/Projectiles/Rogue/PreHardmodeRogueBatch6Projectiles.js';
import { AerialTrackerProjectile, AerialTrackerLaser, AqueousHunterDroneSummon, ShrimpPlasmaMissile, AugerHoldout, AugerPull, AugerSlash, PulsePistolShot, ShortCircuitShot, ShortCircuitHook, ShortCircuitExplosion } from './../Content/Projectiles/DraedonsArsenal/Tier1Projectiles.js';
import { HeronBobber } from './../Content/Projectiles/Typeless/HeronBobber.js';
import { CursorProj, CursorProjSplit } from './../Content/Projectiles/Typeless/CursorProj.js';
import { Aquashard, AquashardSplit } from './../Content/Projectiles/Ranged/Aquashard.js';
import { BouncingShotgunPellet } from './../Content/Projectiles/Ranged/BouncingShotgunPellet.js';
import { FlurrystormCannonShooting, FlurrystormIceChunk, FlurrystormIceShard } from './../Content/Projectiles/Ranged/FlurrystormCannonProjectiles.js';
import { AirSpinnerYoyo } from './../Content/Projectiles/Melee/Yoyos/AirSpinnerYoyo.js';
import { SpectralFeather } from './../Content/Projectiles/Magic/SpectralFeather.js';
import { TeslaAura } from './../Content/Projectiles/Typeless/TeslaAura.js';
import { Feather } from './../Content/Projectiles/Melee/Feather.js';
import { GoldplumeSpearProjectile } from './../Content/Projectiles/Melee/GoldplumeSpearProjectile.js';
import { Cyclone } from './../Content/Projectiles/Melee/Cyclone.js';
import { FeatherLarge } from './../Content/Projectiles/Ranged/FeatherLarge.js';
import { TradewindsProjectile } from './../Content/Projectiles/Magic/TradewindsProjectile.js';
import { TurbulanceProjectile } from './../Content/Projectiles/Rogue/TurbulanceProjectile.js';
import { TurbulanceWindSlash } from './../Content/Projectiles/Rogue/TurbulanceWindSlash.js';
import { FeatherKnifeProjectile } from './../Content/Projectiles/Rogue/FeatherKnifeProjectile.js';
import { StickyFeatherAero } from './../Content/Projectiles/Typeless/StickyFeatherAero.js';
import { ToxicMinnowCloud } from './../Content/Projectiles/Enemy/ToxicMinnowCloud.js';
import { NuclearToadGoo } from './../Content/Projectiles/Enemy/NuclearToadGoo.js';
import { OnyxLabSeeker } from './../Content/Projectiles/Typeless/OnyxLabSeeker.js';
import { RedLabSeeker } from './../Content/Projectiles/Typeless/RedLabSeeker.js';
import { CyanLabSeeker } from './../Content/Projectiles/Typeless/CyanLabSeeker.js';
import { YellowLabSeeker } from './../Content/Projectiles/Typeless/YellowLabSeeker.js';
import { WhiteLabSeeker } from './../Content/Projectiles/Typeless/WhiteLabSeeker.js';
import { GreenLabSeeker } from './../Content/Projectiles/Typeless/GreenLabSeeker.js';
import { GelWave, SlimeStream, GodsGambitYoyo, GelDartProjectile, SlimePuppet } from './../Content/Projectiles/PostSlimeGodProjectiles.js';
import { CrimsonSlimeGodMinion, CorruptionSlimeGodMinion } from './../Content/Projectiles/Summon/BabySlimeGodMinions.js';
import { BrokenBiomeBladeHoldout, PureClarity, PurityProjection, AridGrandeur, BitingEmbrace, DecaysRetort } from './../Content/Projectiles/Melee/BrokenBiomeBladeProjectiles.js';
import { RoxcaliburProj, Rox1, Rox2, Rox3 } from './../Content/Projectiles/Melee/RoxcaliburProjectiles.js';
import { SulphuricAcidBubble } from './../Content/Projectiles/Enemy/SulphuricAcidBubble.js';
import { Shell } from './../Content/Projectiles/Ranged/Shell.js';
import { SnapClamProj, SnapClamStealth } from './../Content/Projectiles/Rogue/SnapClamProjectiles.js';
import {

    SandDollarProj,
    SandDollarStealth,
    SandDollarFrag1,
    SandDollarFrag2,
    SandDollarFrag3
} from './../Content/Projectiles/Rogue/SandDollarProjectiles.js';
import { WaywasherProj } from './../Content/Projectiles/Magic/WaywasherProj.js';
import { AmidiasTridentProj } from './../Content/Projectiles/Melee/AmidiasTridentProj.js';
import { AmidiasWhirlpool } from './../Content/Projectiles/Melee/AmidiasWhirlpool.js';
import { HermitCrabMinion } from './../Content/Projectiles/Summon/HermitCrabMinion.js';
import {
    PolypLauncherSentry,
    PolypLauncherProjectile,
    PolypLauncherShrapnel1,
    PolypLauncherShrapnel2,
    PolypLauncherShrapnel3
} from './../Content/Projectiles/Summon/PolypLauncherProjectiles.js';
import { PearlAuraShard } from './../Content/Projectiles/Typeless/PearlAuraShard.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { WulfrumScrapBullet } from './../Content/Projectiles/Ranged/WulfrumScrapBullet.js';
import { WulfrumBolt } from './../Content/Projectiles/Magic/WulfrumBolt.js';
import { WulfrumKnifeProj } from './../Content/Projectiles/Rogue/WulfrumKnifeProj.js';
import { UrchinStingerProj } from './../Content/Projectiles/Rogue/UrchinStingerProj.js';
import { ContaminatedBileFlask } from './../Content/Projectiles/Rogue/ContaminatedBileFlask.js';
import { BileExplosion } from './../Content/Projectiles/Rogue/BileExplosion.js';
import { SulphuricAcidBubbleFriendly } from './../Content/Projectiles/Typeless/SulphuricAcidBubbleFriendly.js';
import { WulfrumScrewdriverProj, WulfrumScrew } from './../Content/Projectiles/Melee/WulfrumScrewdriverProj.js';
import { WulfrumDroid } from './../Content/Projectiles/Summon/WulfrumDroid.js';
import { WulfrumEnergyBurst } from './../Content/Projectiles/Summon/WulfrumEnergyBurst.js';
import { WulfrumFusionBolt } from './../Content/Projectiles/Summon/WulfrumFusionBolt.js';
import { VictideSeaSnail } from './../Content/Projectiles/Summon/VictideSeaSnail.js';
import { UrchinSpike } from './../Content/Projectiles/Summon/UrchinSpike.js';
import { Seashell } from './../Content/Projectiles/Typeless/Seashell.js';
import { WulfrumDrillProj } from './../Content/Projectiles/Typeless/WulfrumDrillProj.js';
import { WulfrumDiggingTurtleProjectile } from './../Content/Projectiles/Typeless/WulfrumDiggingTurtleProjectile.js';
import { WulfrumBobber } from './../Content/Projectiles/Typeless/WulfrumBobber.js';
import { SeashineSwordProj } from './../Content/Projectiles/Melee/SeashineSwordProj.js';
import { SaharaSlicersBlade, SaharaSlicersBladeAlt } from './../Content/Projectiles/Melee/SaharaSlicersBlades.js';
import { SaharaSlicersBolt } from './../Content/Projectiles/Melee/SaharaSlicersBolt.js';
import { FrostBoltProjectile } from './../Content/Projectiles/Magic/FrostBoltProjectile.js';
import { Sandstream } from './../Content/Projectiles/Magic/Sandstream.js';
import { SandstreamScepterExplosion } from './../Content/Projectiles/Magic/SandstreamScepterExplosion.js';
import { DesertScourgeSpit } from './../Content/Projectiles/Boss/DesertScourgeSpit.js';
import { DesertScourgeDiveSplash } from './../Content/Projectiles/Boss/DesertScourgeDiveSplash.js';
import { SandBlast } from './../Content/Projectiles/Boss/SandBlast.js';
import { GreatSandBlast } from './../Content/Projectiles/Boss/GreatSandBlast.js';
import { BarinadeArrow } from './../Content/Projectiles/Ranged/BarinadeArrow.js';
import { FungiOrb, FungiOrb2 } from './../Content/Projectiles/Ranged/FungiOrb.js';
import {
    M1GarandHoldout,
    M1GarandShot,
    M1GarandBulletCasing,
    M1GarandEmptyClip,
    M1GarandMuzzleFlash,
    M1GarandPingText
} from './../Content/Projectiles/Ranged/M1GarandProjectiles.js';
import { BrittleStarMinion } from './../Content/Projectiles/Summon/BrittleStarMinion.js';
import { PuffWarrior } from './../Content/Projectiles/Summon/PuffWarrior.js';
import { PuffCloud } from './../Content/Projectiles/Summon/PuffCloud.js';
import { FungalClumpMinion } from './../Content/Projectiles/Typeless/FungalClumpMinion.js';
import { FungalHeal } from './../Content/Projectiles/Healing/FungalHeal.js';
import { ScourgeoftheDesertProj } from './../Content/Projectiles/Rogue/ScourgeoftheDesertProj.js';
import { InfestedClawmerangProj } from './../Content/Projectiles/Rogue/InfestedClawmerangProj.js';
import { MycorootProj } from './../Content/Projectiles/Rogue/MycorootProj.js';
import { MushBomb } from './../Content/Projectiles/Boss/MushBomb.js';
import { MushBombGround } from './../Content/Projectiles/Boss/MushBombGround.js';
import { MushBombFall } from './../Content/Projectiles/Boss/MushBombFall.js';
import { VileClot } from './../Content/Projectiles/Boss/VileClot.js';
import { ShadeNimbusHostile } from './../Content/Projectiles/Boss/ShadeNimbusHostile.js';
import { ShaderainHostile } from './../Content/Projectiles/Boss/ShaderainHostile.js';
import { DarkBall } from './../Content/Projectiles/Melee/DarkBall.js';
import { ShadeFire } from './../Content/Projectiles/Ranged/ShadeFire.js';
import { Shaderain } from './../Content/Projectiles/Magic/Shaderain.js';
import { ShadeNimbusCloud } from './../Content/Projectiles/Magic/ShadeNimbusCloud.js';
import { DankCreeperMinion } from './../Content/Projectiles/Summon/DankCreeperMinion.js';
import { RotBallProjectile } from './../Content/Projectiles/Rogue/RotBallProjectile.js';
import { MiniHiveMind } from './../Content/Projectiles/Pets/MiniHiveMind.js';
import { Beldum } from './../Content/Projectiles/Pets/Beldum.js';
import { ShadeNimbusSpawner } from './../Content/Projectiles/Typeless/ShadeNimbusSpawner.js';
import { ShadeNimbus } from './../Content/Projectiles/Typeless/ShadeNimbus.js';
import { ShadeNimbusRain } from './../Content/Projectiles/Typeless/ShadeNimbusRain.js';
import { IchorShot, BloodGeyser, IchorBlob } from './../Content/Projectiles/Boss/PerforatorProjectiles.js';
import { BloodBeam } from './../Content/Projectiles/Magic/BloodBeam.js';
import { AortaYoyo } from './../Content/Projectiles/Melee/AortaYoyo.js';
import { Blood2 } from './../Content/Projectiles/Melee/Blood2.js';
import { SausageMakerSpear } from './../Content/Projectiles/Melee/SausageMakerSpear.js';
import { BloodBall } from './../Content/Projectiles/Melee/BloodBall.js';
import { BloodClotFriendly } from './../Content/Projectiles/Ranged/BloodClotFriendly.js';
import { ToothBallProjectile } from './../Content/Projectiles/Rogue/ToothBallProjectile.js';
import { RogueStealthCloud, RogueStealthRain } from './../Content/Projectiles/Rogue/RogueStealthCloud.js';
import { FleshBallMinion } from './../Content/Projectiles/Summon/FleshBallMinion.js';
import { FleshBlood } from './../Content/Projectiles/Summon/FleshBlood.js';
import { PerforaMini } from './../Content/Projectiles/Pets/PerforaMini.js';
import { UnstableCrimulanGlob, UnstableEbonianGlob, CrimsonSpike } from './../Content/Projectiles/Boss/SlimeGodProjectiles.js';
import { SlimeBolt } from './../Content/Projectiles/Ranged/SlimeBolt.js';
import { AbyssBall } from './../Content/Projectiles/Magic/AbyssBall.js';
import { EldritchTentacle } from './../Content/Projectiles/Magic/EldritchTentacle.js';
import { CorroslimeMinion } from './../Content/Projectiles/Summon/CorroslimeMinion.js';
import { CrimslimeMinion } from './../Content/Projectiles/Summon/CrimslimeMinion.js';
import { SulphuricAcidMist } from './../Content/Projectiles/Enemy/SulphuricAcidMist.js';
import { Luxor } from './../Content/Projectiles/Typeless/Luxor.js';
import { LuxorsGiftClassless } from './../Content/Projectiles/Typeless/LuxorsGiftClassless.js';
import { LuxorsGiftMelee } from './../Content/Projectiles/Melee/LuxorsGiftMelee.js';
import { LuxorsGiftRanged } from './../Content/Projectiles/Ranged/LuxorsGiftRanged.js';
import { LuxorsGiftMagic } from './../Content/Projectiles/Magic/LuxorsGiftMagic.js';
import { LuxorsGiftSummon } from './../Content/Projectiles/Summon/LuxorsGiftSummon.js';
import { LuxorsGiftRogue } from './../Content/Projectiles/Rogue/LuxorsGiftRogue.js';
import { AerospecFeather } from './../Content/Projectiles/Typeless/AerospecFeather.js';
import { Valkyrie } from './../Content/Projectiles/Summon/Valkyrie.js';
import { ArcZap } from './../Content/Projectiles/Typeless/ArcZap.js';
import { GladiatorHealOrb } from './../Content/Projectiles/Healing/GladiatorHealOrb.js';
import { Elumphant } from './../Content/Projectiles/Typeless/Elumphant.js';
import { ElumphantMist } from './../Content/Projectiles/Typeless/ElumphantMist.js';
import { LightningArc } from './../Content/Projectiles/Magic/LightningArc.js';
import { DepthCrusherProjectile, DepthCrusherSplitProjectile } from './../Content/Projectiles/Melee/DepthCrusherProjectiles.js';
import { InkBombProjectile, InkCloud1, InkCloud2, InkCloud3 } from './../Content/Projectiles/Rogue/InkBombProjectiles.js';

// Phase 13.04 Abyss Treasure Chest weapon/pet projectiles.
import { ArcherfishShot, ArcherfishRing } from './../Content/Projectiles/Ranged/ArcherfishShot.js';
import { BallOFuguProj } from './../Content/Projectiles/Melee/BallOFuguProj.js';
import { OceanSpirit } from './../Content/Projectiles/Pets/OceanSpirit.js';
import { DannyDevitoPet } from './../Content/Projectiles/Pets/DannyDevitoPet.js';
import { Herring } from './../Content/Projectiles/Summon/Herring.js';
import { RustyDrone, RustyBeaconPulse } from './../Content/Projectiles/Summon/RustyBeaconProjectiles.js';
import { BlackAnurianBubble, BlackAnurianPlankton } from './../Content/Projectiles/Magic/BlackAnurianProjectiles.js';
import { LionfishProjectile, UrchinSpikeFugu } from './../Content/Projectiles/Rogue/LionfishProjectile.js';


// Phase 13.15.0: pre-Hardmode beta weapons batch 3.
import { StormSurgeTornado } from './../Content/Projectiles/Ranged/StormSurgeTornado.js';
import { AquamarineBolt } from './../Content/Projectiles/Magic/AquamarineBolt.js';
import { BelladonnaSpirit } from './../Content/Projectiles/Summon/BelladonnaSpirit.js';
import { EXPLODINGFROG, FrogGore1, FrogGore2, FrogGore3, FrogGore4, FrogGore5 } from './../Content/Projectiles/Summon/CausticCroakerProjectiles.js';
import { BelladonnaPetal } from './../Content/Projectiles/Summon/BelladonnaPetal.js';
import { CrystallineProj, Crystalline2 } from './../Content/Projectiles/Rogue/CrystallineProjectiles.js';

import { SparkSpreaderFire, VeeringWindAirWave, VeeringWindFrostWave } from './../Content/Projectiles/PreBossArsenalProjectiles.js';
import { SunSpiritMinion, SunSpiritBeam } from './../Content/Projectiles/Summon/SunSpiritProjectiles.js';
import { AntlionSkewerProj, AntlionSkewerSandBlast, AntlionSkewerSandCloud } from './../Content/Projectiles/Rogue/AntlionSkewerProjectiles.js';

// Phase 13.20.0: append-only projectile IDs.
import { LunarBolt } from './../Content/Projectiles/Ranged/LunarBolt.js';
import { StickyFeather } from './../Content/Projectiles/Magic/StickyFeather.js';
import { StormjawBaby, StormjawSpark } from './../Content/Projectiles/Summon/StormjawProjectiles.js';
import { GildedDaggerProj } from './../Content/Projectiles/Rogue/GildedDaggerProj.js';


// Phase 13.21.0: pre-Hardmode arsenal batch 3.
import { BurntSiennaProj } from './../Content/Projectiles/Healing/BurntSiennaProj.js';
import { FirestormCannonHoldout } from './../Content/Projectiles/Ranged/FirestormCannonHoldout.js';
import { ManaBolt, ManaBoltSmall, ManaBoltSmall2 } from './../Content/Projectiles/Magic/ManaBoltProjectiles.js';
import { CinderBlossom, CinderShot } from './../Content/Projectiles/Summon/CinderBlossomProjectiles.js';
import { BouncingEyeballProjectile, BouncingEyeballProjectileStealthStrike } from './../Content/Projectiles/Rogue/BouncingEyeballProjectiles.js';


// Phase 13.22.0: pre-Hardmode arsenal batch 4.
import { IronFranciscaProj, LeadTomahawkProj, EnchantedAxeProj, EnchantedAxe2, FishboneBoomerangProjectile, FishboneShard, AshenStalactiteProj, AshenStalagmiteProj, AshenStalactiteDebris, CinquedeaProj, GleamingDaggerProj } from './../Content/Projectiles/Rogue/PreHardmodeRogueBatch4Projectiles.js';
import { PumplerHoldout, PumplerGrenade } from './../Content/Projectiles/Ranged/PumplerProjectiles.js';
import { NightsRayBeam, NightOrb, NightBolt } from './../Content/Projectiles/Magic/NightsRayProjectiles.js';


// Phase 13.24.0: pre-Hardmode arsenal batch 5.
import { MonstrousKnife, RiptideYoyo, AquaStream, UrchinMaceProj, RedtideWhirlpool } from './../Content/Projectiles/Melee/PreHardmodeMeleeBatch5Projectiles.js';
import { ToxicArrow, OpalStrikerHoldout, OpalStrike, OpalChargedStrike } from './../Content/Projectiles/Ranged/PreHardmodeRangedBatch5Projectiles.js';
import { IcicleStaffProj, AcidGunStream, PlasmaRay, PlasmaRay2 } from './../Content/Projectiles/Magic/PreHardmodeMagicBatch5Projectiles.js';
import { FrostBlossom, FrostBeam } from './../Content/Projectiles/Summon/FrostBlossomProjectiles.js';
import { Brick, BrickFragment, SporeKnifeProj, SporeKnifeBud, SeafoamBombProj, SeafoamBubble } from './../Content/Projectiles/Rogue/PreHardmodeRogueBatch5Projectiles.js';

import { WebBallBol, Honeycomb, HoneycombFragment, HoneycombFragment2, HoneycombFragment3, ShinobiBladeProjectile, ShinobiHealOrb } from './../Content/Projectiles/Rogue/PreHardmodeRogueBatch7Projectiles.js';
// Phase 13.26.2: pre-Hardmode weapons batch 8.
import { SludgeSplotchProj1, SludgeSplotchProj2, MeteorFistProj, MeteorFistMeteorite } from './../Content/Projectiles/Rogue/PreHardmodeRogueBatch8Projectiles.js';
import { AeroExplosive } from './../Content/Projectiles/Typeless/PreHardmodeTypelessBatch8Projectiles.js';

// Phase 13.26.3: pre-Hardmode weapons batch 10.
import { VileFeederSummon, VileFeederProjectile, BabyBloodCrawler, BloodRain, SmallSkeletonMinion, EyeOfNightSummon, EyeOfNightCell } from './../Content/Projectiles/Summon/PreHardmodeSummonBatch10Projectiles.js';
import { WaterLeechProj } from './../Content/Projectiles/Magic/WaterLeechProj.js';
import { MetalChunk, MetalShard, LemonNadeHoldout, LemonNadeProjectile } from './../Content/Projectiles/Rogue/PreHardmodeRogueBatch10Projectiles.js';
import { YateveoBloomMace, YateveoBloomSpear, BladecrestOathswordThrownBlade, OldLordClaymoreHoldout } from './../Content/Projectiles/Melee/PreHardmodeMeleeBatch10Projectiles.js';

// Phase 13.26.4: final verified pre-Slime God weapon projectiles.
import { CauldronHoldout, CauldronProj, CauldronProjSmall } from './../Content/Projectiles/Magic/PreHardmodeMagicBatch11Projectiles.js';
import { MarksmanShot, RicoshotCoin, SlagfireDouserHoldout, Slagfire } from './../Content/Projectiles/Ranged/PreHardmodeRangedBatch11Projectiles.js';
import { KylieBoomerang, GlaiveProj, GlaiveOrbital, SlickCaneProjectile } from './../Content/Projectiles/Rogue/PreHardmodeRogueBatch11Projectiles.js';
import { EnchantedKnifeSummon, EnchantedKnifeStaffProjectile, CnidarianJellyfishOnTheString, CnidarianSpark } from './../Content/Projectiles/Summon/PreHardmodeSummonBatch11Projectiles.js';

export function RegisterProjectiles() {
    ModProjectile.register(SulphuricAcidBubble);
    ModProjectile.register(Shell);
    ModProjectile.register(SnapClamProj);
    ModProjectile.register(SnapClamStealth);
    ModProjectile.register(SandDollarProj);
    ModProjectile.register(SandDollarStealth);
    ModProjectile.register(SandDollarFrag1);
    ModProjectile.register(SandDollarFrag2);
    ModProjectile.register(SandDollarFrag3);
    ModProjectile.register(WaywasherProj);
    ModProjectile.register(AmidiasTridentProj);
    ModProjectile.register(AmidiasWhirlpool);
    ModProjectile.register(HermitCrabMinion);
    ModProjectile.register(PolypLauncherSentry);
    ModProjectile.register(PolypLauncherProjectile);
    ModProjectile.register(PolypLauncherShrapnel1);
    ModProjectile.register(PolypLauncherShrapnel2);
    ModProjectile.register(PolypLauncherShrapnel3);
    ModProjectile.register(PearlAuraShard);
    ModProjectile.register(WulfrumScrapBullet);
    ModProjectile.register(WulfrumBolt);
    ModProjectile.register(WulfrumKnifeProj);
    ModProjectile.register(UrchinStingerProj);
    ModProjectile.register(WulfrumScrewdriverProj);
    ModProjectile.register(WulfrumScrew);
    ModProjectile.register(WulfrumDroid);
    ModProjectile.register(WulfrumEnergyBurst);
    ModProjectile.register(WulfrumFusionBolt);
    ModProjectile.register(VictideSeaSnail);
    ModProjectile.register(UrchinSpike);
    ModProjectile.register(Seashell);
    ModProjectile.register(WulfrumDrillProj);
    ModProjectile.register(WulfrumDiggingTurtleProjectile);
    ModProjectile.register(WulfrumBobber);
    ModProjectile.register(SeashineSwordProj);
    ModProjectile.register(SaharaSlicersBlade);
    ModProjectile.register(SaharaSlicersBladeAlt);
    ModProjectile.register(SaharaSlicersBolt);
    ModProjectile.register(FrostBoltProjectile);
    ModProjectile.register(Sandstream);
    ModProjectile.register(SandstreamScepterExplosion);
    ModProjectile.register(DesertScourgeSpit);
    ModProjectile.register(DesertScourgeDiveSplash);
    ModProjectile.register(SandBlast);
    ModProjectile.register(GreatSandBlast);
    ModProjectile.register(BarinadeArrow);
    ModProjectile.register(FungiOrb);
    ModProjectile.register(FungiOrb2);
    ModProjectile.register(M1GarandHoldout);
    ModProjectile.register(M1GarandShot);
    ModProjectile.register(M1GarandBulletCasing);
    ModProjectile.register(M1GarandEmptyClip);
    ModProjectile.register(M1GarandMuzzleFlash);
    ModProjectile.register(M1GarandPingText);
    ModProjectile.register(BrittleStarMinion);
    ModProjectile.register(PuffWarrior);
    ModProjectile.register(PuffCloud);
    ModProjectile.register(FungalClumpMinion);
    ModProjectile.register(FungalHeal);
    ModProjectile.register(ScourgeoftheDesertProj);
    ModProjectile.register(InfestedClawmerangProj);
    ModProjectile.register(MycorootProj);
    ModProjectile.register(MushBomb);
    ModProjectile.register(MushBombGround);
    ModProjectile.register(MushBombFall);
    ModProjectile.register(VileClot);
    ModProjectile.register(ShadeNimbusHostile);
    ModProjectile.register(ShaderainHostile);
    ModProjectile.register(DarkBall);
    ModProjectile.register(ShadeFire);
    ModProjectile.register(Shaderain);
    ModProjectile.register(ShadeNimbusCloud);
    ModProjectile.register(DankCreeperMinion);
    ModProjectile.register(RotBallProjectile);
    ModProjectile.register(MiniHiveMind);
    ModProjectile.register(Beldum);
    ModProjectile.register(ShadeNimbusSpawner);
    ModProjectile.register(ShadeNimbus);
    ModProjectile.register(ShadeNimbusRain);
    ModProjectile.register(IchorShot);
    ModProjectile.register(BloodGeyser);
    ModProjectile.register(IchorBlob);
    ModProjectile.register(BloodBeam);
    ModProjectile.register(AortaYoyo);
    ModProjectile.register(Blood2);
    ModProjectile.register(SausageMakerSpear);
    ModProjectile.register(BloodBall);
    ModProjectile.register(BloodClotFriendly);
    ModProjectile.register(ToothBallProjectile);
    ModProjectile.register(RogueStealthCloud);
    ModProjectile.register(RogueStealthRain);
    ModProjectile.register(FleshBallMinion);
    ModProjectile.register(FleshBlood);
    ModProjectile.register(PerforaMini);
    ModProjectile.register(UnstableCrimulanGlob);
    ModProjectile.register(UnstableEbonianGlob);
    ModProjectile.register(SlimeBolt);
    ModProjectile.register(AbyssBall);
    ModProjectile.register(EldritchTentacle);
    ModProjectile.register(CorroslimeMinion);
    ModProjectile.register(CrimslimeMinion);
    ModProjectile.register(ContaminatedBileFlask);
    ModProjectile.register(BileExplosion);
    ModProjectile.register(SulphuricAcidBubbleFriendly);
    ModProjectile.register(SulphuricAcidMist);
    ModProjectile.register(Luxor);
    ModProjectile.register(LuxorsGiftClassless);
    ModProjectile.register(LuxorsGiftMelee);
    ModProjectile.register(LuxorsGiftRanged);
    ModProjectile.register(LuxorsGiftMagic);
    ModProjectile.register(LuxorsGiftSummon);
    ModProjectile.register(LuxorsGiftRogue);
    ModProjectile.register(CrimsonSpike);
    ModProjectile.register(AerospecFeather);
    ModProjectile.register(Valkyrie);
    ModProjectile.register(ArcZap);
    ModProjectile.register(GladiatorHealOrb);
    ModProjectile.register(Elumphant);
    ModProjectile.register(ElumphantMist);
    ModProjectile.register(RoxcaliburProj);
    ModProjectile.register(BrokenBiomeBladeHoldout);
    ModProjectile.register(PureClarity);
    ModProjectile.register(PurityProjection);
    ModProjectile.register(AridGrandeur);
    ModProjectile.register(BitingEmbrace);
    ModProjectile.register(DecaysRetort);
    ModProjectile.register(Rox1);
    ModProjectile.register(Rox2);
    ModProjectile.register(Rox3);
    ModProjectile.register(LightningArc);
    ModProjectile.register(DepthCrusherProjectile);
    ModProjectile.register(DepthCrusherSplitProjectile);
    ModProjectile.register(InkBombProjectile);
    ModProjectile.register(InkCloud1);
    ModProjectile.register(InkCloud2);
    ModProjectile.register(InkCloud3);
    ModProjectile.register(CrimsonSlimeGodMinion);
    ModProjectile.register(CorruptionSlimeGodMinion);
    ModProjectile.register(GelWave);
    ModProjectile.register(SlimeStream);
    ModProjectile.register(GodsGambitYoyo);
    ModProjectile.register(GelDartProjectile);
    ModProjectile.register(SlimePuppet);
    ModProjectile.register(GreenLabSeeker);
    ModProjectile.register(WhiteLabSeeker);

    ModProjectile.register(CyanLabSeeker);
    ModProjectile.register(YellowLabSeeker);
    ModProjectile.register(RedLabSeeker);
    ModProjectile.register(OnyxLabSeeker);
    ModProjectile.register(NuclearToadGoo);
    ModProjectile.register(ToxicMinnowCloud);
    // Phase 13.04 append-only projectile IDs.
    ModProjectile.register(ArcherfishShot);
    ModProjectile.register(ArcherfishRing);
    ModProjectile.register(BallOFuguProj);
    ModProjectile.register(OceanSpirit);
    ModProjectile.register(DannyDevitoPet);
    ModProjectile.register(Herring);
    ModProjectile.register(BlackAnurianBubble);
    ModProjectile.register(BlackAnurianPlankton);
    ModProjectile.register(LionfishProjectile);
    ModProjectile.register(UrchinSpikeFugu);

    // Phase 13.10.0 append-only projectile IDs.
    ModProjectile.register(FeatherKnifeProjectile);
    ModProjectile.register(StickyFeatherAero);

    // Phase 13.10.2 append-only projectile IDs.
    ModProjectile.register(Feather);
    ModProjectile.register(GoldplumeSpearProjectile);
    ModProjectile.register(Cyclone);
    ModProjectile.register(FeatherLarge);
    ModProjectile.register(TradewindsProjectile);
    ModProjectile.register(TurbulanceProjectile);
    ModProjectile.register(TurbulanceWindSlash);

    // Phase 13.11.0 append-only projectile IDs.
    ModProjectile.register(AirSpinnerYoyo);
    ModProjectile.register(SpectralFeather);
    ModProjectile.register(TeslaAura);

    // Phase 13.12.0 append-only projectile IDs.
    ModProjectile.register(CursorProj);
    ModProjectile.register(CursorProjSplit);
    ModProjectile.register(Aquashard);
    ModProjectile.register(AquashardSplit);
    ModProjectile.register(BouncingShotgunPellet);
    ModProjectile.register(FlurrystormCannonShooting);
    ModProjectile.register(FlurrystormIceChunk);
    ModProjectile.register(FlurrystormIceShard);

    // Phase 13.13.0 append-only fishing projectile ID.
    ModProjectile.register(HeronBobber);

    // Phase 13.14.0: Draedon Arsenal Tier 1. Append-only projectile IDs.
    ModProjectile.register(AerialTrackerProjectile);
    ModProjectile.register(AerialTrackerLaser);
    ModProjectile.register(AqueousHunterDroneSummon);
    ModProjectile.register(ShrimpPlasmaMissile);
    ModProjectile.register(AugerHoldout);
    ModProjectile.register(AugerPull);
    ModProjectile.register(AugerSlash);
    ModProjectile.register(PulsePistolShot);
    ModProjectile.register(ShortCircuitShot);
    ModProjectile.register(ShortCircuitHook);
    ModProjectile.register(ShortCircuitExplosion);

    // Phase 13.15.0: append-only projectile IDs.
    ModProjectile.register(StormSurgeTornado);
    ModProjectile.register(AquamarineBolt);
    ModProjectile.register(BelladonnaSpirit);
    ModProjectile.register(BelladonnaPetal);
    ModProjectile.register(CrystallineProj);
    ModProjectile.register(Crystalline2);


    // Phase 13.17.0: Caustic Croaker sentry + official gore set. Append-only IDs.
    ModProjectile.register(EXPLODINGFROG);
    ModProjectile.register(FrogGore1);
    ModProjectile.register(FrogGore2);
    ModProjectile.register(FrogGore3);
    ModProjectile.register(FrogGore4);
    ModProjectile.register(FrogGore5);

    // Phase 13.18.0: pre-boss arsenal batch 1. Append-only IDs.
    ModProjectile.register(SparkSpreaderFire);
    ModProjectile.register(VeeringWindAirWave);
    ModProjectile.register(VeeringWindFrostWave);
    ModProjectile.register(SunSpiritMinion);
    ModProjectile.register(SunSpiritBeam);
    ModProjectile.register(AntlionSkewerProj);
    ModProjectile.register(AntlionSkewerSandBlast);
    ModProjectile.register(AntlionSkewerSandCloud);

    // Phase 13.20.0: pre-Hardmode arsenal batch 2. Append-only IDs.
    ModProjectile.register(LunarBolt);
    ModProjectile.register(StickyFeather);
    ModProjectile.register(StormjawBaby);
    ModProjectile.register(StormjawSpark);
    ModProjectile.register(GildedDaggerProj);

    // Phase 13.21.0: pre-Hardmode arsenal batch 3. Append-only IDs.
    ModProjectile.register(BurntSiennaProj);
    ModProjectile.register(FirestormCannonHoldout);
    ModProjectile.register(ManaBolt);
    ModProjectile.register(ManaBoltSmall);
    ModProjectile.register(ManaBoltSmall2);
    ModProjectile.register(CinderBlossom);
    ModProjectile.register(CinderShot);
    ModProjectile.register(BouncingEyeballProjectile);
    ModProjectile.register(BouncingEyeballProjectileStealthStrike);

    // Phase 13.22.0: pre-Hardmode arsenal batch 4. Append-only IDs.
    ModProjectile.register(IronFranciscaProj);
    ModProjectile.register(LeadTomahawkProj);
    ModProjectile.register(EnchantedAxeProj);
    ModProjectile.register(EnchantedAxe2);
    ModProjectile.register(FishboneBoomerangProjectile);
    ModProjectile.register(FishboneShard);
    ModProjectile.register(AshenStalactiteProj);
    ModProjectile.register(AshenStalagmiteProj);
    ModProjectile.register(AshenStalactiteDebris);
    ModProjectile.register(CinquedeaProj);
    ModProjectile.register(GleamingDaggerProj);
    ModProjectile.register(PumplerHoldout);
    ModProjectile.register(PumplerGrenade);
    ModProjectile.register(NightsRayBeam);
    ModProjectile.register(NightOrb);
    ModProjectile.register(NightBolt);


    // Phase 13.24.0: pre-Hardmode arsenal batch 5. Append-only IDs.
    ModProjectile.register(MonstrousKnife);
    ModProjectile.register(RiptideYoyo);
    ModProjectile.register(AquaStream);
    ModProjectile.register(UrchinMaceProj);
    ModProjectile.register(RedtideWhirlpool);
    ModProjectile.register(ToxicArrow);
    ModProjectile.register(OpalStrikerHoldout);
    ModProjectile.register(OpalStrike);
    ModProjectile.register(OpalChargedStrike);
    ModProjectile.register(IcicleStaffProj);
    ModProjectile.register(AcidGunStream);
    ModProjectile.register(PlasmaRay);
    ModProjectile.register(PlasmaRay2);
    ModProjectile.register(FrostBlossom);
    ModProjectile.register(FrostBeam);
    ModProjectile.register(Brick);
    ModProjectile.register(BrickFragment);
    ModProjectile.register(SporeKnifeProj);
    ModProjectile.register(SporeKnifeBud);
    ModProjectile.register(SeafoamBombProj);
    ModProjectile.register(SeafoamBubble);

    // Phase 13.25.0: pre-Hardmode arsenal batch 6. Append-only IDs.
    ModProjectile.register(BasherHoldout);
    ModProjectile.register(SmokingCometYoyo);
    ModProjectile.register(MagnaCannonHoldout);
    ModProjectile.register(MagnaShot);
    ModProjectile.register(PressurizedBubbleStream);
    ModProjectile.register(CoralSpoutHoldout);
    ModProjectile.register(CoralSpike);
    ModProjectile.register(ManaChargedCoral);
    ModProjectile.register(FlareBoltProjectile);
    ModProjectile.register(FireImplosion);
    ModProjectile.register(HellwingBat);
    ModProjectile.register(SquirrelSquireMinion);
    ModProjectile.register(SquirrelSquireAcorn);
    ModProjectile.register(HarvestStaffSentry);
    ModProjectile.register(HarvestStaffMinion);
    ModProjectile.register(PumpkaboomSmall);
    ModProjectile.register(PumpkaboomBig);
    ModProjectile.register(NastyChollaBol);
    ModProjectile.register(NastyChollaNeedle);
    ModProjectile.register(InfernalKrisProjectile);
    ModProjectile.register(InfernalKrisCinder);
    ModProjectile.register(InfernalKrisExplosion);

    // Phase 13.26.0: Deathstare append-only projectile IDs.
    ModProjectile.register(DeathstareEyeball);
    ModProjectile.register(DeathstareBeam);

    // Phase 13.26.1: append-only rogue projectile IDs.
    ModProjectile.register(WebBallBol);
    ModProjectile.register(Honeycomb);
    ModProjectile.register(HoneycombFragment);
    ModProjectile.register(HoneycombFragment2);
    ModProjectile.register(HoneycombFragment3);
    ModProjectile.register(ShinobiBladeProjectile);
    ModProjectile.register(ShinobiHealOrb);

    // Phase 13.26.2: pre-Hardmode weapons batch 8. Append-only IDs.
    ModProjectile.register(SludgeSplotchProj1);
    ModProjectile.register(SludgeSplotchProj2);
    ModProjectile.register(MeteorFistProj);
    ModProjectile.register(MeteorFistMeteorite);
    ModProjectile.register(AeroExplosive);


    // Phase 13.26.3: pre-Hardmode weapons batch 10. Append-only IDs.
    ModProjectile.register(VileFeederSummon);
    ModProjectile.register(VileFeederProjectile);
    ModProjectile.register(BabyBloodCrawler);
    ModProjectile.register(BloodRain);
    ModProjectile.register(SmallSkeletonMinion);
    ModProjectile.register(EyeOfNightSummon);
    ModProjectile.register(EyeOfNightCell);
    ModProjectile.register(WaterLeechProj);
    ModProjectile.register(MetalChunk);
    ModProjectile.register(MetalShard);
    ModProjectile.register(LemonNadeHoldout);
    ModProjectile.register(LemonNadeProjectile);
    ModProjectile.register(YateveoBloomMace);
    ModProjectile.register(YateveoBloomSpear);
    ModProjectile.register(BladecrestOathswordThrownBlade);
    ModProjectile.register(OldLordClaymoreHoldout);

    // Phase 13.26.4: append-only final pre-Slime God projectile IDs.
    ModProjectile.register(CauldronHoldout);
    ModProjectile.register(CauldronProj);
    ModProjectile.register(CauldronProjSmall);
    ModProjectile.register(MarksmanShot);
    ModProjectile.register(RicoshotCoin);
    ModProjectile.register(SlagfireDouserHoldout);
    ModProjectile.register(Slagfire);
    ModProjectile.register(KylieBoomerang);
    ModProjectile.register(GlaiveProj);
    ModProjectile.register(GlaiveOrbital);
    ModProjectile.register(SlickCaneProjectile);
    ModProjectile.register(EnchantedKnifeSummon);
    ModProjectile.register(EnchantedKnifeStaffProjectile);
    ModProjectile.register(CnidarianJellyfishOnTheString);
    ModProjectile.register(CnidarianSpark);

    // Phase 13.26.5: accessory proc projectiles. Append-only IDs.
    ModProjectile.register(MarniteRepulsionHitbox);
    ModProjectile.register(IlmerisElectricSpark);
    ModProjectile.register(JewelSpike);
    ModProjectile.register(EnergyOrb);
    ModProjectile.register(AmuletEnergy);
    // 13.26.5.1: append-only Life/Cleansing Jelly visual aura IDs.
    ModProjectile.register(PinkJellyAuraTL);
    ModProjectile.register(BlueJellyAuraTL);

    // v21: summon fidelity fixes. Append-only IDs to preserve every existing projectile ID.
    ModProjectile.register(RustyDrone);
    ModProjectile.register(RustyBeaconPulse);

}
