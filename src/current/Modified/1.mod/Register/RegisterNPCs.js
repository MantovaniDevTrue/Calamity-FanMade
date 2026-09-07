import { BabyCannonballJellyfish, SlabCrab, Cuttlefish, Laserfish, LuminousCorvina, Viperfish, OarfishHead } from './../Content/NPCs/Abyss/AbyssLayer12Expansion.js';
import { BoxJellyfish, CannonballJellyfish, MorayEel, ToxicMinnow } from './../Content/NPCs/Abyss/AbyssLayer1Enemies.js';
import { AcidEel } from './../Content/NPCs/AcidRain/AcidEel.js';
import { NuclearToad } from './../Content/NPCs/AcidRain/NuclearToad.js';
import { Radiator } from './../Content/NPCs/AcidRain/Radiator.js';
import { Skyfin } from './../Content/NPCs/AcidRain/Skyfin.js';
import { SeaKing } from './../Content/NPCs/TownNPCs/SeaKing.js';
import { SulphurousSkater } from './../Content/NPCs/AcidRain/SulphurousSkater.js';
import { AquaticUrchin } from './../Content/NPCs/SulphurousSea/AquaticUrchin.js';
import { Gnasher } from './../Content/NPCs/SulphurousSea/Gnasher.js';
import { Sulflounder } from './../Content/NPCs/SulphurousSea/Sulflounder.js';
import { MicrobialCluster } from './../Content/NPCs/SulphurousSea/MicrobialCluster.js';
import { Toxicatfish } from './../Content/NPCs/SulphurousSea/Toxicatfish.js';
import { Trasher } from './../Content/NPCs/SulphurousSea/Trasher.js';
import { ModNPC } from './../TL/ModNPC.js';
import { SeaFloaty } from './../Content/NPCs/SunkenSea/SeaFloaty.js';
import { SeaMinnow } from './../Content/NPCs/SunkenSea/SeaMinnow.js';
import { Clam } from './../Content/NPCs/SunkenSea/Clam.js';
import { EutrophicRay } from './../Content/NPCs/SunkenSea/EutrophicRay.js';
import { PrismBack } from './../Content/NPCs/SunkenSea/PrismBack.js';
import { GiantClam } from './../Content/NPCs/SunkenSea/GiantClam.js';
import { WulfrumRover } from './../Content/NPCs/NormalNPCs/WulfrumRover.js';
import { WulfrumGyrator } from './../Content/NPCs/NormalNPCs/WulfrumGyrator.js';
import { WulfrumAmplifier } from './../Content/NPCs/NormalNPCs/WulfrumAmplifier.js';
import { WulfrumDrone } from './../Content/NPCs/NormalNPCs/WulfrumDrone.js';
import { WulfrumHovercraft } from './../Content/NPCs/NormalNPCs/WulfrumHovercraft.js';
import { DesertScourgeHead } from './../Content/NPCs/Bosses/DesertScourge/DesertScourgeHead.js';
import { DesertScourgeBody } from './../Content/NPCs/Bosses/DesertScourge/DesertScourgeBody.js';
import { DesertScourgeTail } from './../Content/NPCs/Bosses/DesertScourge/DesertScourgeTail.js';
import { DesertNuisanceHead } from './../Content/NPCs/Bosses/DesertScourge/DesertNuisanceHead.js';
import { DesertNuisanceBody } from './../Content/NPCs/Bosses/DesertScourge/DesertNuisanceBody.js';
import { DesertNuisanceTail } from './../Content/NPCs/Bosses/DesertScourge/DesertNuisanceTail.js';
import { DesertNuisanceHeadYoung } from './../Content/NPCs/Bosses/DesertScourge/DesertNuisanceHeadYoung.js';
import { DesertNuisanceBodyYoung } from './../Content/NPCs/Bosses/DesertScourge/DesertNuisanceBodyYoung.js';
import { DesertNuisanceTailYoung } from './../Content/NPCs/Bosses/DesertScourge/DesertNuisanceTailYoung.js';
import { Crabulon } from './../Content/NPCs/Bosses/Crabulon/Crabulon.js';
import { CrabShroom } from './../Content/NPCs/Bosses/Crabulon/CrabShroom.js';
import { HiveMind } from './../Content/NPCs/Bosses/HiveMind/HiveMind.js';
import { HiveBlob } from './../Content/NPCs/Bosses/HiveMind/HiveBlob.js';
import { DankCreeper } from './../Content/NPCs/Bosses/HiveMind/DankCreeper.js';
import { DarkHeart } from './../Content/NPCs/Bosses/HiveMind/DarkHeart.js';
import { HiveTumor } from './../Content/NPCs/Bosses/HiveMind/HiveTumor.js';
import { PerforatorHive } from './../Content/NPCs/Bosses/Perforator/PerforatorHive.js';
import { PerforatorCyst } from './../Content/NPCs/Bosses/Perforator/PerforatorCyst.js';
import {

    PerforatorHeadSmall,
    PerforatorBodySmall,
    PerforatorTailSmall,
    PerforatorHeadMedium,
    PerforatorBodyMedium,
    PerforatorTailMedium,
    PerforatorHeadLarge,
    PerforatorBodyLarge,
    PerforatorTailLarge
} from './../Content/NPCs/Bosses/Perforator/PerforatorWorms.js';
import { SlimeGodCore } from './../Content/NPCs/Bosses/SlimeGod/SlimeGodCore.js';
import {
    CrimulanPaladin,
    EbonianPaladin,
    SplitCrimulanPaladin,
    SplitEbonianPaladin
} from './../Content/NPCs/Bosses/SlimeGod/SlimeGodPaladins.js';
import {
    CorruptSlimeSpawn,
    CorruptSlimeSpawn2,
    CrimsonSlimeSpawn,
    CrimsonSlimeSpawn2
} from './../Content/NPCs/Bosses/SlimeGod/SlimeGodMinions.js';
import { Stormlion } from './../Content/NPCs/NormalNPCs/Stormlion.js';
import { CrimulanBlightSlime, EbonianBlightSlime } from './../Content/NPCs/NormalNPCs/BlightSlimes.js';
export function RegisterNPCs() {
    ModNPC.register(SeaKing);
    ModNPC.register(SulphurousSkater);
    ModNPC.register(AquaticUrchin);
    ModNPC.register(SeaFloaty);
    ModNPC.register(SeaMinnow);
    ModNPC.register(Clam);
    ModNPC.register(EutrophicRay);
    ModNPC.register(PrismBack);
    ModNPC.register(GiantClam);
    ModNPC.register(WulfrumRover);
    ModNPC.register(WulfrumGyrator);
    ModNPC.register(WulfrumAmplifier);
    ModNPC.register(WulfrumDrone);
    ModNPC.register(WulfrumHovercraft);
    ModNPC.register(DesertScourgeHead);
    ModNPC.register(DesertScourgeBody);
    ModNPC.register(DesertScourgeTail);
    ModNPC.register(DesertNuisanceHead);
    ModNPC.register(DesertNuisanceBody);
    ModNPC.register(DesertNuisanceTail);
    ModNPC.register(DesertNuisanceHeadYoung);
    ModNPC.register(DesertNuisanceBodyYoung);
    ModNPC.register(DesertNuisanceTailYoung);
    ModNPC.register(Crabulon);
    ModNPC.register(CrabShroom);
    ModNPC.register(HiveMind);
    ModNPC.register(HiveBlob);
    ModNPC.register(DankCreeper);
    ModNPC.register(DarkHeart);
    ModNPC.register(HiveTumor);
    ModNPC.register(PerforatorHive);
    ModNPC.register(PerforatorCyst);
    ModNPC.register(PerforatorHeadSmall);
    ModNPC.register(PerforatorBodySmall);
    ModNPC.register(PerforatorTailSmall);
    ModNPC.register(PerforatorHeadMedium);
    ModNPC.register(PerforatorBodyMedium);
    ModNPC.register(PerforatorTailMedium);
    ModNPC.register(PerforatorHeadLarge);
    ModNPC.register(PerforatorBodyLarge);
    ModNPC.register(PerforatorTailLarge);
    ModNPC.register(SlimeGodCore);
    ModNPC.register(CrimulanPaladin);
    ModNPC.register(EbonianPaladin);
    ModNPC.register(SplitCrimulanPaladin);
    ModNPC.register(SplitEbonianPaladin);
    ModNPC.register(CorruptSlimeSpawn);
    ModNPC.register(CorruptSlimeSpawn2);
    ModNPC.register(CrimsonSlimeSpawn);
    ModNPC.register(CrimsonSlimeSpawn2);
    ModNPC.register(Gnasher);
    ModNPC.register(Sulflounder);
    ModNPC.register(MicrobialCluster);
    ModNPC.register(Toxicatfish);
    ModNPC.register(Trasher);
    ModNPC.register(Stormlion);
    ModNPC.register(CrimulanBlightSlime);
    ModNPC.register(EbonianBlightSlime);
    ModNPC.register(AcidEel);
    ModNPC.register(NuclearToad);
    ModNPC.register(Radiator);
    ModNPC.register(Skyfin);
    ModNPC.register(BoxJellyfish);
    ModNPC.register(CannonballJellyfish);
    ModNPC.register(MorayEel);
    ModNPC.register(ToxicMinnow);
    ModNPC.register(BabyCannonballJellyfish);
    ModNPC.register(SlabCrab);
    ModNPC.register(Cuttlefish);
    ModNPC.register(Laserfish);
    ModNPC.register(LuminousCorvina);
    ModNPC.register(Viperfish);
    ModNPC.register(OarfishHead);
}
