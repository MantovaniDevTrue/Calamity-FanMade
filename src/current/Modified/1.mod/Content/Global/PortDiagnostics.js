import { Terraria } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { ModItem } from './../../TL/ModItem.js';
import { ItemLoader } from './../../TL/Loaders/ItemLoader.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { ModNPC } from './../../TL/ModNPC.js';
import { CalamityNPCState } from './../../Core/CalamityNPCState.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { M1GarandRuntime } from './../../Core/M1GarandRuntime.js';
import { FusionEntityData } from './../../Core/FusionEntityData.js';
import { FusionVFXSystem } from './../../Core/FusionVFXSystem.js';
import { FusionCamera } from './../../Core/FusionCamera.js';
import { BossPhaseVFX } from './../../Core/BossPhaseVFX.js';
import { AndroidSound } from './../../Common/Snippets/AndroidSound.js';
import {

    FindOrCacheFungalClump,
    GetFungalHealDiagnostics,
    GetFungalClumpModeName
} from './../../Core/FungalClumpRuntime.js';
import { IsVictideSubmerged, GetVictideSetState } from './../../Core/VictideRuntime.js';
import { SunkenSeaPreviewRuntime } from './../../Core/SunkenSeaPreviewRuntime.js';
import { SunkenSeaTerrainRuntime } from './../../Core/SunkenSeaTerrainRuntime.js';
import { SunkenSeaMaterialRuntime } from './../../Core/SunkenSeaMaterialRuntime.js';
import { SunkenSeaEcologyRuntime } from './../../Core/SunkenSeaEcologyRuntime.js';
import { SpawnGiantClamAtDen, IsGiantClamDenTile } from './../../Core/GiantClamRuntime.js';
import { SulphurousSeaPreviewRuntime } from './../../Core/SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './../../Core/SulphurousSeaTerrainRuntime.js';
import { SulphurousSeaMaterialRuntime } from './../../Core/SulphurousSeaMaterialRuntime.js';
import { AcidRainTier1Runtime } from './../../Core/AcidRainTier1Runtime.js';
import { AbyssLayer1Runtime } from './../../Core/AbyssLayer1Runtime.js';
import { AbyssTerrainRuntime } from './../../Core/AbyssTerrainRuntime.js';
import { ForceWulfrumDroidEmote, GetWulfrumDroidEmoteStatus } from './../Projectiles/Summon/WulfrumDroid.js';
import { BiomeAnchorMigrationRuntime } from './../../Core/BiomeAnchorMigrationRuntime.js';
import { PlayItemSound } from '../../Common/Snippets/LegacySoundCompat.js';
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function Tell(text, r = 90, g = 190, b = 255) {
    NewText(String(text), r, g, b);
}

let AbyssShrineLocatorEnabled = false;
let AbyssShrineLocatorTicks = 0;
const ABYSS_SHRINE_KEY = 'calamity:structure:abyssShrine:';
function GetAbyssShrineLocator(player) {
    if (!WorldDB.Instance || WorldDB.get(ABYSS_SHRINE_KEY + 'generated') !== true)
        return { ok: false, reason: 'O Abyss Shrine ainda não foi gerado neste mundo.' };
    const chestX = Math.floor(Number(WorldDB.get(ABYSS_SHRINE_KEY + 'chestX')));
    const chestY = Math.floor(Number(WorldDB.get(ABYSS_SHRINE_KEY + 'chestY')));
    if (!Number.isFinite(chestX) || !Number.isFinite(chestY))
        return { ok: false, reason: 'As coordenadas salvas do Abyss Shrine estão inválidas.' };
    const playerTileX = Math.floor(Number(Terraria.PlayerCenterX(player)) / 16);
    const playerTileY = Math.floor(Number(Terraria.PlayerCenterY(player)) / 16);
    const dx = chestX - playerTileX;
    const dy = chestY - playerTileY;
    const horizontal = dx === 0 ? 'na mesma coluna' : `${Math.abs(dx)} tiles para ${dx > 0 ? 'DIREITA' : 'ESQUERDA'}`;
    const vertical = dy === 0 ? 'na mesma altura' : `${Math.abs(dy)} tiles para ${dy > 0 ? 'BAIXO' : 'CIMA'}`;
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
    return { ok: true, chestX, chestY, playerTileX, playerTileY, dx, dy, horizontal, vertical, distance };
}
function TellAbyssShrineLocator(player) {
    const info = GetAbyssShrineLocator(player);
    if (!info.ok) { Tell(info.reason, 255, 150, 90); return; }
    Tell(`Abyss Shrine: ${info.horizontal} | ${info.vertical} | distância ~${info.distance} tiles.`, 180, 120, 255);
    Tell(`Void Chest: X=${info.chestX}, Y=${info.chestY} | Você: X=${info.playerTileX}, Y=${info.playerTileY}.`, 130, 210, 255);
}

function SpawnItem(player, type, stack = 1, offsetX = 0) {
    const x = Math.floor(Terraria.PlayerPositionX(player) + offsetX);
    const y = Math.floor(Terraria.PlayerPositionY(player));
    NewItem(x, y, Math.max(1, Terraria.PlayerWidth(player)), Math.max(1, Terraria.PlayerHeight(player)), type, stack, false, -1, true);
}

function CountActiveProjectiles(type) {
    if (!(type > 0))
        return 0;
    let count = 0;
    for (let i = 0; i < 1000; i++) {
        const projectile = Terraria.Main.projectile[i];
        if (projectile && projectile.active && Number(projectile.type) === Number(type))
            count++;
    }
    return count;
}

function GetTypes() {
    return {
        core: ModItem.getTypeByName('EnergyCore'),
        pearl: ModItem.getTypeByName('PearlShard'),
        prism: ModItem.getTypeByName('SeaPrism'),
        navystone: ModItem.getTypeByName('Navystone'),
        eutrophicSand: ModItem.getTypeByName('EutrophicSand'),
        prismShard: ModItem.getTypeByName('PrismShard'),
        seaMinnowItem: ModItem.getTypeByName('SeaMinnowItem'),
        seaFloaty: ModNPC.getTypeByName('SeaFloaty'),
        seaMinnow: ModNPC.getTypeByName('SeaMinnow'),
        clam: ModNPC.getTypeByName('Clam'),
        eutrophicRay: ModNPC.getTypeByName('EutrophicRay'),
        prismBack: ModNPC.getTypeByName('PrismBack'),
        giantClam: ModNPC.getTypeByName('GiantClam'),
        seaKing: ModNPC.getTypeByName('SeaKing'),
        giantPearl: ModItem.getTypeByName('GiantPearl'),
        amidiasPendant: ModItem.getTypeByName('AmidiasPendant'),
        giantClamTrophy: ModItem.getTypeByName('GiantClamTrophy'),
        giantClamRelic: ModItem.getTypeByName('GiantClamRelic'),
        shellshooter: ModItem.getTypeByName('Shellshooter'),
        snapClam: ModItem.getTypeByName('SnapClam'),
        sandDollar: ModItem.getTypeByName('SandDollar'),
        waywasher: ModItem.getTypeByName('Waywasher'),
        amidiasTrident: ModItem.getTypeByName('AmidiasTrident'),
        enchantedConch: ModItem.getTypeByName('EnchantedConch'),
        polypLauncher: ModItem.getTypeByName('PolypLauncher'),
        sulphurousSand: ModItem.getTypeByName('SulphurousSand'),
        sulphurousSandstone: ModItem.getTypeByName('SulphurousSandstone'),
        hardenedSulphurousSandstone: ModItem.getTypeByName('HardenedSulphurousSandstone'),
        sulphurousShale: ModItem.getTypeByName('SulphurousShale'),
        sulphurousSkater: ModNPC.getTypeByName('SulphurousSkater'),
        acidEel: ModNPC.getTypeByName('AcidEel'),
        nuclearToad: ModNPC.getTypeByName('NuclearToad'),
        radiator: ModNPC.getTypeByName('Radiator'),
        skyfin: ModNPC.getTypeByName('Skyfin'),
        sulphuricScale: ModItem.getTypeByName('SulphuricScale'),
        boxJellyfish: ModNPC.getTypeByName('BoxJellyfish'),
        cannonballJellyfish: ModNPC.getTypeByName('CannonballJellyfish'),
        morayEel: ModNPC.getTypeByName('MorayEel'),
        toxicMinnow: ModNPC.getTypeByName('ToxicMinnow'),
        aquaticUrchin: ModNPC.getTypeByName('AquaticUrchin'),
        urchinStinger: ModItem.getTypeByName('UrchinStinger'),
        urchinStingerProj: ModProjectile.getTypeByName('UrchinStingerProj'),
        gnasher: ModNPC.getTypeByName('Gnasher'),
        contaminatedBile: ModItem.getTypeByName('ContaminatedBile'),
        contaminatedBileFlask: ModProjectile.getTypeByName('ContaminatedBileFlask'),
        bileExplosion: ModProjectile.getTypeByName('BileExplosion'),
        sulphuricAcidBubbleFriendly: ModProjectile.getTypeByName('SulphuricAcidBubbleFriendly'),
        sulflounder: ModNPC.getTypeByName('Sulflounder'),
        anechoicCoating: ModItem.getTypeByName('AnechoicCoating'),
        anechoicCoatingBuff: ModBuff.getTypeByName('AnechoicCoatingBuff'),
        sulphuricAcidMist: ModProjectile.getTypeByName('SulphuricAcidMist'),
        sulphuricAcidBubble: ModProjectile.getTypeByName('SulphuricAcidBubble'),
        irradiated: ModBuff.getTypeByName('Irradiated'),
        sword: ModItem.getTypeByName('SeashineSword'),
        beam: ModProjectile.getTypeByName('SeashineSwordProj'),
        scrap: ModItem.getTypeByName('WulfrumMetalScrap'),
        battery: ModItem.getTypeByName('WulfrumBattery'),
        roverDrive: ModItem.getTypeByName('RoverDrive'),
        luxorsGift: ModItem.getTypeByName('LuxorsGift'),
        luxor: ModProjectile.getTypeByName('Luxor'),
        rover: ModNPC.getTypeByName('WulfrumRover'),
        gyrator: ModNPC.getTypeByName('WulfrumGyrator'),
        amplifier: ModNPC.getTypeByName('WulfrumAmplifier'),
        drone: ModNPC.getTypeByName('WulfrumDrone'),
        hovercraft: ModNPC.getTypeByName('WulfrumHovercraft'),
        acidwood: ModItem.getTypeByName('Acidwood'),
        bow: ModItem.getTypeByName('AcidwoodBow'),
        saharaSlicers: ModItem.getTypeByName('SaharaSlicers'),
        saharaBlade: ModProjectile.getTypeByName('SaharaSlicersBlade'),
        saharaBladeAlt: ModProjectile.getTypeByName('SaharaSlicersBladeAlt'),
        saharaBolt: ModProjectile.getTypeByName('SaharaSlicersBolt'),
        barinade: ModItem.getTypeByName('Barinade'),
        barinadeArrow: ModProjectile.getTypeByName('BarinadeArrow'),
        frostBolt: ModItem.getTypeByName('FrostBolt'),
        frostBall: ModProjectile.getTypeByName('FrostBoltProjectile'),
        sandstreamScepter: ModItem.getTypeByName('SandstreamScepter'),
        sandstream: ModProjectile.getTypeByName('Sandstream'),
        sandstreamExplosion: ModProjectile.getTypeByName('SandstreamScepterExplosion'),
        brittleStarStaff: ModItem.getTypeByName('BrittleStarStaff'),
        brittleStarMinion: ModProjectile.getTypeByName('BrittleStarMinion'),
        brittleStarBuff: ModBuff.getTypeByName('BrittleStar'),
        scourgeWeapon: ModItem.getTypeByName('ScourgeoftheDesert'),
        scourgeWeaponProj: ModProjectile.getTypeByName('ScourgeoftheDesertProj'),
        snowMask: ModItem.getTypeByName('SnowRuffianMask'),
        snowChest: ModItem.getTypeByName('SnowRuffianChestplate'),
        snowGreaves: ModItem.getTypeByName('SnowRuffianGreaves'),
        wulfrumHat: ModItem.getTypeByName('WulfrumHat'),
        wulfrumJacket: ModItem.getTypeByName('WulfrumJacket'),
        wulfrumOveralls: ModItem.getTypeByName('WulfrumOveralls'),
        wulfrumCannon: ModItem.getTypeByName('WulfrumFusionCannon'),
        wulfrumFusionBolt: ModProjectile.getTypeByName('WulfrumFusionBolt'),
        seaRemains: ModItem.getTypeByName('SeaRemains'),
        victideMagic: ModItem.getTypeByName('VictideHeadMagic'),
        victideMelee: ModItem.getTypeByName('VictideHeadMelee'),
        victideRanged: ModItem.getTypeByName('VictideHeadRanged'),
        victideRogue: ModItem.getTypeByName('VictideHeadRogue'),
        victideSummon: ModItem.getTypeByName('VictideHeadSummon'),
        victideBreastplate: ModItem.getTypeByName('VictideBreastplate'),
        victideGreaves: ModItem.getTypeByName('VictideGreaves'),
        victideSnail: ModProjectile.getTypeByName('VictideSeaSnail'),
        victideSpike: ModProjectile.getTypeByName('UrchinSpike'),
        victideSeashell: ModProjectile.getTypeByName('Seashell'),
        wulfrumKnife: ModItem.getTypeByName('WulfrumKnife'),
        rotBall: ModItem.getTypeByName('RotBall'),
        toothBall: ModItem.getTypeByName('ToothBall'),
        rogueEmblem: ModItem.getTypeByName('RogueEmblem'),
        filthyGlove: ModItem.getTypeByName('FilthyGlove'),
        bloodstainedGlove: ModItem.getTypeByName('BloodstainedGlove'),
        medallion: ModItem.getTypeByName('DesertMedallion'),
        scourgeHead: ModNPC.getTypeByName('DesertScourgeHead'),
        scourgeBody: ModNPC.getTypeByName('DesertScourgeBody'),
        scourgeTail: ModNPC.getTypeByName('DesertScourgeTail'),
        scourgeSpit: ModProjectile.getTypeByName('DesertScourgeSpit'),
        scourgeDiveSplash: ModProjectile.getTypeByName('DesertScourgeDiveSplash'),
        sandBlast: ModProjectile.getTypeByName('SandBlast'),
        greatSandBlast: ModProjectile.getTypeByName('GreatSandBlast'),
        nuisanceHead: ModNPC.getTypeByName('DesertNuisanceHead'),
        nuisanceBody: ModNPC.getTypeByName('DesertNuisanceBody'),
        nuisanceTail: ModNPC.getTypeByName('DesertNuisanceTail'),
        nuisanceYoungHead: ModNPC.getTypeByName('DesertNuisanceHeadYoung'),
        nuisanceYoungBody: ModNPC.getTypeByName('DesertNuisanceBodyYoung'),
        nuisanceYoungTail: ModNPC.getTypeByName('DesertNuisanceTailYoung'),
        perforatorHive: ModNPC.getTypeByName('PerforatorHive'),
        perforatorSmall: ModNPC.getTypeByName('PerforatorHeadSmall'),
        perforatorMedium: ModNPC.getTypeByName('PerforatorHeadMedium'),
        perforatorLarge: ModNPC.getTypeByName('PerforatorHeadLarge'),
        perforatorIchorShot: ModProjectile.getTypeByName('IchorShot'),
        perforatorBloodGeyser: ModProjectile.getTypeByName('BloodGeyser'),
        perforatorIchorBlob: ModProjectile.getTypeByName('IchorBlob'),
        stormlionMandible: ModItem.getTypeByName('StormlionMandible'),
        scourgeBag: ModItem.getTypeByName('DesertScourgeBag'),
        scourgeMask: ModItem.getTypeByName('DesertScourgeMask'),
        scourgeTrophy: ModItem.getTypeByName('DesertScourgeTrophy'),
        scourgeRelic: ModItem.getTypeByName('DesertScourgeRelic'),
        scourgeLore: ModItem.getTypeByName('LoreDesertScourge'),
        crabulon: ModNPC.getTypeByName('Crabulon'),
        crabShroom: ModNPC.getTypeByName('CrabShroom'),
        decapoditaSprout: ModItem.getTypeByName('DecapoditaSprout'),
        mushBomb: ModProjectile.getTypeByName('MushBomb'),
        mushBombGround: ModProjectile.getTypeByName('MushBombGround'),
        mushBombFall: ModProjectile.getTypeByName('MushBombFall'),
        crabulonBag: ModItem.getTypeByName('CrabulonBag'),
        crabulonMask: ModItem.getTypeByName('CrabulonMask'),
        crabulonTrophy: ModItem.getTypeByName('CrabulonTrophy'),
        crabulonRelic: ModItem.getTypeByName('CrabulonRelic'),
        crabulonLore: ModItem.getTypeByName('LoreCrabulon'),
        mycelialClaws: ModItem.getTypeByName('MycelialClaws'),
        fungicide: ModItem.getTypeByName('Fungicide'),
        hyphaeRod: ModItem.getTypeByName('HyphaeRod'),
        infestedClawmerang: ModItem.getTypeByName('InfestedClawmerang'),
        infestedClawmerangProj: ModProjectile.getTypeByName('InfestedClawmerangProj'),
        mycoroot: ModItem.getTypeByName('Mycoroot'),
        mycorootProj: ModProjectile.getTypeByName('MycorootProj'),
        puffShroom: ModItem.getTypeByName('PuffShroom'),
        puffWarrior: ModProjectile.getTypeByName('PuffWarrior'),
        puffCloud: ModProjectile.getTypeByName('PuffCloud'),
        puffWarriorBuff: ModBuff.getTypeByName('PuffWarriorBuff'),
        fungalClump: ModItem.getTypeByName('FungalClump'),
        fungalClumpMinion: ModProjectile.getTypeByName('FungalClumpMinion'),
        fungalHeal: ModProjectile.getTypeByName('FungalHeal'),
        fungalClumpBuff: ModBuff.getTypeByName('FungalClumpBuff'),
        fungiOrb: ModProjectile.getTypeByName('FungiOrb'),
        fungiOrb2: ModProjectile.getTypeByName('FungiOrb2'),
        mushyBuff: ModBuff.getTypeByName('Mushy'),
        m1Garand: ModItem.getTypeByName('M1Garand'),
        m1GarandHoldout: ModProjectile.getTypeByName('M1GarandHoldout'),
        m1GarandShot: ModProjectile.getTypeByName('M1GarandShot'),
        m1GarandCasing: ModProjectile.getTypeByName('M1GarandBulletCasing'),
        m1GarandClip: ModProjectile.getTypeByName('M1GarandEmptyClip'),
        m1GarandFlash: ModProjectile.getTypeByName('M1GarandMuzzleFlash'),
        m1GarandPing: ModProjectile.getTypeByName('M1GarandPingText'),
        hiveMind: ModNPC.getTypeByName('HiveMind'),
        hiveBlob: ModNPC.getTypeByName('HiveBlob'),
        dankCreeper: ModNPC.getTypeByName('DankCreeper'),
        darkHeart: ModNPC.getTypeByName('DarkHeart'),
        hiveTumor: ModNPC.getTypeByName('HiveTumor'),
        teratoma: ModItem.getTypeByName('Teratoma'),
        vileClot: ModProjectile.getTypeByName('VileClot'),
        shadeNimbus: ModProjectile.getTypeByName('ShadeNimbusHostile'),
        shaderain: ModProjectile.getTypeByName('ShaderainHostile'),
        brainRot: ModBuff.getTypeByName('BrainRot')
    };
}

export class PortDiagnostics extends ModPlayer {
    OnEnterWorld(player) {
        AbyssShrineLocatorTicks = 0;
    }

    PostUpdate(player) {
        if (!AbyssShrineLocatorEnabled || !player) return;
        AbyssShrineLocatorTicks++;
        if (AbyssShrineLocatorTicks < 120) return;
        AbyssShrineLocatorTicks = 0;
        TellAbyssShrineLocator(player);
    }

    SendMessage(player, rawMessage) {
        const message = String(rawMessage || '').trim().toLowerCase();
        const directHyphae = message === '/hyphae' || message === '/hyphaerod' || message === '/hifas';
        const directClawmerang = message === '/clawmerang' || message === '/infestedclawmerang' || message === '/clawmeranginfestado';
        const directMycoroot = message === '/mycoroot' || message === '/micoraiz';
        const directPuffShroom = message === '/puffshroom' || message === '/puff' || message === '/cogumelopuff';
        const directFungalClump = message === '/fungalclump' || message === '/clump' || message === '/aglomeradofungico';
        const directM1Garand = message === '/m1garand' || message === '/garand' || message === '/m1';
        const directAbyssShrine = message === '/abyssshrine' || message.startsWith('/abyssshrine ') || message === '/abismo' || message.startsWith('/abismo ') || message === '/santuarioabismo' || message.startsWith('/santuarioabismo ');
        if (!message.startsWith('/calamityport') && !message.startsWith('/calamitytl') && !directHyphae && !directClawmerang && !directMycoroot && !directPuffShroom && !directFungalClump && !directM1Garand && !directAbyssShrine)
            return true;
        const parts = message.split(/\s+/);
        const action = directHyphae ? 'hyphae' : (directClawmerang ? 'clawmerang' : (directMycoroot ? 'mycoroot' : (directPuffShroom ? 'puffshroom' : (directFungalClump ? 'fungalclump' : (directM1Garand ? 'm1garand' : (directAbyssShrine ? 'abyssshrine' : (parts[1] || 'help')))))));
        const types = GetTypes();
        if (action === 'help') {
            Tell('Bosses: scourge | medallion | divesplash | sandblasttest | scourgestatus | sourcesync | nuisancestatus | perforator | perforatorstatus | bossmusic | scourgehitsound | clearscourge | bossloot | trophy | relic.', 120, 220, 255);
            Tell('Crabulon: crabulon | sprout | crabulonstatus | crabulonspecial | crabulonphase4 | mushbombground | mushbombfall | crabulonmusic | androiddeath | crabulonloot | crabulontrophy | crabulonrelic | clearcrabulon.', 120, 220, 255);
            Tell('Hive Mind: hive | teratoma | hivetumor | hivephase2 | hivestatus | clearhive.', 170, 110, 255);
            Tell('Armas: mycelial | fungicide | m1garand | hyphae | clawmerang | mycoroot | puffshroom | sahara | slicerbolt | barinade | sandstream | brittlestar | starmode | scourgeweapon.', 120, 220, 255);
            Tell('Equipamento: fungalclump | fungalstatus | wulfrumarmor | wulfrummaterials | roverdrive | roverstatus | luxor | luxorstatus | droidemote [normal|sweat|status] | droidmode [attack|support|toggle|status] | bastion | bastionstatus | victidearmor | victidematerials | victidestatus | roguecore | roguestatus.', 120, 220, 255);
            Tell('Sistemas: sulphursea [preview|anchor|generate confirm|materials|materialstatus|urchin|stinger|gnasher|bile|resume|cancel|on|off|clear|status] | acidrain [start|stop|enemy|bubble|tear|block|allow|status] | abyss [status|enemy|box|cannonball|moray|toxic] | anchors [migrate confirm|resume|cancel|status] | sunkensea [preview|anchor|generate confirm|materials|ecology|creatures|giantclam|shopweapons|seaking|status] | abyssshrine [on|off|status] | revengeance | death | rippers | rage | adrenaline | performance | fusion | vfxbench | vfxfidelity | cheatmenu.', 120, 220, 255);
            return false;
        }
        if (action === 'abyssshrine') {
            const mode = directAbyssShrine ? String(parts[1] || 'on') : String(parts[2] || 'on');
            if (mode === 'off' || mode === 'desligar') {
                AbyssShrineLocatorEnabled = false;
                AbyssShrineLocatorTicks = 0;
                Tell('Localizador do Abyss Shrine desligado.', 180, 120, 255);
                return false;
            }
            if (mode === 'status') {
                Tell(`Localizador do Abyss Shrine: ${AbyssShrineLocatorEnabled ? 'ATIVO' : 'DESLIGADO'}.`, 180, 120, 255);
                TellAbyssShrineLocator(player);
                return false;
            }
            AbyssShrineLocatorEnabled = true;
            AbyssShrineLocatorTicks = 0;
            Tell('Localizador do Abyss Shrine ATIVO. A direção será atualizada a cada ~2 segundos.', 180, 120, 255);
            TellAbyssShrineLocator(player);
            return false;
        }
        if (action === 'droidmode' || action === 'wulfrumdroid' || action === 'droidai') {
            const state = ModPlayer.getByName('WulfrumControllerPlayer');
            if (!state) {
                Tell('WulfrumControllerPlayer não está registrado.', 255, 90, 90);
                return false;
            }
            const mode = String(parts[2] || 'status');
            if (mode === 'attack' || mode === 'ataque')
                state.SetMode(player, false, true);
            else if (mode === 'support' || mode === 'suporte' || mode === 'buff')
                state.SetMode(player, true, true);
            else if (mode === 'toggle' || mode === 'alternar')
                state.ToggleMode(player, true);
            const current = state.GetMode(player) ? 'support' : 'attack';
            Tell(`Wulfrum Droid: mode=${current} owned=${state.CountOwnedDroids(player)} support=${state.GetSupportCount(player)} ${GetWulfrumDroidEmoteStatus()}`, 120, 220, 255);
            return false;
        }
        if (action === 'droidemote' || action === 'wulfrumdroidemote' || action === 'droidstatus') {
            const mode = action === 'droidstatus' ? 'status' : String(parts[2] || 'normal');
            if (mode === 'status') {
                Tell(`Wulfrum Droid emote: ${GetWulfrumDroidEmoteStatus()}`, 120, 220, 255);
                return false;
            }

            const sweat = mode === 'sweat' || mode === 'suor';
            const result = ForceWulfrumDroidEmote(sweat);
            Tell(
                result.ok
                    ? `Emote ${result.kind} forçado no Wulfrum Droid (slot ${result.index}).`
                    : result.reason,
                result.ok ? 100 : 255,
                result.ok ? 255 : 150,
                result.ok ? 130 : 90
            );
            return false;
        }
        if (action === 'anchors' || action === 'anchorfix' || action === 'biomeanchors') {
            const mode = String(parts[2] || 'status');
            if (mode === 'migrate' || mode === 'migrar') {
                const confirm = String(parts[3] || '');
                if (confirm !== 'confirm' && confirm !== 'confirmar') {
                    Tell('A migração troca somente os anchors antigos de Areia Eutrófica e Areia Sulfurosa.', 255, 220, 120);
                    Tell('Saia dos dois biomas e confirme com /calamityport anchors migrate confirm', 255, 180, 90);
                    return false;
                }
                const result = BiomeAnchorMigrationRuntime.Start(player, false);
                Tell(result.ok ? 'Migração dos dois anchors iniciada em lotes.' : result.reason, result.ok ? 170 : 255, result.ok ? 255 : 150, result.ok ? 120 : 90);
                return false;
            }
            if (mode === 'resume' || mode === 'continuar') {
                const result = BiomeAnchorMigrationRuntime.Start(player, true);
                Tell(result.ok ? 'Migração dos anchors retomada.' : result.reason, result.ok ? 170 : 255, result.ok ? 255 : 150, result.ok ? 120 : 90);
                return false;
            }
            if (mode === 'cancel' || mode === 'pause' || mode === 'pausar') {
                const ok = BiomeAnchorMigrationRuntime.Cancel();
                Tell(ok ? 'Migração pausada. As células já convertidas permanecem válidas.' : 'Nenhuma migração está ativa.', 255, 220, 120);
                return false;
            }
            const compat = ModSystem.getByName('BiomeAnchorCompatibilitySystem');
            Tell(`Anchor migration: ${BiomeAnchorMigrationRuntime.GetStatus()}`, 130, 220, 255);
            Tell(`Anchor compatibility: ${compat && compat.GetStatus ? compat.GetStatus() : 'unavailable'}`, 170, 255, 120);
            Tell('Comandos: migrate confirm; resume; cancel; status.', 210, 235, 130);
            return false;
        }
        if (action === 'acidrain' || action === 'acid' || action === 'acidrainstatus') {
            const mode = action === 'acidrainstatus' ? 'status' : String(parts[2] || 'status');
            if (mode === 'start' || mode === 'on' || mode === 'iniciar') {
                const result = AcidRainTier1Runtime.Start(true, 'command');
                Tell(result.ok ? 'Acid Rain Tier 1 ativada. Acid Eels, Nuclear Toads, Radiators e Skyfins agora podem surgir no Sulphurous Sea.' : result.reason, result.ok ? 170 : 255, result.ok ? 255 : 150, result.ok ? 120 : 90);
                if (result.ok)
                    Tell('Bolhas ácidas surgem lentamente sobre Areia Sulfurosa submersa, seguindo o comportamento do tile original.', 190, 225, 90);
                return false;
            }
            if (mode === 'stop' || mode === 'off' || mode === 'parar') {
                const stopped = AcidRainTier1Runtime.Stop(false, false, 'command');
                Tell(stopped ? 'Acid Rain Tier 1 encerrada.' : 'A Acid Rain Tier 1 já estava desativada.', 255, 220, 120);
                return false;
            }
            if (mode === 'bubble' || mode === 'bolha') {
                const index = AcidRainTier1Runtime.SpawnNearPlayer(player, true);
                Tell(index >= 0 ? `Bolha ácida criada: projectile=${index}.` : 'Não encontrei um piso de Areia Sulfurosa com água suficiente perto do jogador.', index >= 0 ? 170 : 255, index >= 0 ? 255 : 180, index >= 0 ? 120 : 90);
                return false;
            }
            if (mode === 'tear' || mode === 'lagrima' || mode === 'lágrima') {
                const type = Number(ModItem.getTypeByName('CausticTear') || 0);
                if (!(type > 0)) { Tell('Lágrima Cáustica não registrada.', 255, 120, 90); return false; }
                const rect = Terraria.PlayerRect(player);
                const index = NewItem(Number(rect.X), Number(rect.Y), Number(rect.Width), Number(rect.Height), type, 1, false, 0, true);
                Tell(index >= 0 ? 'Lágrima Cáustica criada.' : 'Falha ao criar Lágrima Cáustica.', index >= 0 ? 170 : 255, index >= 0 ? 255 : 150, index >= 0 ? 120 : 90);
                return false;
            }
            if (mode === 'block' || mode === 'bloquear') {
                AcidRainTier1Runtime.SetNaturalBlocked(true);
                Tell('Chuvas Ácidas naturais bloqueadas.', 190, 220, 255);
                return false;
            }
            if (mode === 'allow' || mode === 'permitir') {
                AcidRainTier1Runtime.SetNaturalBlocked(false);
                Tell('Chuvas Ácidas naturais permitidas.', 115, 194, 147);
                return false;
            }
            if (mode === 'enemy' || mode === 'inimigo' || mode === 'eel' || mode === 'toad' || mode === 'radiator' || mode === 'skyfin') {
                const map = { eel: types.acidEel, toad: types.nuclearToad, radiator: types.radiator, skyfin: types.skyfin };
                const pool = [types.acidEel, types.nuclearToad, types.radiator, types.skyfin].filter(v => Number(v) > 0);
                const type = map[mode] > 0 ? map[mode] : (pool.length ? pool[Math.floor(Math.random() * pool.length)] : 0);
                if (!(type > 0)) {
                    Tell('Nenhum inimigo Tier 1 da Acid Rain foi registrado.', 255, 120, 90);
                    return false;
                }
                const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
                const index = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player) + 120), Math.floor(Terraria.PlayerCenterY(player) - 20), type, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
                if (index >= 0) {
                    let npc = null; try { npc = Terraria.Main.npc.get_Item(index); } catch (e) { }
                    if (npc) npc.netUpdate = true;
                }
                Tell(index >= 0 ? `Inimigo Acid Rain Tier 1 criado: npc=${index}, type=${type}.` : 'Falha ao criar inimigo Acid Rain Tier 1.', index >= 0 ? 170 : 255, index >= 0 ? 255 : 150, index >= 0 ? 120 : 90);
                return false;
            }
            Tell(`Acid Rain Tier 1: ${AcidRainTier1Runtime.GetStatus(player)}`, 190, 225, 90);
            Tell(`IDs: eel=${types.acidEel}, toad=${types.nuclearToad}, radiator=${types.radiator}, skyfin=${types.skyfin}, scale=${types.sulphuricScale}`, 170, 255, 120);
            Tell('Comandos: start; stop; enemy/eel/toad/radiator/skyfin; bubble; tear; block; allow; status.', 130, 220, 255);
            return false;
        }
        if (action === 'abyss' || action === 'abyss1' || action === 'abyssstatus') {
            const mode = action === 'abyssstatus' ? 'status' : String(parts[2] || 'status');
            if (mode === 'enemy' || mode === 'box' || mode === 'cannonball' || mode === 'moray' || mode === 'toxic') {
                const map = { box: types.boxJellyfish, cannonball: types.cannonballJellyfish, moray: types.morayEel, toxic: types.toxicMinnow };
                const pool = [types.boxJellyfish, types.cannonballJellyfish, types.morayEel, types.toxicMinnow].filter(v => Number(v) > 0);
                const type = Number(map[mode]) > 0 ? map[mode] : (pool.length ? pool[Math.floor(Math.random() * pool.length)] : 0);
                if (!(type > 0)) { Tell('Nenhum inimigo do Abyss Layer 1 foi registrado.', 255, 120, 90); return false; }
                const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
                const index = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player) + 110), Math.floor(Terraria.PlayerCenterY(player)), type, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
                if (index >= 0) { let npc = null; try { npc = Terraria.Main.npc.get_Item(index); } catch (e) { } if (npc) npc.netUpdate = true; }
                Tell(index >= 0 ? `Abyss Layer 1 enemy criado: npc=${index}, type=${type}.` : 'Falha ao criar inimigo do Abyss Layer 1.', index >= 0 ? 170 : 255, index >= 0 ? 255 : 150, index >= 0 ? 120 : 90);
                return false;
            }
            Tell(`Abyss Layer 1: ${AbyssLayer1Runtime.GetStatus(player)}`, 90, 190, 220);
            Tell(`Abyss Terrain: ${AbyssTerrainRuntime.GetStatus()}`, 100, 210, 240);
            Tell(`IDs: box=${types.boxJellyfish}, cannonball=${types.cannonballJellyfish}, moray=${types.morayEel}, toxic=${types.toxicMinnow}`, 130, 220, 255);
            Tell('Comandos: enemy; box; cannonball; moray; toxic; status.', 130, 220, 255);
            return false;
        }
        if (action === 'sulphursea' || action === 'sulphuroussea' || action === 'sulphur' || action === 'ssulphur' || action === 'sulphurseastatus') {
            const mode = action === 'sulphurseastatus' ? 'status' : String(parts[2] || 'status');
            if (mode === 'urchin' || mode === 'ourico' || mode === 'aquaticurchin') {
                if (!(types.aquaticUrchin > 0)) {
                    Tell('Ouriço Aquático não foi registrado.', 255, 120, 90);
                    return false;
                }
                const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
                const index = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player) + 72), Math.floor(Terraria.PlayerCenterY(player) + 12), types.aquaticUrchin, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
                if (index >= 0) {
                    const npc = Terraria.Main.npc[index];
                    if (npc)
                        npc.netUpdate = true;
                }
                Tell(index >= 0 ? `Ouriço Aquático criado: npc=${index}.` : 'Falha ao criar Ouriço Aquático.', index >= 0 ? 170 : 255, index >= 0 ? 255 : 150, index >= 0 ? 120 : 90);
                return false;
            }
            if (mode === 'stinger' || mode === 'ferrao' || mode === 'urchinstinger') {
                if (!(types.urchinStinger > 0)) {
                    Tell('Ferrão de Ouriço não foi registrado.', 255, 120, 90);
                    return false;
                }
                SpawnItem(player, types.urchinStinger, 1);
                Tell('Ferrão de Ouriço criado para teste.', 170, 255, 120);
                return false;
            }
            if (mode === 'gnasher' || mode === 'mordedor' || mode === 'turtle') {
                if (!(types.gnasher > 0)) {
                    Tell('Gnasher não foi registrado.', 255, 120, 90);
                    return false;
                }
                const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
                const index = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player) + 110), Math.floor(Terraria.PlayerCenterY(player) - 12), types.gnasher, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
                if (index >= 0) {
                    const npc = Terraria.Main.npc[index];
                    if (npc)
                        npc.netUpdate = true;
                }
                Tell(index >= 0 ? `Gnasher criado: npc=${index}.` : 'Falha ao criar Gnasher.', index >= 0 ? 170 : 255, index >= 0 ? 255 : 150, index >= 0 ? 120 : 90);
                return false;
            }
            if (mode === 'bile' || mode === 'contaminatedbile' || mode === 'bilecontaminada') {
                if (!(types.contaminatedBile > 0)) {
                    Tell('Bile Contaminada não foi registrada.', 255, 120, 90);
                    return false;
                }
                SpawnItem(player, types.contaminatedBile, 1);
                Tell('Bile Contaminada criada para teste.', 170, 255, 120);
                return false;
            }
            if (mode === 'sulflounder' || mode === 'linguado' || mode === 'flounder') {
                if (!(types.sulflounder > 0)) {
                    Tell('Linguado Sulfuroso não foi registrado.', 255, 120, 90);
                    return false;
                }
                const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
                const index = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player) + 120), Math.floor(Terraria.PlayerCenterY(player) - 8), types.sulflounder, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
                if (index >= 0) {
                    const npc = Terraria.Main.npc[index];
                    if (npc)
                        npc.netUpdate = true;
                }
                Tell(index >= 0 ? `Linguado Sulfuroso criado: npc=${index}.` : 'Falha ao criar Linguado Sulfuroso.', index >= 0 ? 170 : 255, index >= 0 ? 255 : 150, index >= 0 ? 120 : 90);
                return false;
            }
            if (mode === 'coating' || mode === 'anechoic' || mode === 'revestimento') {
                if (!(types.anechoicCoating > 0)) {
                    Tell('Revestimento Anecoico não foi registrado.', 255, 120, 90);
                    return false;
                }
                SpawnItem(player, types.anechoicCoating, 5);
                Tell('Cinco Revestimentos Anecoicos criados para teste.', 170, 255, 120);
                return false;
            }
            if (mode === 'preview' || mode === 'here' || mode === 'test') {
                if (SulphurousSeaTerrainRuntime.Generated) {
                    Tell('O terreno do Sulphurous Sea já foi gerado. A prévia não pode ser movida neste mundo.', 255, 180, 90);
                    return false;
                }
                const b = SulphurousSeaPreviewRuntime.PreviewHere(player);
                Tell(`Prévia visual do Sulphurous Sea ativada: X ${b.left}-${b.right}, Y ${b.top}-${b.bottom}. Nenhum bloco foi alterado.`, 190, 225, 90);
                return false;
            }
            if (mode === 'anchor' || mode === 'ocean' || mode === 'dungeon') {
                if (SulphurousSeaTerrainRuntime.Generated) {
                    Tell('O terreno já foi gerado. A âncora está bloqueada para continuar alinhada ao bioma.', 255, 180, 90);
                    return false;
                }
                const b = SulphurousSeaPreviewRuntime.AnchorDungeonOcean();
                Tell(`Âncora do Sulphurous Sea salva no oceano do lado da Dungeon: X ${b.left}-${b.right}, Y ${b.top}-${b.bottom}.`, 190, 225, 90);
                Tell('Viaje até esse oceano para testar fundo, água e músicas antes de gerar o terreno.', 210, 235, 130);
                return false;
            }
            if (mode === 'materials' || mode === 'blocks' || mode === 'materiais') {
                SpawnItem(player, types.sulphurousSand, 200, -30);
                SpawnItem(player, types.sulphurousSandstone, 200, -10);
                SpawnItem(player, types.hardenedSulphurousSandstone, 200, 10);
                SpawnItem(player, types.sulphurousShale, 200, 30);
                Tell('Materiais de teste entregues: Areia Sulfurosa, Arenito Sulfuroso, Arenito Sulfuroso Endurecido e Xisto Sulfuroso.', 170, 255, 120);
                return false;
            }
            if (mode === 'materialstatus' || mode === 'material' || mode === 'drops') {
                Tell(`Sulphurous Sea materials: ${SulphurousSeaMaterialRuntime.GetStatus()}`, 170, 255, 120);
                Tell(`IDs: sand=${types.sulphurousSand}, sandstone=${types.sulphurousSandstone}, hardened=${types.hardenedSulphurousSandstone}, shale=${types.sulphurousShale}`, 210, 235, 130);
                return false;
            }
            if (mode === 'autogen' || mode === 'repair' || mode === 'automatic') {
                const terrainSystem = ModSystem.getByName('SunkenSeaTerrainSystem');
                const result = terrainSystem && typeof terrainSystem.ForceAutomaticGeneration === 'function'
                    ? terrainSystem.ForceAutomaticGeneration()
                    : { ok: false, reason: 'Sistema automático indisponível.' };
                Tell(result.ok ? 'Geração automática do Sunken Sea iniciada ou já concluída.' : String(result.reason || 'Falha ao iniciar a geração automática.'), result.ok ? 90 : 255, result.ok ? 255 : 150, result.ok ? 180 : 90);
                return false;
            }
            if (mode === 'generate' || mode === 'build') {
                const confirm = String(parts[3] || '');
                if (confirm !== 'confirm' && confirm !== 'confirmar') {
                    Tell('AVISO: a geração altera permanentemente o oceano do lado da Dungeon. Use primeiro uma cópia do mundo.', 255, 120, 90);
                    Tell('Saia da área e confirme com /calamityport sulphursea generate confirm', 255, 220, 120);
                    return false;
                }
                const result = SulphurousSeaTerrainRuntime.Start(player, false);
                Tell(result.ok ? 'Geração do Sulphurous Sea iniciada em lotes. Use sulphursea status para acompanhar.' : result.reason, result.ok ? 170 : 255, result.ok ? 255 : 150, result.ok ? 120 : 90);
                return false;
            }
            if (mode === 'resume' || mode === 'continuar') {
                const result = SulphurousSeaTerrainRuntime.Start(player, true);
                Tell(result.ok ? 'Geração do Sulphurous Sea retomada.' : result.reason, result.ok ? 170 : 255, result.ok ? 255 : 150, result.ok ? 120 : 90);
                return false;
            }
            if (mode === 'cancel' || mode === 'stop' || mode === 'pausar') {
                const ok = SulphurousSeaTerrainRuntime.Cancel();
                Tell(ok ? 'Geração pausada. A parte já construída permanece no mundo.' : 'Nenhuma geração do Sulphurous Sea está ativa.', ok ? 255 : 180, ok ? 220 : 180, 120);
                return false;
            }
            if (mode === 'on' || mode === 'enable') {
                const ok = SulphurousSeaPreviewRuntime.Enable();
                Tell(ok ? 'Sulphurous Sea reativado.' : 'Nenhuma âncora salva. Use /calamityport sulphursea anchor.', ok ? 170 : 255, ok ? 255 : 170, ok ? 120 : 90);
                return false;
            }
            if (mode === 'off' || mode === 'disable') {
                SulphurousSeaPreviewRuntime.Disable();
                Tell('Visual do Sulphurous Sea desativado. O terreno gerado não foi removido.', 255, 220, 120);
                return false;
            }
            if (mode === 'clear' || mode === 'reset') {
                if (SulphurousSeaTerrainRuntime.Generated || SulphurousSeaTerrainRuntime.Paused || SulphurousSeaTerrainRuntime.Active) {
                    Tell('A âncora não pode ser apagada depois que a geração física começou.', 255, 180, 90);
                    return false;
                }
                SulphurousSeaPreviewRuntime.Clear();
                Tell('Âncora e prévia do Sulphurous Sea apagadas. Nenhum bloco foi alterado.', 255, 220, 120);
                return false;
            }
            const terrainVisual = ModSystem.getByName('SulphurousSeaTerrainVisualSystem');
            let urchins = 0;
            let gnashers = 0;
            let sulflounders = 0;
            let firstUrchin = null;
            let firstGnasher = null;
            let firstSulflounder = null;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active)
                    continue;
                if (types.aquaticUrchin > 0 && Number(npc.type) === Number(types.aquaticUrchin)) {
                    urchins++;
                    if (!firstUrchin)
                        firstUrchin = CalamityNPCState.Get(npc);
                }
                if (types.gnasher > 0 && Number(npc.type) === Number(types.gnasher)) {
                    gnashers++;
                    if (!firstGnasher)
                        firstGnasher = CalamityNPCState.Get(npc);
                }
                if (types.sulflounder > 0 && Number(npc.type) === Number(types.sulflounder)) {
                    sulflounders++;
                    if (!firstSulflounder)
                        firstSulflounder = CalamityNPCState.Get(npc);
                }
            }
            Tell(`Sulphurous Sea fauna: urchin=${types.aquaticUrchin}/${urchins} gnasher=${types.gnasher}/${gnashers} sulflounder=${types.sulflounder}/${sulflounders}`, 170, 255, 120);
            Tell(`Drops: stinger=${types.urchinStinger}/${types.urchinStingerProj} bile=${types.contaminatedBile}/${types.contaminatedBileFlask} coating=${types.anechoicCoating}/${types.anechoicCoatingBuff} mist=${types.sulphuricAcidMist}`, 170, 255, 120);
            if (firstUrchin)
                Tell(`Aquatic Urchin AI: attached=${firstUrchin.attached === true} mode=${Math.floor(Number(firstUrchin.mode) || 0)} turns=${Math.floor(Number(firstUrchin.turns) || 0)}`, 210, 235, 130);
            if (firstGnasher)
                Tell(`Gnasher AI: speedLimit=${Number(firstGnasher.speedLimit || 0).toFixed(2)} distance=${Math.floor(Number(firstGnasher.distance) || 0)}`, 210, 235, 130);
            if (firstSulflounder)
                Tell(`Sulflounder AI: phase=${Math.floor(Number(firstSulflounder.phase) || 0)} distance=${Math.floor(Number(firstSulflounder.distance) || 0)} coating=${firstSulflounder.coating === true} attack=${Math.floor(Number(firstSulflounder.attackTimer) || 0)}/180`, 210, 235, 130);
            Tell(`Sulphurous Sea: ${SulphurousSeaPreviewRuntime.GetStatus(player)}`, 190, 225, 90);
            Tell(`Terrain: ${SulphurousSeaTerrainRuntime.GetStatus()}`, 170, 255, 120);
            Tell(`Materials: ${SulphurousSeaMaterialRuntime.GetStatus()} visual=${terrainVisual && terrainVisual.GetStatus ? terrainVisual.GetStatus() : 'unavailable'}`, 210, 235, 130);
            Tell('Comandos: preview; anchor; generate confirm; materials; materialstatus; urchin; stinger; gnasher; bile; sulflounder; coating; resume; cancel; on/off; clear; status.', 130, 220, 255);
            return false;
        }
        if (action === 'sunkensea' || action === 'sunken' || action === 'sspreview' || action === 'sunkenseastatus') {
            const mode = action === 'sunkenseastatus' ? 'status' : String(parts[2] || 'status');
            if (mode === 'preview' || mode === 'here' || mode === 'test') {
                if (SunkenSeaTerrainRuntime.Generated) {
                    Tell('O terreno experimental já foi gerado. A prévia não pode ser movida neste mundo.', 255, 180, 90);
                    return false;
                }
                const b = SunkenSeaPreviewRuntime.PreviewHere(player);
                Tell(`Prévia do Sunken Sea ativada ao redor do jogador: X ${b.left}-${b.right}, Y ${b.top}-${b.bottom}. Nenhum bloco foi alterado.`, 80, 235, 240);
                Tell('Para visualizar melhor o fundo subterrâneo, use o comando dentro de uma caverna e caminhe alguns blocos.', 130, 220, 255);
                return false;
            }
            if (mode === 'anchor' || mode === 'below' || mode === 'desert') {
                if (SunkenSeaTerrainRuntime.Generated) {
                    Tell('O terreno experimental já foi gerado. A âncora está bloqueada para continuar alinhada ao bioma.', 255, 180, 90);
                    return false;
                }
                const b = SunkenSeaPreviewRuntime.AnchorBelowDesert(player);
                Tell(`Âncora experimental salva abaixo desta posição do deserto: X ${b.left}-${b.right}, Y ${b.top}-${b.bottom}.`, 80, 235, 240);
                Tell('Esta fase não gera terreno. Viaje até a área para testar água, fundo, iluminação e música.', 130, 220, 255);
                return false;
            }
            if (mode === 'materials' || mode === 'blocks' || mode === 'materiais') {
                SpawnItem(player, types.eutrophicSand, 200, -24);
                SpawnItem(player, types.navystone, 200, -8);
                SpawnItem(player, types.prism, 100, 8);
                SpawnItem(player, types.prismShard, 25, 24);
                Tell('Materiais de teste: 200 Areias Eutróficas, 200 Navystones, 100 Sea Prisms e 25 Prism Shards.', 90, 255, 180);
                Tell('Coloque alguns blocos fora do bioma e quebre-os para validar o registro por coordenada.', 130, 220, 255);
                return false;
            }
            if (mode === 'materialstatus' || mode === 'material' || mode === 'drops') {
                Tell(`Sunken Sea materials: ${SunkenSeaMaterialRuntime.GetStatus()}`, 90, 255, 180);
                Tell(`IDs: eutrophic=${types.eutrophicSand}, navystone=${types.navystone}, seaPrism=${types.prism}, prismShard=${types.prismShard}, pearl=${types.pearl}`, 130, 220, 255);
                return false;
            }
            if (mode === 'ecology' || mode === 'ecossistema' || mode === 'ecologystatus') {
                const ecology = ModSystem.getByName('SunkenSeaEcologySystem');
                const terrainVisual = ModSystem.getByName('SunkenSeaTerrainVisualSystem');
                Tell(`Sunken Sea ecology: ${ecology ? ecology.GetStatus() : SunkenSeaEcologyRuntime.GetStatus()}`, 90, 255, 180);
                Tell(`Biome: inside=${SunkenSeaPreviewRuntime.ContainsPlayer(player)} generated=${SunkenSeaTerrainRuntime.Generated} preview=${SunkenSeaPreviewRuntime.Enabled} visual=${terrainVisual && terrainVisual.GetStatus ? terrainVisual.GetStatus() : 'unavailable'}`, 80, 235, 240);
                Tell(`NPC IDs: floaty=${types.seaFloaty}, minnow=${types.seaMinnow}, clam=${types.clam}, ray=${types.eutrophicRay}, prismBack=${types.prismBack}, giantClam=${types.giantClam}; critterItem=${types.seaMinnowItem}.`, 130, 220, 255);
                return false;
            }
            if (mode === 'populate' || mode === 'decor' || mode === 'popular') {
                const ecology = ModSystem.getByName('SunkenSeaEcologySystem');
                const ok = ecology && typeof ecology.BeginPopulate === 'function' && ecology.BeginPopulate(true);
                Tell(ok ? 'População visual do Sunken Sea iniciada em pequenos lotes.' : 'O terreno físico precisa estar gerado antes de popular o ecossistema.', ok ? 90 : 255, ok ? 255 : 150, ok ? 180 : 90);
                return false;
            }
            if (mode === 'creatures' || mode === 'criaturas' || mode === 'mobs') {
                const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
                const px = Math.floor(Terraria.PlayerCenterX(player));
                const py = Math.floor(Terraria.PlayerCenterY(player));
                const a = types.seaFloaty > 0 ? Terraria.NPC.NewNPC(source, px - 120, py - 30, types.seaFloaty, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player)) : -1;
                const b = types.seaMinnow > 0 ? Terraria.NPC.NewNPC(source, px + 80, py - 20, types.seaMinnow, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player)) : -1;
                const c = types.clam > 0 ? Terraria.NPC.NewNPC(source, px + 150, py + 20, types.clam, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player)) : -1;
                const d = types.eutrophicRay > 0 ? Terraria.NPC.NewNPC(source, px - 220, py - 40, types.eutrophicRay, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player)) : -1;
                const e = types.prismBack > 0 ? Terraria.NPC.NewNPC(source, px + 230, py - 40, types.prismBack, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player)) : -1;
                Tell(`Criaturas do Sunken Sea criadas: Floaty=${a}, Minnow=${b}, Clam=${c}, Ray=${d}, PrismBack=${e}.`, 90, 255, 180);
                return false;
            }
            if (mode === 'giantclam' || mode === 'giant' || mode === 'clamden' || mode === 'miniboss') {
                if (!SunkenSeaTerrainRuntime.Generated) {
                    Tell('Gere o terreno do Sunken Sea antes de criar o Giant Clam.', 255, 160, 90);
                    return false;
                }
                const index = SpawnGiantClamAtDen(player);
                Tell(index >= 0 ? `Giant Clam criada na câmara central: slot=${index}. Acerte a concha cinco vezes para despertá-la.` : 'Uma Giant Clam já está ativa ou o tipo ainda não foi registrado.', index >= 0 ? 90 : 255, index >= 0 ? 255 : 170, index >= 0 ? 180 : 90);
                return false;
            }
            if (mode === 'shopweapons' || mode === 'arsenal' || mode === 'loja') {
                const weaponTypes = [types.shellshooter, types.snapClam, types.sandDollar, types.waywasher, types.amidiasTrident, types.enchantedConch, types.polypLauncher];
                const offsets = [-90, -60, -30, 0, 30, 60, 90];
                for (let i = 0; i < weaponTypes.length; i++)
                    if (weaponTypes[i] > 0)
                        SpawnItem(player, weaponTypes[i], 1, offsets[i]);
                Tell('Arsenal de Amidias entregue: sete armas da loja do Sea King.', 90, 255, 190);
                return false;
            }
            if (mode === 'rewards' || mode === 'clamloot' || mode === 'giantclamloot') {
                const rewardTypes = [types.giantPearl, types.amidiasPendant, types.giantClamTrophy, types.giantClamRelic];
                const offsets = [-54, -18, 18, 54];
                for (let i = 0; i < rewardTypes.length; i++)
                    if (rewardTypes[i] > 0)
                        SpawnItem(player, rewardTypes[i], 1, offsets[i]);
                Tell('Recompensas do Giant Clam entregues: Pérola Gigante, Pingente de Amidias, troféu e relíquia.', 90, 255, 190);
                return false;
            }
            if (mode === 'seaking' || mode === 'amidias') {
                if (!(types.seaKing > 0)) {
                    Tell('Sea King não foi registrado.', 255, 100, 100);
                    return false;
                }
                if (Terraria.NPC.AnyNPCs(types.seaKing)) {
                    Tell('Amidias já está presente no mundo.', 180, 220, 255);
                    return false;
                }
                const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
                const idx = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player) + 80), Math.floor(Terraria.PlayerCenterY(player)), types.seaKing, 0, 0, 0, 0, 0, 255);
                if (idx >= 0)
                    Terraria.Main.npc[idx].netUpdate = true;
                Tell(`Amidias criado no slot ${idx}.`, 90, 255, 190);
                return false;
            }
            if (mode === 'clamstatus' || mode === 'giantclamstatus' || mode === 'denstatus') {
                const world = ModSystem.getByName('CalamityWorldState');
                const px = Math.floor(Terraria.PlayerCenterX(player) / 16), py = Math.floor(Terraria.PlayerCenterY(player) / 16);
                let detail = 'inactive';
                if (types.giantClam > 0) {
                    const slot = Number(Terraria.NPC.FindFirstNPC(types.giantClam));
                    if (slot >= 0) {
                        const giant = Terraria.Main.npc[slot];
                        const gs = giant ? CalamityNPCState.Get(giant) : null;
                        detail = `slot=${slot}, hits=${Math.max(0, Math.min(5, Number(gs?.hitAmount || 0)))}/5, awake=${gs?.awake === true}, warmup=${Math.max(0, Number(gs?.warmup || 0))}/240, idle=${Math.max(0, Number(gs?.giantClamIdleTimer || 0))}/240, attack=${Number(gs?.attack ?? -1)}, stage=${Math.max(0, Number(gs?.attackStage || 0))}, stageTimer=${Math.max(0, Number(gs?.stageTimer || 0))}`;
                    }
                }
                const clamityType = Number(ModBuff.getTypeByName('Clamity') || 0);
                const clamityActive = clamityType > 0 && Number(player.FindBuffIndex(clamityType)) >= 0;
                Tell(`Giant Clam: type=${types.giantClam}, active=${types.giantClam > 0 && Terraria.NPC.AnyNPCs(types.giantClam)}, downed=${world && world.DownedGiantClam === true}, inDen=${IsGiantClamDenTile(px, py, 0)}, clamity=${clamityActive}, ${detail}.`, 90, 255, 180);
                return false;
            }
            if (mode === 'generate' || mode === 'build') {
                const confirm = String(parts[3] || '');
                if (confirm !== 'confirm' && confirm !== 'confirmar') {
                    Tell('AVISO: a geração altera permanentemente milhares de blocos. Use apenas em um mundo descartável.', 255, 120, 90);
                    Tell('Fique fora da área e confirme com /calamityport sunkensea generate confirm', 255, 220, 120);
                    return false;
                }
                const result = SunkenSeaTerrainRuntime.Start(player, false);
                Tell(result.ok ? 'Geração experimental iniciada em lotes. Use sunkensea status para acompanhar.' : result.reason, result.ok ? 90 : 255, result.ok ? 255 : 150, result.ok ? 170 : 90);
                return false;
            }
            if (mode === 'resume' || mode === 'continuar') {
                const result = SunkenSeaTerrainRuntime.Start(player, true);
                Tell(result.ok ? 'Geração experimental retomada.' : result.reason, result.ok ? 90 : 255, result.ok ? 255 : 150, result.ok ? 170 : 90);
                return false;
            }
            if (mode === 'cancel' || mode === 'stop' || mode === 'pausar') {
                const ok = SunkenSeaTerrainRuntime.Cancel();
                Tell(ok ? 'Geração pausada. A parte já construída permanece no mundo.' : 'Nenhuma geração está ativa.', ok ? 255 : 180, ok ? 220 : 180, 120);
                return false;
            }
            if (mode === 'on' || mode === 'enable') {
                const ok = SunkenSeaPreviewRuntime.Enable();
                Tell(ok ? 'Prévia do Sunken Sea reativada.' : 'Nenhuma âncora salva. Use /calamityport sunkensea preview ou anchor.', ok ? 100 : 255, ok ? 255 : 170, ok ? 160 : 90);
                return false;
            }
            if (mode === 'off' || mode === 'disable') {
                SunkenSeaPreviewRuntime.Disable();
                Tell('Prévia do Sunken Sea desativada. O mundo não foi modificado.', 255, 220, 120);
                return false;
            }
            if (mode === 'clear' || mode === 'reset') {
                if (SunkenSeaTerrainRuntime.Generated || SunkenSeaTerrainRuntime.Paused || SunkenSeaTerrainRuntime.Active) {
                    Tell('A âncora não pode ser apagada depois que a geração física começou. O comando off ainda desativa apenas o visual.', 255, 180, 90);
                    return false;
                }
                SunkenSeaPreviewRuntime.Clear();
                Tell('Âncora e prévia do Sunken Sea apagadas. O mundo não foi modificado.', 255, 220, 120);
                return false;
            }
            const terrainSystem = ModSystem.getByName('SunkenSeaTerrainSystem');
            Tell(`Sunken Sea preview: ${SunkenSeaPreviewRuntime.GetStatus(player)}`, 80, 235, 240);
            Tell(`Terrain: ${SunkenSeaTerrainRuntime.GetStatus()}`, 90, 255, 180);
            Tell(`Autogen: ${terrainSystem && typeof terrainSystem.GetAutoStatus === 'function' ? terrainSystem.GetAutoStatus() : 'unavailable'}`, 130, 220, 255);
            Tell('Comandos: autogen/repair; preview; anchor; generate confirm; materials; materialstatus; ecology; populate; creatures; giantclam; clamstatus; rewards; shopweapons; seaking; resume; cancel; on/off; clear; status.', 130, 220, 255);
            return false;
        }
        if (action === 'fungalstatus' || action === 'clumpstatus' || action === 'fungalhealstatus') {
            const clump = FindOrCacheFungalClump(Terraria.PlayerIndex(player), types.fungalClumpMinion);
            const heals = GetFungalHealDiagnostics(Terraria.PlayerIndex(player));
            if (!clump) {
                Tell(`Fungal Clump: companheiro inativo. FungalHeal type=${types.fungalHeal}. pendentes=${heals.pending}, criados=${heals.spawned}, entregues=${heals.delivered}, fallback=${heals.emergency}.`, 255, 190, 100);
            } else {
                Tell(`Fungal Clump slot=${clump.whoAmI}, mode=${GetFungalClumpModeName(clump)}, dmg=${clump.damage}, minion=${clump.minion}, friendly=${clump.friendly}.`, 120, 230, 255);
                Tell(`Cura: type=${types.fungalHeal}, pendentes=${heals.pending}, criados=${heals.spawned}, entregues=${heals.delivered}, fallback=${heals.emergency}, expirados=${heals.expired}.`, 120, 255, 170);
            }
            return false;
        }
        if (action === 'scourgehitsound3' || action === 'deserthit3' || action === 'scourgehit3') {
            try {
                if (PlayItemSound(147, Terraria.PlayerCenter(player), 0, 1.0))
                    Tell('Terceira variação nativa de dano do Desert Scourge iniciada no Item_147.', 255, 210, 120);
                else
                    Tell('Item_147 não pôde ser reproduzido nesta versão do TLPro.', 255, 100, 100);
            } catch (e) {
                Tell(`Falha ao tocar Item_147: ${String(e).slice(0, 140)}`, 255, 100, 100);
            }
            return false;
        }
        if (action === 'scourgehitsound2' || action === 'deserthit2' || action === 'scourgehit2') {
            try {
                if (PlayItemSound(146, Terraria.PlayerCenter(player), 0, 1.0))
                    Tell('Segunda variação nativa de dano do Desert Scourge iniciada no Item_146.', 255, 210, 120);
                else
                    Tell('Item_146 não pôde ser reproduzido nesta versão do TLPro.', 255, 100, 100);
            } catch (e) {
                Tell(`Falha ao tocar Item_146: ${String(e).slice(0, 140)}`, 255, 100, 100);
            }
            return false;
        }
        if (action === 'scourgehitsound' || action === 'deserthit1' || action === 'scourgehit1') {
            try {
                if (PlayItemSound(145, Terraria.PlayerCenter(player), 0, 1.0))
                    Tell('Primeiro som nativo de dano do Desert Scourge iniciado no Item_145.', 255, 210, 120);
                else
                    Tell('Item_145 não pôde ser reproduzido nesta versão do TLPro.', 255, 100, 100);
            } catch (e) {
                Tell(`Falha ao tocar Item_145: ${String(e).slice(0, 140)}`, 255, 100, 100);
            }
            return false;
        }
        if (action === 'sandblastsound' || action === 'scourgesandblast' || action === 'sandblastaudio') {
            try {
                if (PlayItemSound(144, Terraria.PlayerCenter(player), 0, 1.0))
                    Tell('Som nativo da rajada de areia iniciado no Item_144.', 255, 210, 120);
                else
                    Tell('Item_144 não pôde ser reproduzido nesta versão do TLPro.', 255, 100, 100);
            } catch (e) {
                Tell(`Falha ao tocar Item_144: ${String(e).slice(0, 140)}`, 255, 100, 100);
            }
            return false;
        }
        if (action === 'androidscourgedeath' || action === 'scourgedeathsound' || action === 'desertdeath') {
            const gameVolume = Number(Terraria.Main.soundVolume);
            const volume = Number.isFinite(gameVolume) ? Math.max(0, Math.min(1, gameVolume)) : 1.0;
            const result = AndroidSound.PlayExclusive('desert-scourge-voice', 'Common/Sounds/DesertScourgeDeath.ogg', volume, Number(Terraria.PlayerCenterX(player)), Number(Terraria.PlayerCenterY(player)), 1800, 180, 0, true);
            if (result.ok)
                Tell('AndroidSound: som de morte do Flagelo do Deserto iniciado.', 255, 190, 105);
            else
                Tell(`AndroidSound falhou: ${String(result.error || AndroidSound.LastError).slice(0, 140)}`, 255, 100, 100);
            return false;
        }
        if (action === 'androidroar' || action === 'scourgeroar' || action === 'desertroar') {
            const gameVolume = Number(Terraria.Main.soundVolume);
            const volume = Number.isFinite(gameVolume) ? Math.max(0, Math.min(1, gameVolume)) : 1.0;
            const result = AndroidSound.PlayExclusive('desert-scourge-voice', 'Common/Sounds/DesertScourgeRoar.ogg', volume, Number(Terraria.PlayerCenterX(player)), Number(Terraria.PlayerCenterY(player)), 1800, 180, 0, true);
            if (result.ok)
                Tell('AndroidSound: rugido do Flagelo do Deserto iniciado.', 255, 210, 120);
            else
                Tell(`AndroidSound falhou: ${String(result.error || AndroidSound.LastError).slice(0, 140)}`, 255, 100, 100);
            return false;
        }
        if (action === 'androiddeath' || action === 'crabdeathsound' || action === 'mediadeath') {
            const gameVolume = Number(Terraria.Main.soundVolume);
            const volume = Number.isFinite(gameVolume) ? Math.max(0, Math.min(1, gameVolume)) : 1.0;
            const result = AndroidSound.PlayExclusive('crabulon-voice', 'Common/Sounds/CrabulonDeath.ogg', volume, Number(Terraria.PlayerCenterX(player)), Number(Terraria.PlayerCenterY(player)), 1400, 60, 0, true);
            if (result.ok)
                Tell('AndroidSound: som de morte do Crabulon iniciado.', 100, 255, 130);
            else
                Tell(`AndroidSound falhou: ${String(result.error || AndroidSound.LastError).slice(0, 140)}`, 255, 100, 100);
            return false;
        }
        if (action === 'teratoma') {
            if (types.teratoma > 0) {
                SpawnItem(player, types.teratoma, 1);
                Tell('Teratoma entregue. Use dentro da Corrupção para invocar a Hive Mind.', 185, 100, 255);
            } else
                Tell('Teratoma não foi registrada.', 255, 90, 90);
            return false;
        }
        if (action === 'hivetumor' || action === 'tumor') {
            if (!(types.hiveTumor > 0)) {
                Tell('Hive Tumor não foi registrado.', 255, 90, 90);
                return false;
            }
            const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Number(Terraria.PlayerCenterX(player)) + 100), Math.floor(Number(Terraria.PlayerCenterY(player))), types.hiveTumor, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
            if (index >= 0 && index < 200)
                Terraria.Main.npc[index].netUpdate = true;
            Tell(`Hive Tumor criado no slot ${index}.`, 185, 100, 255);
            return false;
        }
        if (action === 'hive' || action === 'hivemind' || action === 'mente') {
            if (!(types.hiveMind > 0)) {
                Tell('Hive Mind não foi registrada.', 255, 90, 90);
                return false;
            }
            if (Terraria.NPC.AnyNPCs(types.hiveMind)) {
                Tell('Hive Mind já está ativa.', 255, 180, 90);
                return false;
            }
            const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Number(Terraria.PlayerCenterX(player))), Math.floor(Number(Terraria.PlayerCenterY(player)) - 180), types.hiveMind, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
            if (index >= 0 && index < 200) {
                Terraria.Main.npc[index].target = Terraria.PlayerIndex(player);
                Terraria.Main.npc[index].netUpdate = true;
            }
            Tell(`Hive Mind criada no slot ${index}. A luta exige o bioma Corrupção, igual ao código atual.`, 185, 100, 255);
            return false;
        }
        if (action === 'hivephase2' || action === 'hivep2') {
            let boss = null;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (npc && npc.active && npc.type === types.hiveMind) {
                    boss = npc;
                    break;
                }
            }
            if (!boss) {
                Tell('Nenhuma Hive Mind ativa.', 255, 180, 90);
                return false;
            }
            boss.life = Math.max(1, Math.floor(Number(boss.lifeMax) * 0.79));
            boss.netUpdate = true;
            Tell(`Hive Mind colocada em 79% de vida (${boss.life}/${boss.lifeMax}).`, 185, 100, 255);
            return false;
        }
        if (action === 'hivestatus' || action === 'hivemindstatus') {
            let boss = null;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (npc && npc.active && npc.type === types.hiveMind) {
                    boss = npc;
                    break;
                }
            }
            if (!boss) {
                Tell('Hive Mind inativa.', 180, 180, 180);
                return false;
            }
            const state = CalamityNPCState.Get(boss);
            const ratio = Number(boss.life) / Math.max(1, Number(boss.lifeMax));
            Tell(`Hive Mind slot=${boss.whoAmI}, life=${boss.life}/${boss.lifeMax}, phase=${ratio < 0.8 ? 2 : 1}, state=${state.hiveState ?? 0}, timer=${state.phase2Timer ?? state.burrowTimer ?? 0}, alpha=${boss.alpha}, scale=${Number(boss.scale).toFixed(2)}.`, 185, 100, 255);
            Tell(`Minions: blobs=${Terraria.NPC.CountNPCS(types.hiveBlob)}, dank=${Terraria.NPC.CountNPCS(types.dankCreeper)}, hearts=${Terraria.NPC.CountNPCS(types.darkHeart)}, clouds=${CountActiveProjectiles(types.shadeNimbus)}, rain=${CountActiveProjectiles(types.shaderain)}.`, 150, 210, 255);
            return false;
        }
        if (action === 'clearhive' || action === 'hiveclear') {
            const npcTypes = [types.hiveMind, types.hiveBlob, types.dankCreeper, types.darkHeart, types.hiveTumor];
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (npc && npc.active && npcTypes.includes(Number(npc.type))) {
                    npc.active = false;
                    npc.timeLeft = 0;
                    npc.netUpdate = true;
                }
            }
            const projTypes = [types.vileClot, types.shadeNimbus, types.shaderain];
            for (let i = 0; i < 1000; i++) {
                const proj = Terraria.Main.projectile[i];
                if (proj && proj.active && projTypes.includes(Number(proj.type)))
                    proj.Kill();
            }
            Tell('Hive Mind, minions e projéteis removidos.', 180, 180, 180);
            return false;
        }
        if (action === 'status') {
            const values = Object.values(types);
            const ok = values.every(type => type > 0);
            if (ok) {
                Tell(`Calamity TLPro Port OK — Flagelo do Deserto completo e Crabulon ${types.crabulon} com Broto, Cogumelos-Caranguejo, projéteis e música registrados.`, 100, 255, 130);
            } else {
                Tell(`Falha de registro do Calamity TLPro Port: ${JSON.stringify(types)}.`, 255, 90, 90);
            }
            return false;
        }
        if (action === 'revengeance' || action === 'revenge' || action === 'rev') {
            const worldState = ModSystem.getByName('CalamityWorldState');
            const playerState = ModPlayer.getByName('CalamityPlayerState');
            if (!worldState || !playerState) {
                Tell('Rage/Adrenaline state foundation is missing.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'status';
            if (option === 'on' || option === 'true' || option === 'ativar' || option === 'ativado') {
                worldState.SetRevengeanceMode(true);
                Tell('Modo Revengeance ATIVADO. As barras e os botões FÚRIA/ADREN. aparecerão no topo da tela.', 255, 120, 100);
            } else if (option === 'off' || option === 'false' || option === 'desativar' || option === 'desativado') {
                worldState.SetRevengeanceMode(false);
                playerState.RageModeActive = false;
                playerState.AdrenalineModeActive = false;
                Tell('Modo Revengeance DESATIVADO. As barras irão esvaziar e desaparecer.', 180, 180, 180);
            } else if (option === 'toggle' || option === 'alternar') {
                const enabled = worldState.SetRevengeanceMode(!worldState.RevengeanceMode);
                Tell(`Modo Revengeance ${enabled ? 'ATIVADO' : 'DESATIVADO'}.`, enabled ? 255 : 180, enabled ? 120 : 180, enabled ? 100 : 180);
            } else {
                Tell(`Modo Revengeance: ${worldState.RevengeanceMode ? 'ATIVADO' : 'DESATIVADO'}.`, worldState.RevengeanceMode ? 255 : 180, worldState.RevengeanceMode ? 120 : 180, worldState.RevengeanceMode ? 100 : 180);
            }
            return false;
        }
        if (action === 'death' || action === 'deathmode' || action === 'morte') {
            const worldState = ModSystem.getByName('CalamityWorldState');
            if (!worldState || !worldState.SetDeathMode) {
                Tell('Death Mode state foundation is missing.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'status';
            if (option === 'on' || option === 'true' || option === 'ativar' || option === 'ativado') {
                worldState.SetDeathMode(true);
                Tell('Death Mode ATIVADO. Revengeance também permanece ativo, como no Calamity.', 255, 95, 95);
            } else if (option === 'off' || option === 'false' || option === 'desativar' || option === 'desativado') {
                worldState.SetDeathMode(false);
                Tell('Death Mode DESATIVADO. Revengeance não foi desligado.', 190, 190, 190);
            } else if (option === 'toggle' || option === 'alternar') {
                const enabled = worldState.SetDeathMode(!worldState.DeathMode);
                Tell(`Death Mode ${enabled ? 'ATIVADO' : 'DESATIVADO'}.`, enabled ? 255 : 190, enabled ? 95 : 190, enabled ? 95 : 190);
            } else {
                Tell(`Death Mode: ${worldState.DeathMode ? 'ATIVADO' : 'DESATIVADO'}; Revengeance=${worldState.RevengeanceMode ? 'ATIVO' : 'INATIVO'}.`, worldState.DeathMode ? 255 : 190, worldState.DeathMode ? 95 : 190, worldState.DeathMode ? 95 : 190);
            }
            return false;
        }
        if (action === 'rippers' || action === 'meters' || action === 'medidores') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            const worldState = ModSystem.getByName('CalamityWorldState');
            if (!state || !worldState) {
                Tell('Rage/Adrenaline state foundation is missing.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'status';
            if (option === 'fill' || option === 'full' || option === 'encher') {
                if (!worldState.RevengeanceMode)
                    worldState.SetRevengeanceMode(true);
                state.Rage = state.RageMax;
                state.Adrenaline = state.AdrenalineMax;
                state.RageModeActive = false;
                state.AdrenalineModeActive = false;
                state.RageReadyTimer = state.RageReadyDuration;
                state.RageReadyGraceUsed = true;
                state.RageReadyHeld = true;
                state.SaveRippers();
                Tell('Fúria e Adrenalina preenchidas. Toque nos botões FÚRIA e ADREN. abaixo das barras.', 255, 210, 90);
            } else if (option === 'clear' || option === 'reset' || option === 'limpar') {
                state.Rage = 0;
                state.Adrenaline = 0;
                state.RageModeActive = false;
                state.AdrenalineModeActive = false;
                state.RageReadyTimer = 0;
                state.RageReadyGraceUsed = false;
                state.RageReadyHeld = false;
                state.SaveRippers();
                Tell('Fúria e Adrenalina zeradas.', 180, 180, 180);
            } else {
                Tell(`Rippers: ${state.GetRipperSummary()}.`, 120, 220, 255);
            }
            return false;
        }
        if (action === 'touchstatus' || action === 'touch' || action === 'botoes' || action === 'botões') {
            const ui = GlobalHooks.getByName('RipperUIHooks');
            if (!ui) {
                Tell('RipperUIHooks is missing.', 255, 90, 90);
                return false;
            }
            Tell(`Touch UI: raw=${ui.RawTouchAvailable}/${ui.LastRawTouchCount}, world=${ui.WorldTouchAvailable}@${ui.LastWorldMouseX},${ui.LastWorldMouseY}, source=${ui.LastInputSource}, last=${ui.LastActivation}@${ui.LastTouchX},${ui.LastTouchY}.`, (ui.RawTouchAvailable || ui.WorldTouchAvailable) ? 100 : 255, (ui.RawTouchAvailable || ui.WorldTouchAvailable) ? 255 : 180, (ui.RawTouchAvailable || ui.WorldTouchAvailable) ? 130 : 90);
            if (ui.LastTouchError)
                Tell(`Raw touch error: ${ui.LastTouchError}.`, 255, 160, 90);
            return false;
        }
        if (action === 'rage' || action === 'furia' || action === 'fúria') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            const worldState = ModSystem.getByName('CalamityWorldState');
            if (!state || !worldState) {
                Tell('Rage state is missing.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'status';
            if (option === 'fill' || option === 'full' || option === 'encher') {
                if (!worldState.RevengeanceMode)
                    worldState.SetRevengeanceMode(true);
                state.Rage = state.RageMax;
                state.RageModeActive = false;
                state.RageReadyTimer = state.RageReadyDuration;
                state.RageReadyGraceUsed = true;
                state.RageReadyHeld = true;
                state.SaveRippers();
                Tell('Fúria preenchida e protegida por 8 segundos. Toque no botão FÚRIA abaixo das barras ou use /calamityport rage activate.', 255, 110, 90);
            } else if (option === 'activate' || option === 'use' || option === 'ativar') {
                if (!state.TryActivateRage(player, false))
                    Tell(`Não foi possível ativar. Fúria atual: ${state.Rage.toFixed(1)}%.`, 255, 180, 90);
            } else if (option === 'clear' || option === 'reset' || option === 'limpar') {
                state.Rage = 0;
                state.RageModeActive = false;
                state.RageReadyTimer = 0;
                state.RageReadyGraceUsed = false;
                state.RageReadyHeld = false;
                state.SaveRippers();
                Tell('Fúria zerada.', 180, 180, 180);
            } else {
                Tell(`Fúria: ${state.Rage.toFixed(1)}%, ativa=${state.RageModeActive}, pronta=${state.RageReadyHeld}, janela=${Math.ceil(state.RageReadyTimer / 60)}s, proximidade=${state.LastProximityRage.toFixed(2)}, multiplicador atual=${state.LastDamageMultiplier.toFixed(2)}x.`, 255, 130, 100);
            }
            return false;
        }
        if (action === 'adrenaline' || action === 'adrenalina' || action === 'adren') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            const worldState = ModSystem.getByName('CalamityWorldState');
            if (!state || !worldState) {
                Tell('Adrenaline state is missing.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'status';
            if (option === 'fill' || option === 'full' || option === 'encher') {
                if (!worldState.RevengeanceMode)
                    worldState.SetRevengeanceMode(true);
                state.Adrenaline = state.AdrenalineMax;
                state.AdrenalineModeActive = false;
                state.SaveRippers();
                Tell('Adrenalina preenchida. Toque no botão ADREN. abaixo das barras ou use /calamityport adrenaline activate.', 90, 255, 190);
            } else if (option === 'activate' || option === 'use' || option === 'ativar') {
                if (!state.TryActivateAdrenaline(player, false))
                    Tell(`Não foi possível ativar. Adrenalina atual: ${state.Adrenaline.toFixed(1)}%.`, 255, 180, 90);
            } else if (option === 'clear' || option === 'reset' || option === 'limpar') {
                state.Adrenaline = 0;
                state.AdrenalineModeActive = false;
                state.SaveRippers();
                Tell('Adrenalina zerada.', 180, 180, 180);
            } else {
                Tell(`Adrenalina: ${state.Adrenaline.toFixed(1)}%, ativa=${state.AdrenalineModeActive}, boss=${state.LastBossActive}, pausa=${state.AdrenalinePauseTimer}, última perda=${state.LastAdrenalineLoss.toFixed(1)}.`, 90, 255, 190);
            }
            return false;
        }
        if (action === 'roguecore' || action === 'roguekit' || action === 'ladino') {
            const required = [
                types.victideRogue, types.victideBreastplate, types.victideGreaves, types.wulfrumKnife, types.scourgeWeapon, types.infestedClawmerang, types.mycoroot, types.rotBall, types.toothBall
            ];
            if (required.some(type => !(type > 0))) {
                Tell('One or more Rogue Core items failed to register.', 255, 90, 90);
                return false;
            }
            const items = [
                types.victideRogue,
                types.victideBreastplate,
                types.victideGreaves,
                types.wulfrumKnife,
                types.scourgeWeapon,
                types.infestedClawmerang,
                types.mycoroot,
                types.rotBall,
                types.toothBall,
                types.rogueEmblem,
                types.filthyGlove,
                types.bloodstainedGlove
            ];
            const offsets = [
                -132, -108, -84, -60, -36, -12, 12, 36, 60, 84, 108, 132
            ];
            for (let i = 0; i < items.length; i++)
                if (items[i] > 0)
                    SpawnItem(player, items[i], 1, offsets[i]);
            Tell('Rogue Core kit spawned: Victide Rogue set, six weapons and three Rogue accessories.', 100, 255, 160);
            Tell('Stand still to charge stealth, then attack with a full bar to execute a Stealth Strike.', 120, 220, 255);
            return false;
        }
        if (action === 'roguestatus' || action === 'stealthstatus' || action === 'ladinostatus') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            if (!state) {
                Tell('CalamityPlayerState is missing.', 255, 90, 90);
                return false;
            }
            Tell(`Rogue: ${state.GetRogueSummary()}.`, 120, 230, 255);
            return false;
        }
        if (action === 'victidearmor' || action === 'victideset' || action === 'victide') {
            const pieces = [
                types.victideMagic, types.victideMelee, types.victideRanged, types.victideRogue, types.victideSummon, types.victideBreastplate, types.victideGreaves
            ];
            if (pieces.some(t => !(t > 0))) {
                Tell('One or more Victide armor pieces failed to register.', 255, 90, 90);
                return false;
            }
            const offsets = [-72, -48, -24, 0, 24, 48, 72];
            for (let i = 0; i < pieces.length; i++)
                SpawnItem(player, pieces[i], 1, offsets[i]);
            Tell('Victide armor spawned: five class helmets, breastplate and greaves. Rogue now uses its independent stealth core.', 100, 255, 170);
            return false;
        }
        if (action === 'victidematerials' || action === 'searemains' || action === 'victiderecipe') {
            if (!(types.seaRemains > 0)) {
                Tell('Sea Remains failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.seaRemains, 24, 0);
            Tell('24 Sea Remains spawned: enough for all five helmets, one breastplate and one pair of greaves. A single class set costs 12.', 100, 255, 170);
            return false;
        }
        if (action === 'victidestatus' || action === 'victidearmorstatus') {
            let snailCount = 0, shellCount = 0, spikeCount = 0;
            try {
                snailCount = types.victideSnail > 0 ? Number(player.ownedProjectileCounts[types.victideSnail] || 0) : 0;
            } catch (e) { }
            shellCount = CountActiveProjectiles(types.victideSeashell);
            spikeCount = CountActiveProjectiles(types.victideSpike);
            const setState = GetVictideSetState(player);
            Tell(`Victide: set=${setState ? setState.classKey : 'off'}, submerged=${IsVictideSubmerged(player)}, defense=${player.statDefense}, endurance=${Number(player.endurance || 0).toFixed(2)}, moveSpeed=${Number(player.moveSpeed || 1).toFixed(2)}, lifeRegen=${player.lifeRegen}.`, 120, 230, 255);
            Tell(`Projectiles: snail=${snailCount}, seashell=${shellCount}, spikes=${spikeCount}. Rogue stealth is active.`, 120, 255, 180);
            return false;
        }
        if (action === 'wulfrumarmor' || action === 'wulfrumset' || action === 'warmor') {
            if (!(types.wulfrumHat > 0 && types.wulfrumJacket > 0 && types.wulfrumOveralls > 0)) {
                Tell('One or more Wulfrum armor pieces failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.wulfrumHat, 1, -28);
            SpawnItem(player, types.wulfrumJacket, 1, 0);
            SpawnItem(player, types.wulfrumOveralls, 1, 28);
            Tell('Wulfrum armor spawned. Equip all three pieces and tap BASTIÃO.', 100, 255, 130);
            return false;
        }
        if (action === 'wulfrummaterials' || action === 'wulfrumarmormaterials') {
            SpawnItem(player, types.scrap, 23, -18);
            SpawnItem(player, types.core, 3, 18);
            Tell('Full Wulfrum armor materials spawned: 23 Wulfrum Metal Scrap and 3 Energy Cores. Craft at an Anvil.', 100, 255, 130);
            return false;
        }
        if (action === 'bastion' || action === 'wulfrumbastion') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            if (!state) {
                Tell('Wulfrum Bastion state is missing.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'activate';
            if (option === 'reset' || option === 'clear' || option === 'limpar') {
                state.EndWulfrumBastion(player, false);
                state.WulfrumBastionCooldownFrames = 0;
                Tell('Wulfrum Bastion and cooldown reset.', 180, 180, 180);
            } else if (!state.ActivateWulfrumBastion(player, true)) {
                Tell(`Bastion status: ${state.GetWulfrumBastionSummary()}.`, 255, 190, 90);
            }
            return false;
        }
        if (action === 'bastionstatus' || action === 'wulfrumarmorstatus') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            Tell(`Wulfrum Bastion: ${state ? state.GetWulfrumBastionSummary() : 'missing'}.`, state ? 100 : 255, state ? 255 : 90, state ? 130 : 90);
            Tell(`Player: defense=${player.statDefense}, endurance=${Number(player.endurance || 0).toFixed(2)}, minionDamage=${Number(player.minionDamage || 1).toFixed(2)}, maxMinions=${player.maxMinions}.`, 120, 220, 255);
            return false;
        }
        if (action === 'armor' || action === 'armour' || action === 'snowruffian' || action === 'snowarmor') {
            if (!(types.snowMask > 0 && types.snowChest > 0 && types.snowGreaves > 0)) {
                Tell('One or more Snow Ruffian armor pieces failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.snowMask, 1, -28);
            SpawnItem(player, types.snowChest, 1, 0);
            SpawnItem(player, types.snowGreaves, 1, 28);
            Tell('Snow Ruffian armor spawned. Equip all three pieces, jump from a height and hold jump while falling.', 100, 255, 130);
            return false;
        }
        if (action === 'armorrecipe' || action === 'armormaterials' || action === 'snowmaterials') {
            SpawnItem(player, Terraria.ID.ItemID.BorealWood, 45, -28);
            SpawnItem(player, Terraria.ID.ItemID.Silk, 15, 0);
            SpawnItem(player, Terraria.ID.ItemID.FlinxFur, 4, 28);
            Tell('Full Snow Ruffian recipe materials spawned: 45 Boreal Wood, 15 Silk and 4 Flinx Fur. Craft at an Anvil.', 100, 255, 130);
            return false;
        }
        if (action === 'armorstatus' || action === 'setstatus') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            const summary = state ? state.GetSummary() : 'missing';
            Tell(`Snow Ruffian state: ${summary}.`, state ? 100 : 255, state ? 255 : 90, state ? 130 : 90);
            Tell(`Current fields: defense=${player.statDefense}, rangedDamage=${Number(player.rangedDamage).toFixed(2)}, rangedCrit=${player.rangedCrit}, velocityY=${Number(Terraria.PlayerVelocity(player).Y).toFixed(2)}, jumpHeld=${player.controlJump === true}.`, 120, 220, 255);
            return false;
        }
        if (action === 'magic' || action === 'magictest') {
            if (!(types.frostBolt > 0 && types.frostBall > 0)) {
                Tell('Frost Bolt or its projectile failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.frostBolt, 1, -18);
            SpawnItem(player, Terraria.ID.ItemID.LesserManaPotion, 20, 18);
            Tell('Frost Bolt and 20 Lesser Mana Potions spawned. Test mana use, mobile aim, piercing, Frostburn, bounces and late gravity.', 100, 255, 130);
            return false;
        }
        if (action === 'frostbolt' || action === 'frost') {
            if (!(types.frostBolt > 0)) {
                Tell('Frost Bolt registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.frostBolt, 1);
            Tell('Frost Bolt spawned. It consumes 8 mana per cast.', 100, 255, 130);
            return false;
        }
        if (action === 'manatest' || action === 'mana') {
            SpawnItem(player, Terraria.ID.ItemID.LesserManaPotion, 20);
            Tell('20 Lesser Mana Potions spawned for the magic test.', 100, 255, 130);
            return false;
        }
        if (action === 'ranged' || action === 'rangedtest') {
            if (!(types.bow > 0)) {
                Tell('Acidwood Bow registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.bow, 1, -18);
            SpawnItem(player, Terraria.ID.ItemID.WoodenArrow, 200, 18);
            Tell('Acidwood Bow and 200 Wooden Arrows spawned. Test mobile aim, continuous fire and ammo consumption.', 100, 255, 130);
            return false;
        }
        if (action === 'bow' || action === 'acidwoodbow') {
            if (!(types.bow > 0)) {
                Tell('Acidwood Bow registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.bow, 1);
            Tell('Acidwood Bow spawned. It uses normal arrow ammunition.', 100, 255, 130);
            return false;
        }
        if (action === 'acidwood' || action === 'wood') {
            if (!(types.acidwood > 0)) {
                Tell('Acidwood registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.acidwood, 10);
            Tell('10 Acidwood spawned, enough for the original bow recipe at a Work Bench.', 100, 255, 130);
            return false;
        }
        if (action === 'arrows' || action === 'ammo') {
            SpawnItem(player, Terraria.ID.ItemID.WoodenArrow, 200);
            Tell('200 Wooden Arrows spawned.', 100, 255, 130);
            return false;
        }
        if (action === 'm1garand' || action === 'garand' || action === 'm1') {
            if (!(types.m1Garand > 0 && types.m1GarandHoldout > 0 && types.m1GarandShot > 0)) {
                Tell('M1 Garand or its controller projectiles failed to register.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'give';
            if (option === 'status') {
                Tell(`M1 Garand: ${M1GarandRuntime.Summary(player)}.`, 255, 220, 120);
            } else if (option === 'reload' || option === 'full' || option === 'carregar') {
                M1GarandRuntime.Reload(player);
                Tell('M1 Garand chamber loaded: 8/8.', 255, 220, 120);
            } else if (option === 'empty' || option === 'vazia' || option === 'zerar') {
                M1GarandRuntime.SetShots(player, 0);
                Tell('M1 Garand chamber emptied. The next use will perform the two-second reload.', 200, 200, 200);
            } else {
                SpawnItem(player, types.m1Garand, 1, -18);
                SpawnItem(player, Terraria.ID.ItemID.MusketBall, 200, 18);
                Tell('M1 Garand and 200 Musket Balls delivered. The chamber starts empty, so the first use reloads for two seconds.', 100, 255, 130);
                Tell('Hold attack to fire the eight-round clip. The last shot ejects the clip and plays the iconic ping.', 255, 220, 120);
            }
            return false;
        }
        if (action === 'medallion' || action === 'desertmedallion' || action === 'medalhao' || action === 'medalhão') {
            if (!(types.medallion > 0)) {
                Tell('Desert Medallion registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.medallion, 1);
            Tell('Medalhão do Deserto entregue. Use-o dentro do bioma de Deserto para invocar o boss.', 100, 255, 130);
            Tell('Receita ativa: 40 de qualquer bloco de areia, 4 Mandíbulas de Formiga-Leão e 2 Mandíbulas de Leão-da-Tempestade no Altar Demoníaco.', 255, 210, 90);
            return false;
        }
        if (action === 'nuisance' || action === 'nuisances' || action === 'incomodo' || action === 'incômodo') {
            if (!(types.nuisanceHead > 0 && types.nuisanceYoungHead > 0)) {
                Tell('Desert Nuisance registration failed.', 255, 90, 90);
                return false;
            }
            const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
            const adult = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player) - 360), Math.floor(Terraria.PlayerCenterY(player) + 220), types.nuisanceHead, 0, 0, 0, -1, 0, Terraria.PlayerIndex(player));
            const young = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player) + 360), Math.floor(Terraria.PlayerCenterY(player) + 220), types.nuisanceYoungHead, 0, 0, 0, -1, 0, Terraria.PlayerIndex(player));
            Tell(`Desert Nuisances de teste criados: adult=${adult}, young=${young}. O jovem carrega uma rajada de areia após 180 ticks alinhado e distante.`, 100, 255, 130);
            return false;
        }
        if (action === 'sahara' || action === 'saharaslicers' || action === 'aquatic' || action === 'aquaticdischarge' || action === 'fatiadores') {
            if (!(types.saharaSlicers > 0 && types.saharaBlade > 0 && types.saharaBladeAlt > 0 && types.saharaBolt > 0)) {
                Tell('Sahara Slicers or one of its projectiles failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.saharaSlicers, 1);
            Tell('Fatiadores do Saara entregues. Acerte inimigos com as duas adagas para armazenar dois dardos por acerto, até 10.', 100, 255, 130);
            Tell('As adagas agora miram em qualquer direção. Toque em DARDOS para lançar na direção do último acerto confirmado. Nome antigo: Aquatic Discharge.', 120, 220, 255);
            return false;
        }
        if (action === 'slicerbolt' || action === 'saharabolt' || action === 'dardo' || action === 'dardos') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            if (!state || !state.FireSaharaSlicersBolt) {
                Tell('Sahara Slicers player state is missing.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'fire';
            if (option === 'fill' || option === 'encher' || option === 'full') {
                state.SaharaSlicersBolts = 10;
                Tell('Dardos dos Fatiadores do Saara preenchidos: 10/10.', 255, 220, 120);
            } else if (option === 'status') {
                Tell(`Sahara Slicers: ${state.GetSaharaSlicersSummary(player)}.`, 120, 220, 255);
                const ui = GlobalHooks.getByName('SaharaSlicersUIHooks');
                if (ui)
                    Tell(`Bolt button: source=${ui.LastInputSource}, touch=${ui.LastTouchX},${ui.LastTouchY}, raw=${ui.RawTouchAvailable}/${ui.LastRawTouchCount}, world=${ui.WorldTouchAvailable}.`, 120, 220, 255);
            } else {
                state.FireSaharaSlicersBolt(player, true);
            }
            return false;
        }
        if (action === 'barinade' || action === 'barinadetest' || action === 'grenadebow') {
            if (!(types.barinade > 0 && types.barinadeArrow > 0)) {
                Tell('Barinade or Barinade Arrow registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.barinade, 1, -16);
            SpawnItem(player, Terraria.ID.ItemID.WoodenArrow, 250, 16);
            Tell('Barinade and 250 Wooden Arrows delivered. It should consume one arrow and fire two sand arrows.', 100, 255, 130);
            return false;
        }
        if (action === 'sandstream' || action === 'sandstreamscepter' || action === 'scepter' || action === 'cetro') {
            if (!(types.sandstreamScepter > 0 && types.sandstream > 0 && types.sandstreamExplosion > 0)) {
                Tell('Sandstream Scepter or one of its projectiles failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.sandstreamScepter, 1);
            Tell('Cetro da Torrente de Areia entregue. A corrente deve cair após o primeiro acerto e explodir apenas ao desaparecer.', 100, 255, 130);
            return false;
        }
        if (action === 'starmode' || action === 'stardefense' || action === 'starbutton' || action === 'mododefesa') {
            const state = ModPlayer.getByName('CalamityPlayerState');
            if (!state) {
                Tell('CalamityPlayerState is missing.', 255, 90, 90);
                return false;
            }
            const option = parts[2] || 'status';
            if (option === 'defense' || option === 'defesa' || option === 'on') {
                state.SetBrittleStarDefenseMode(player, true, true);
            } else if (option === 'attack' || option === 'ataque' || option === 'off') {
                state.SetBrittleStarDefenseMode(player, false, true);
            } else if (option === 'toggle' || option === 'alternar') {
                state.ToggleBrittleStarDefenseMode(player, true);
            } else {
                Tell(`Brittle Star: ${state.GetBrittleStarSummary(player)}.`, 120, 220, 255);
                const ui = GlobalHooks.getByName('BrittleStarModeUIHooks');
                if (ui)
                    Tell(`Star button: source=${ui.LastInputSource}, touch=${ui.LastTouchX},${ui.LastTouchY}, raw=${ui.RawTouchAvailable}/${ui.LastRawTouchCount}, world=${ui.WorldTouchAvailable}.`, 120, 220, 255);
            }
            return false;
        }
        if (action === 'brittlestar' || action === 'brittle' || action === 'seabound' || action === 'summonweapon') {
            if (!(types.brittleStarStaff > 0 && types.brittleStarMinion > 0 && types.brittleStarBuff > 0)) {
                Tell('Brittle Star Staff, minion or buff failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.brittleStarStaff, 1);
            Tell('Cajado da Estrela Frágil entregue. Invoque várias estrelas e use o botão ESTRELAS para alternar entre ATAQUE e DEFESA.', 100, 255, 130);
            Tell('No modo defensivo, cada estrela concede +3 de defesa, orbita o jogador e causa dano dobrado sem se quebrar.', 120, 220, 255);
            Tell('A Bateria Wulfrum equipada deve aumentar o dano das estrelas em 7%.', 120, 220, 255);
            return false;
        }
        if (action === 'scourgeweapon' || action === 'desertjavelin' || action === 'rogueweapon' || action === 'lancaareia' || action === 'lançaareia') {
            if (!(types.scourgeWeapon > 0 && types.scourgeWeaponProj > 0)) {
                Tell('Scourge of the Desert weapon or projectile failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.scourgeWeapon, 1);
            Tell('Flagelo do Deserto entregue. Lance em direção ao chão perto de um inimigo e observe a arma escavar e emergir contra o alvo.', 100, 255, 130);
            Tell('A classe Rogue usa dano próprio. Equipe o conjunto Victide Rogue para carregar stealth e executar Stealth Strikes.', 255, 210, 90);
            return false;
        }
        if (action === 'trophy' || action === 'trofeu' || action === 'troféu' || action === 'scourgetrophy') {
            if (!(types.scourgeTrophy > 0)) {
                Tell('Desert Scourge Trophy failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.scourgeTrophy, 1);
            Tell('Troféu do Flagelo do Deserto entregue.', 100, 255, 130);
            return false;
        }
        if (action === 'relic' || action === 'reliquia' || action === 'relíquia' || action === 'scourgerelic') {
            if (!(types.scourgeRelic > 0)) {
                Tell('Desert Scourge Relic failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.scourgeRelic, 1);
            Tell('Relíquia do Flagelo do Deserto entregue.', 100, 255, 130);
            return false;
        }
        if (action === 'relicstatus' || action === 'reliquiastatus' || action === 'relicdebug') {
            const relicSystem = ModSystem.getByName('DesertScourgeRelicSystem');
            const drawHooks = GlobalHooks.getByName('DesertScourgeTrophyDrawHooks');
            const crabulonRelicSystem = ModSystem.getByName('CrabulonRelicSystem');
            const tracked = Array.isArray(relicSystem?.Positions) ? relicSystem.Positions.length : 0;
            const trackedCrabulon = Array.isArray(crabulonRelicSystem?.Positions) ? crabulonRelicSystem.Positions.length : 0;
            const rendererReady = drawHooks?.TileRendererHookInstalled === true;
            const worldDrawReady = drawHooks?.WorldDrawHookInstalled === true;
            const error = String(drawHooks?.LastHideError || 'none');
            Tell(`Relíquias: Flagelo=${tracked}, Crabulon=${trackedCrabulon}, renderer=${rendererReady}, desenho=${worldDrawReady}, erro=${error}.`, rendererReady && worldDrawReady && error === 'none' ? 100 : 255, rendererReady && worldDrawReady && error === 'none' ? 255 : 170, rendererReady && worldDrawReady && error === 'none' ? 130 : 90);
            return false;
        }
        if (action === 'bossloot' || action === 'scourgeloot' || action === 'dsloot') {
            const loot = [
                [types.stormlionMandible, 2], [types.scourgeBag, 5], [types.saharaSlicers, 1], [types.barinade, 1], [types.sandstreamScepter, 1], [types.brittleStarStaff, 1], [types.scourgeWeapon, 1], [types.scourgeMask, 1],
                [types.scourgeTrophy, 1], [types.scourgeRelic, 1], [types.scourgeLore, 1]
            ];
            let offset = -75;
            for (const [type, stack] of loot) {
                if (type > 0)
                    SpawnItem(player, type, stack, offset);
                offset += 30;
            }
            Tell('Loot de teste entregue com cinco bolsas. Cada arma rola separadamente em 1/3; se todas falharem, uma arma é garantida. A bolsa pode entregar mais de uma arma.', 100, 255, 130);
            return false;
        }
        if (action === 'sandblasttest' || action === 'sandblastproj' || action === 'greatsandblast') {
            if (!(types.sandBlast > 0 && types.greatSandBlast > 0)) {
                Tell('Sand Blast projectile registration failed.', 255, 90, 90);
                return false;
            }
            const x = Number(Terraria.PlayerCenterX(player)) + 170;
            const y = Number(Terraria.PlayerCenterY(player)) - 120;
            const small = NewProjectile(null, x, y - 20, 7.5, -0.5, types.sandBlast, 10, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
            const great = NewProjectile(null, x, y + 20, 6.4, 0.35, types.greatSandBlast, 16, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
            Tell(`Sand Blast test: pequeno=${small}, grande=${great}. Ambos seguem para a direita.`, small >= 0 && great >= 0 ? 100 : 255, small >= 0 && great >= 0 ? 255 : 150, small >= 0 && great >= 0 ? 130 : 90);
            return false;
        }
        if (action === 'divesplash' || action === 'scourgedive' || action === 'mergulho') {
            if (!(types.scourgeDiveSplash > 0)) {
                Tell('Desert Scourge Dive Splash registration failed.', 255, 90, 90);
                return false;
            }
            const x = Number(Terraria.PlayerCenterX(player));
            const y = Number(Terraria.PlayerPositionY(player)) + Number(Terraria.PlayerHeight(player)) - 42;
            const index = NewProjectile(null, x, y, 0, 0, types.scourgeDiveSplash, 0, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
            if (index >= 0) {
                FusionCamera.ShakeAt({ x, y: y + 42 }, 10, 2.0, 900);
                Tell(`Dive Splash criado no projétil ${index}. Ele é visual e não causa dano, como no código atual.`, 100, 255, 130);
            } else
                Tell('Dive Splash não pôde ser criado.', 255, 90, 90);
            return false;
        }
        if (action === 'perforator' || action === 'perforators' || action === 'perfurador' || action === 'perfuradores') {
            if (!(types.perforatorHive > 0)) {
                Tell('Perforator Hive registration failed.', 255, 90, 90);
                return false;
            }
            let existing = -1;
            for (let i = 0; i < 200; i++) {
                const n = Terraria.Main.npc[i];
                if (n && n.active && Number(n.type) === Number(types.perforatorHive)) {
                    existing = i;
                    break;
                }
            }
            if (existing >= 0) {
                Tell(`A Colmeia Perfuradora já está ativa no slot ${existing}.`, 255, 180, 90);
                return false;
            }
            const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
            const index = Terraria.NPC.NewNPC(source, Math.floor(Terraria.PlayerCenterX(player)), Math.floor(Terraria.PlayerCenterY(player) - 280), types.perforatorHive, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
            Tell(`Colmeia Perfuradora criada no slot ${index}. Fique no Crimson para impedir o despawn.`, 220, 80, 80);
            return false;
        }
        if (action === 'perforatorstatus' || action === 'perfstatus' || action === 'perfuradorstatus') {
            const wanted = [types.perforatorHive, types.perforatorSmall, types.perforatorMedium, types.perforatorLarge];
            const counts = [0, 0, 0, 0];
            for (let i = 0; i < 200; i++) {
                const n = Terraria.Main.npc[i];
                if (!n || !n.active)
                    continue;
                const type = Number(n.type);
                for (let j = 0; j < wanted.length; j++)
                    if (type === Number(wanted[j]))
                        counts[j]++;
            }
            const shots = CountActiveProjectiles(types.perforatorIchorShot);
            const geysers = CountActiveProjectiles(types.perforatorBloodGeyser);
            const blobs = CountActiveProjectiles(types.perforatorIchorBlob);
            Tell(`Perfuradores: hive=${counts[0]}, small=${counts[1]}, medium=${counts[2]}, large=${counts[3]}, ichor=${shots}, geyser=${geysers}, blobs=${blobs}.`, 220, 90, 90);
            return false;
        }
        if (action === 'scourge' || action === 'desertscourge' || action === 'desertboss' || action === 'boss') {
            if (!(types.scourgeHead > 0 && types.scourgeBody > 0 && types.scourgeTail > 0 && types.scourgeSpit > 0 && types.scourgeDiveSplash > 0 && types.sandBlast > 0 && types.greatSandBlast > 0)) {
                Tell('Desert Scourge registration failed.', 255, 90, 90);
                return false;
            }
            for (let i = 0; i < 200; i++) {
                const existing = Terraria.Main.npc[i];
                if (existing && existing.active && existing.type === types.scourgeHead) {
                    Tell(`A Desert Scourge já está ativa no slot ${i}.`, 255, 210, 90);
                    return false;
                }
            }
            const side = parts[2] === 'left' || parts[2] === 'esquerda' ? -1 : 1;
            const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) + 520 * side), Math.floor(Terraria.PlayerCenterY(player) + 320), types.scourgeHead, 0, 0, 0, 0, 0, Terraria.Main.myPlayer);
            if (index >= 0) {
                Tell(`Desert Scourge spawned no slot ${index}. Ela deve criar 15 segmentos de corpo e uma cauda.`, 100, 255, 130);
                Tell('Teste o ciclo organizado: rajada comum, mergulho e Sand Blast passam a ocupar ciclos exclusivos conforme vida e dificuldade.', 120, 220, 255);
            } else {
                Tell('A Desert Scourge não pôde ser criada.', 255, 90, 90);
            }
            return false;
        }
        if (action === 'bossmusic' || action === 'dsmusic' || action === 'music') {
            const slot = Number(Terraria.ID.MusicID.OtherworldlyBoss2 || 80);
            const selected = Number(Terraria.Main.newMusic);
            Tell(`Desert Scourge usa o slot nativo ${slot} (OtherworldlyBoss2); slot selecionado agora: ${selected}.`, selected === slot ? 100 : 120, selected === slot ? 255 : 220, selected === slot ? 130 : 255);
            Tell('Fade, volume, pausa, loop e retorno à música do bioma são controlados pelo Terraria.', 120, 220, 255);
            return false;
        }
        if (action === 'nuisancestatus' || action === 'nuisancestate' || action === 'incomodostatus') {
            let found = 0;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active || (npc.type !== types.nuisanceHead && npc.type !== types.nuisanceYoungHead))
                    continue;
                const state = CalamityNPCState.Get(npc);
                const kind = npc.type === types.nuisanceYoungHead ? 'young' : 'adult';
                Tell(`Nuisance ${kind} slot=${i}: life=${npc.life}/${npc.lifeMax}, entry=${state.entryTimer || 0}/48, movement=${state.sourceMovement || 'entry'}, inTerrain=${state.sourceShouldFly === true}, accel=${Number(state.sourceAcceleration || 0).toFixed(3)}, turn=${Number(state.sourceTurnSpeed || 0).toFixed(3)}, max=${Number(state.sourceMaxSpeed || 0).toFixed(1)}, dist=${state.playerDistance || 0}, direct=${state.directChase === true}, partnerEnrage=${state.enragedByPartner === true}, biomeEnrage=${state.biomeEnraged === true}, spit=${state.spitCharge || 0}/180, fired=${state.spitFiredCount || 0}.`, 255, 215, 130);
                found++;
            }
            if (found === 0)
                Tell('Nenhuma cabeça de Desert Nuisance ativa.', 255, 180, 100);
            return false;
        }
        if (action === 'scourgestatus' || action === 'bossstatus' || action === 'dsstatus') {
            let heads = 0;
            let bodies = 0;
            let tails = 0;
            let adultNuisances = 0;
            let youngNuisances = 0;
            let headInfo = 'none';
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active)
                    continue;
                if (npc.type === types.scourgeHead) {
                    heads++;
                    const state = CalamityNPCState.Get(npc);
                    headInfo = `slot=${i}, life=${npc.life}/${npc.lifeMax}, dmg=${npc.damage}/${npc.defDamage}, def=${npc.defense}, alpha=${npc.alpha}, sourceSegments=${state.sourceSegmentCount || 0}, cycle=${state.sourceCycleName || 'normal-chase'}, timer=${state.sourceAI0 || 0}/1200, state=${state.sourceAI1 || 0}, terrain=${state.insideTerrain === true}, fly=${state.sourceShouldFly === true}, accel=${Number(state.sourceAcceleration || 0).toFixed(3)}, turn=${Number(state.sourceTurnSpeed || 0).toFixed(3)}, max=${Number(state.sourceMaxSpeed || 0).toFixed(1)}, spitFans=${state.sourceSpitCount || 0}, enrage=${state.biomeEnraged === true}, revenge=${state.revenge === true}, death=${state.death === true}`;
                } else if (npc.type === types.scourgeBody)
                    bodies++;
                else if (npc.type === types.scourgeTail)
                    tails++;
                else if (npc.type === types.nuisanceHead)
                    adultNuisances++;
                else if (npc.type === types.nuisanceYoungHead)
                    youngNuisances++;
            }
            let smallSandBlasts = 0;
            let greatSandBlasts = 0;
            for (let i = 0; i < 1000; i++) {
                const proj = Terraria.Main.projectile[i];
                if (!proj || !proj.active)
                    continue;
                if (proj.type === types.sandBlast)
                    smallSandBlasts++;
                else if (proj.type === types.greatSandBlast)
                    greatSandBlasts++;
            }
            const worldState = ModSystem.getByName('CalamityWorldState');
            Tell(`Desert Scourge: heads=${heads}, bodies=${bodies}, tails=${tails}, nuisances=${adultNuisances}+${youngNuisances}, sand=${smallSandBlasts}+${greatSandBlasts}, downed=${worldState ? worldState.DownedDesertScourge : false}.`, heads > 0 ? 100 : 255, heads > 0 ? 255 : 210, heads > 0 ? 130 : 90);
            if (heads > 0)
                Tell(headInfo, 120, 220, 255);
            return false;
        }
        if (action === 'sourcesync' || action === 'scourgesource' || action === 'dsrules') {
            const worldState = ModSystem.getByName('CalamityWorldState');
            let goodWorld = false;
            let zenithWorld = false;
            try {
                goodWorld = Terraria.Main.getGoodWorld === true;
            } catch (e) { }
            try {
                zenithWorld = Terraria.Main.zenithWorld === true;
            } catch (e) { }
            const revenge = !!(worldState && worldState.RevengeanceMode === true);
            const expert = Terraria.Main.expertMode === true || Terraria.Main.masterMode === true;
            const expectedSegments = (revenge ? 21 : (expert ? 18 : 15)) * (goodWorld ? 3 : 1);
            const expectedHeadLife = (revenge ? 5000 : 4000) * (goodWorld ? 2 : 1);
            const expectedNuisanceLife = `${(revenge ? 1800 : 1500) * (goodWorld ? 2 : 1)}/${(revenge ? 1560 : 1300) * (goodWorld ? 2 : 1)}`;
            Tell(`Fonte atual: revenge=${revenge}, expert=${expert}, master=${Terraria.Main.masterMode === true}, goodWorld=${goodWorld}, zenith=${zenithWorld}.`, 120, 220, 255);
            Tell(`Antes do scaling multiplayer: cabeça=${expectedHeadLife} HP, segmentos=${expectedSegments}, Nuisances adulto/jovem=${expectedNuisanceLife} HP.`, 255, 220, 130);
            Tell('Contato circular, fade 42/3, scaling 0.8/0.7 e boss icon da intermissão estão ativos.', 100, 255, 140);
            return false;
        }
        if (action === 'clearscourge' || action === 'stopscourge' || action === 'clearboss') {
            let removed = 0;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active)
                    continue;
                if ([
                    types.scourgeHead, types.scourgeBody, types.scourgeTail, types.nuisanceHead, types.nuisanceBody, types.nuisanceTail, types.nuisanceYoungHead, types.nuisanceYoungBody, types.nuisanceYoungTail
                ].includes(npc.type)) {
                    npc.active = false;
                    CalamityNPCState.Remove(npc);
                    removed++;
                }
            }
            for (let i = 0; i < 1000; i++) {
                const proj = Terraria.Main.projectile[i];
                if (proj && proj.active && (proj.type === types.scourgeSpit || proj.type === types.scourgeDiveSplash || proj.type === types.sandBlast || proj.type === types.greatSandBlast))
                    proj.active = false;
            }
            Tell(`Desert Scourge test cleared: ${removed} NPC(s) removed.`, 180, 180, 180);
            return false;
        }
        if (action === 'sprout' || action === 'decapodita' || action === 'broto') {
            if (!(types.decapoditaSprout > 0)) {
                Tell('Decapodita Sprout registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.decapoditaSprout, 1);
            Tell('Broto Decapodita entregue. Use-o no bioma subterrâneo de cogumelos para invocar o Crabulon.', 100, 255, 130);
            Tell('Receita: 50 Cogumelos Brilhantes em um Altar Demoníaco ou Carmesim.', 120, 220, 255);
            return false;
        }
        if (action === 'crabulon' || action === 'crab' || action === 'mushroomboss') {
            if (!(types.crabulon > 0 && types.crabShroom > 0 && types.mushBomb > 0 && types.mushBombGround > 0 && types.mushBombFall > 0)) {
                Tell('Crabulon encounter registration failed.', 255, 90, 90);
                return false;
            }
            for (let i = 0; i < 200; i++) {
                const existing = Terraria.Main.npc[i];
                if (existing && existing.active && existing.type === types.crabulon) {
                    Tell(`Crabulon já está ativo no slot ${i}.`, 255, 210, 90);
                    return false;
                }
            }
            const side = parts[2] === 'left' || parts[2] === 'esquerda' ? -1 : 1;
            const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Number(Terraria.PlayerCenterX(player)) + 160 * side), Math.floor(Number(Terraria.PlayerCenterY(player)) - 320), types.crabulon, 0, 0, 0, 0, 0, Terraria.PlayerIndex(player));
            if (index >= 0 && index < 200) {
                const boss = Terraria.Main.npc[index];
                boss.target = Terraria.PlayerIndex(player);
                boss.netUpdate = true;
                Tell(`Crabulon criado no slot ${index}. Teste caminhada, salto, impacto, bombas de cogumelo e minions.`, 100, 255, 130);
            } else
                Tell('Crabulon não pôde ser criado.', 255, 90, 90);
            return false;
        }
        if (action === 'mushbombfall' || action === 'fallbombs' || action === 'cogumeloscaindo') {
            if (!(types.mushBombFall > 0)) {
                Tell('MushBombFall registration failed.', 255, 90, 90);
                return false;
            }
            const amount = 7;
            for (let i = 0; i < amount; i++) {
                const t = i / (amount - 1);
                const angle = -Math.PI * 0.42 + Math.PI * 0.84 * t;
                NewProjectile(null, Number(Terraria.PlayerCenterX(player)), Number(Terraria.PlayerCenterY(player)) - 32, Math.sin(angle) * 9, -9, types.mushBombFall, 9, 0, Terraria.Main.myPlayer, 0, Number(Terraria.PlayerCenterY(player)), 0, null);
            }
            Tell('Leque de MushBombFall criado. Eles ficam perigosos ao começar a cair.', 100, 255, 130);
            return false;
        }
        if (action === 'mushbombground' || action === 'groundmushrooms' || action === 'cogumelosnochao') {
            if (!(types.mushBombGround > 0)) {
                Tell('MushBombGround registration failed.', 255, 90, 90);
                return false;
            }
            const source = null;
            const originX = Number(Terraria.PlayerCenterX(player));
            const originY = Number(Terraria.PlayerPositionY(player)) + Number(Terraria.PlayerHeight(player)) - 8;
            for (let i = 0; i < 3; i++) {
                const speed = 1 - i / 3;
                NewProjectile(source, originX + 16 + i * 12, originY - i * 4, speed, 0, types.mushBombGround, 9, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
                NewProjectile(source, originX - 16 - i * 12, originY - i * 4, -speed, 0, types.mushBombGround, 9, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
            }
            Tell('Seis MushBombGround criados no padrão do salto especial.', 100, 255, 130);
            return false;
        }
        if (action === 'crabulonspecial' || action === 'specialleap' || action === 'saltocrabulon') {
            let forced = false;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active || npc.type !== types.crabulon)
                    continue;
                const state = CalamityNPCState.Get(npc);
                state.phase = 4;
                state.phaseTimer = 0;
                state.specialLeapLaunched = false;
                state.specialLeapGroundY = 0;
                state.specialLeapTelegraphed = false;
                state.specialLeapShots = 0;
                state.wasAirborne = false;
                state.wasDescending = false;
                npc.damage = 0;
                npc.noGravity = false;
                npc.noTileCollide = false;
                npc.netUpdate = true;
                forced = true;
                break;
            }
            Tell(forced ? 'Salto especial do Crabulon preparado.' : 'Nenhum Crabulon ativo. Use /calamityport crabulon primeiro.', forced ? 100 : 255, forced ? 255 : 150, forced ? 130 : 90);
            return false;
        }
        if (action === 'crabulonphase4' || action === 'crabphase4' || action === 'crabuloncritical') {
            const world = ModSystem.getByName('CalamityWorldState');
            if (world && world.SetDeathMode)
                world.SetDeathMode(true);
            let forced = false;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active || npc.type !== types.crabulon)
                    continue;
                npc.life = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.14));
                const state = CalamityNPCState.Get(npc);
                state.phase = 0;
                state.phaseTimer = 0;
                state.shotTimer = 0;
                state.sourceAI3 = 0;
                state.stompSeries = 0;
                state.tripleStompCount = 0;
                state.phase4Entered = false;
                npc.netUpdate = true;
                forced = true;
                break;
            }
            Tell(forced ? 'Crabulon colocado em 14% de vida com Death Mode ativo.' : 'Nenhum Crabulon ativo. Use /calamityport crabulon primeiro.', forced ? 255 : 255, forced ? 110 : 150, forced ? 110 : 90);
            return false;
        }
        if (action === 'crabulonstatus' || action === 'crabstatus') {
            let bosses = 0;
            let shrooms = 0;
            let bombs = 0;
            let groundBombs = 0;
            let fallBombs = 0;
            let info = 'none';
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active)
                    continue;
                if (npc.type === types.crabulon) {
                    bosses++;
                    const state = CalamityNPCState.Get(npc);
                    info = `slot=${i}, life=${npc.life}/${npc.lifeMax}, phase=${state.phase}, timer=${state.phaseTimer || 0}, series=${state.stompSeries || 0}/${state.phase2 === true ? 4 : 3}, variant=${state.jumpVariant || 0}, sourceAI3=${state.sourceAI3 || 0}, special=${state.phase === 4}/${state.specialLeapLaunched === true}, triple=${state.phase === 5 || state.phase === 6}/${state.tripleStompCount || 0}, tripleCycles=${state.tripleStompCycles || 0}, specialShots=${state.specialLeapShots || 0}, stomps=${state.stompCount || 0}, shroomWaves=${state.crabShroomWaves || 0}, revenge=${state.revenge === true}, death=${state.death === true}, phase4=${state.phase4 === true}`;
                } else if (npc.type === types.crabShroom)
                    shrooms++;
            }
            for (let i = 0; i < 1000; i++) {
                const proj = Terraria.Main.projectile[i];
                if (!proj || !proj.active)
                    continue;
                if (proj.type === types.mushBomb)
                    bombs++;
                else if (proj.type === types.mushBombGround)
                    groundBombs++;
                else if (proj.type === types.mushBombFall)
                    fallBombs++;
            }
            const world = ModSystem.getByName('CalamityWorldState');
            Tell(`Crabulon: bosses=${bosses}, shrooms=${shrooms}, bombs=${bombs}+${groundBombs}+fall:${fallBombs}, downed=${world ? world.DownedCrabulon : false}.`, bosses > 0 ? 100 : 255, bosses > 0 ? 255 : 210, bosses > 0 ? 130 : 90);
            if (bosses > 0)
                Tell(info, 120, 220, 255);
            return false;
        }
        if (action === 'crabulonmusic' || action === 'crabmusic') {
            const slot = Number(Terraria.ID.MusicID.OtherworldlyBoss1 || 81);
            const selected = Number(Terraria.Main.newMusic);
            Tell(`Crabulon usa o slot nativo ${slot} (OtherworldlyBoss1); slot selecionado agora: ${selected}.`, selected === slot ? 100 : 120, selected === slot ? 255 : 220, selected === slot ? 130 : 255);
            Tell('Fade, volume, pausa, loop e troca de faixa agora são controlados pelo próprio Terraria.', 120, 220, 255);
            return false;
        }
        if (action === 'mycelial' || action === 'mycelialclaws' || action === 'claws' || action === 'garras') {
            if (!(types.mycelialClaws > 0 && types.mushyBuff > 0)) {
                Tell('Mycelial Claws or Mushy buff failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.mycelialClaws, 1);
            Tell('Garras Miceliais entregues. Acerte um inimigo para receber Mushy por 6 segundos.', 100, 255, 130);
            Tell('Mushy concede +3 de defesa e +1 HP/s de regeneração.', 120, 220, 255);
            return false;
        }
        if (action === 'fungicide' || action === 'fungicida' || action === 'fungalgun') {
            if (!(types.fungicide > 0 && types.fungiOrb > 0 && types.fungiOrb2 > 0)) {
                Tell('Fungicide or its fungal projectiles failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.fungicide, 1, -18);
            SpawnItem(player, Terraria.ID.ItemID.MusketBall, 250, 18);
            Tell('Fungicida e 250 Balas de Mosquete entregues.', 100, 255, 130);
            Tell('As balas normais viram projéteis fúngicos e se dividem em três esporos no impacto.', 120, 220, 255);
            return false;
        }
        if (action === 'hyphae' || action === 'hyphaerod' || action === 'hifas' || action === 'cajadohifas') {
            if (!(types.hyphaeRod > 0)) {
                Tell('Hyphae Rod failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.hyphaeRod, 1);
            Tell('Cajado de Hifas entregue.', 100, 255, 130);
            Tell('Ele cria três esporos de cogumelo em alturas diferentes, descendo em direção à mira.', 120, 220, 255);
            return false;
        }
        if (action === 'clawmerang' || action === 'infestedclawmerang' || action === 'claw' || action === 'bumerangue') {
            if (!(types.infestedClawmerang > 0 && types.infestedClawmerangProj > 0)) {
                Tell('Infested Clawmerang or its projectile failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.infestedClawmerang, 1);
            Tell('Clawmerang Infestado entregue.', 100, 255, 130);
            Tell('Arremesse-o em qualquer direção: ele viaja a longa distância e retorna ao jogador.', 120, 220, 255);
            Tell('Stealth Strike ativo: carregue a barra com o conjunto Victide Rogue.', 255, 220, 120);
            return false;
        }
        if (action === 'mycoroot' || action === 'micoraiz' || action === 'root') {
            if (!(types.mycoroot > 0 && types.mycorootProj > 0)) {
                Tell('Mycoroot or its projectile failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.mycoroot, 1);
            Tell('Mycoroot entregue.', 100, 255, 130);
            Tell('Segure o ataque para disparar um fluxo rápido de raízes fúngicas de curto alcance.', 120, 220, 255);
            Tell('Stealth Strike ativo: Mycoroot libera uma rajada de raízes menores.', 255, 220, 120);
            return false;
        }
        if (action === 'puffshroom' || action === 'puff' || action === 'cogumelopuff' || action === 'guerreiropuff') {
            if (!(types.puffShroom > 0 && types.puffWarrior > 0 && types.puffCloud > 0 && types.puffWarriorBuff > 0)) {
                Tell('Puff Shroom, Puff Warrior, Puff Cloud or its buff failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.puffShroom, 1);
            Tell('Cogumelo Puff entregue.', 100, 255, 130);
            Tell('Use-o no chão: o Guerreiro Puff salta atrás dos inimigos e dispara três nuvens por ataque.', 120, 220, 255);
            return false;
        }
        if (action === 'fungalclump' || action === 'clump' || action === 'aglomeradofungico') {
            if (!(types.fungalClump > 0 && types.fungalClumpMinion > 0 && types.fungalHeal > 0 && types.fungalClumpBuff > 0)) {
                Tell('Fungal Clump, its minion, healing projectile or buff failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.fungalClump, 1);
            Tell('Aglomerado Fúngico entregue.', 100, 255, 130);
            Tell('Equipe-o em um espaço de acessório: o companheiro persegue inimigos e devolve 1 PV por ataque.', 120, 220, 255);
            Tell('No espaço de vaidade ele continua visível, mas não causa dano nem cura.', 255, 220, 120);
            return false;
        }
        if (action === 'crabulonloot' || action === 'crabloot' || action === 'cogumeloloot') {
            const loot = [
                [types.crabulonBag, 5], [types.crabulonMask, 1], [types.crabulonTrophy, 1],
                [types.crabulonRelic, 1], [types.crabulonLore, 1], [types.mycelialClaws, 1],
                [types.fungicide, 1], [types.hyphaeRod, 1], [types.infestedClawmerang, 1], [types.mycoroot, 1], [types.puffShroom, 1], [types.fungalClump, 1],
                [Terraria.ID.ItemID.GlowingMushroom, 35], [Terraria.ID.ItemID.MushroomGrassSeeds, 10]
            ];
            let offset = -75;
            for (const [type, stack] of loot) {
                if (Number(type) > 0)
                    SpawnItem(player, Number(type), stack, offset);
                offset += 28;
            }
            Tell('Loot do Crabulon entregue com cinco bolsas, as seis armas funcionais, Aglomerado Fúngico, máscara, troféu, relíquia, lore e materiais.', 100, 255, 130);
            Tell('As armas mantêm as rolagens independentes com garantia. O Aglomerado Fúngico é garantido somente nas bolsas Expert/Master; Mushroom Plasma Root continua reservado.', 255, 220, 120);
            return false;
        }
        if (action === 'crabulontrophy' || action === 'crab trophy' || action === 'trofeucrabulon') {
            if (!(types.crabulonTrophy > 0)) {
                Tell('Crabulon Trophy failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.crabulonTrophy, 1);
            Tell('Troféu do Crabulon entregue.', 100, 255, 130);
            return false;
        }
        if (action === 'crabulonrelic' || action === 'crab relic' || action === 'reliquiacrabulon') {
            if (!(types.crabulonRelic > 0)) {
                Tell('Crabulon Relic failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.crabulonRelic, 1);
            Tell('Relíquia do Crabulon entregue.', 100, 255, 130);
            return false;
        }
        if (action === 'clearcrabulon' || action === 'stopcrabulon' || action === 'clearcrab') {
            let removed = 0;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (npc && npc.active && (npc.type === types.crabulon || npc.type === types.crabShroom)) {
                    npc.active = false;
                    CalamityNPCState.Remove(npc);
                    removed++;
                }
            }
            for (let i = 0; i < 1000; i++) {
                const proj = Terraria.Main.projectile[i];
                if (proj && proj.active && (proj.type === types.mushBomb || proj.type === types.mushBombGround))
                    proj.active = false;
            }
            Tell(`Teste do Crabulon limpo: ${removed} NPC(s) removido(s).`, 180, 180, 180);
            return false;
        }
        if (action === 'states' || action === 'state') {
            const playerState = ModPlayer.getByName('CalamityPlayerState');
            const worldState = ModSystem.getByName('CalamityWorldState');
            Tell(`Player state: ${playerState ? playerState.GetSummary() : 'missing'}.`, playerState ? 100 : 255, playerState ? 255 : 90, playerState ? 130 : 90);
            Tell(`World state: ${worldState ? worldState.GetSummary() : 'missing'}.`, worldState ? 100 : 255, worldState ? 255 : 90, worldState ? 130 : 90);
            Tell(`Active custom NPC states: ${CalamityNPCState.Count()}.`, 120, 220, 255);
            return false;
        }
        if (action === 'menu') {
            Tell('Menu Calamity ativo no slot nativo 50; Desert Scourge usa o slot 80 e Crabulon usa o slot 81.', 120, 220, 255);
            return false;
        }
        if (action === 'cheatmenu' || action === 'cheat' || action === 'itensmenu') {
            const result = ItemLoader.EnsureCalamityCheatMenu();
            Tell(`Cheat menu Calamity: categoria=${result.category ? 'OK' : 'falhou'}, itens=${result.added}/${result.total}.`, result.category && result.added === result.total ? 100 : 255, result.category && result.added === result.total ? 255 : 180, result.category && result.added === result.total ? 130 : 90);
            return false;
        }
        if (action === 'fusion' || action === 'fusioncore') {
            const option = parts[2] || 'status';
            const core = ModSystem.getByName('FusionCoreSystem');
            const renderHook = GlobalHooks.getByName('FusionRenderHooks');
            if (option === 'test' || option === 'teste') {
                FusionVFXSystem.Clear();
                FusionCamera.Clear();
                const cx = Number(Terraria.PlayerCenterX(player));
                const cy = Number(Terraria.PlayerCenterY(player)) - 40;
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI * 2 * i / 6;
                    const x2 = cx + Math.cos(angle) * 96;
                    const y2 = cy + Math.sin(angle) * 64;
                    FusionVFXSystem.SpawnLine({ x: cx, y: cy }, { x: x2, y: y2 }, 1, { r: 100 + i * 12, g: 220, b: 255 - i * 10, a: 110 }, 26, { fadeIn: 4 });
                    for (let p = 0; p < 2; p++) {
                        FusionVFXSystem.SpawnDot({ x: x2, y: y2 }, { x: Math.cos(angle) * (0.20 + p * 0.18), y: Math.sin(angle) * (0.20 + p * 0.18) }, 2 + p, { r: 120, g: 230, b: 255, a: 140 }, 22 + p * 4, { drag: 0.95, gravity: 0.008 });
                    }
                }
                FusionCamera.Shake(12, 1.6);
                Tell('Teste do Fusion Core criado: 6 telegraphs leves, 12 partículas leves e tremor suave.', 100, 255, 130);
                return false;
            }
            if (option === 'clear' || option === 'limpar') {
                FusionVFXSystem.ClearBenchmark();
                FusionCamera.Clear();
                Tell('Efeitos e câmera do Fusion Core limpos; orçamento VFX normal restaurado.', 180, 180, 180);
                return false;
            }
            if (option === 'budget' || option === 'limite') {
                const budget = FusionVFXSystem.SetBudget(Number(parts[3]) || FusionVFXSystem.MaxEffects);
                Tell(`Orçamento de VFX leves ajustado para ${budget}.`, 120, 220, 255);
                return false;
            }
            const entities = FusionEntityData.GetStats();
            const vfx = FusionVFXSystem.GetStats();
            const camera = FusionCamera.GetStats();
            Tell(`Fusion Core: ${core ? core.GetSummary() : 'missing'}; renderHook=${renderHook && renderHook.HookInstalled ? 'OK' : 'missing'}.`, core && renderHook && renderHook.HookInstalled ? 100 : 255, core && renderHook && renderHook.HookInstalled ? 255 : 90, core && renderHook && renderHook.HookInstalled ? 130 : 90);
            Tell(`EntityData: NPC ${entities.npcSlots}/${entities.npcCapacity}, projéteis ${entities.projectileSlots}/${entities.projectileCapacity}; acesso O(1), sem ai[]/localAI[].`, 120, 220, 255);
            Tell(`VFX: ${vfx.active}/${vfx.budget} ativos, objects=${vfx.drawn}, drawCalls=${vfx.drawCalls}, culled=${vfx.culled}, dropped=${vfx.dropped}; câmera time=${camera.shakeTime}, intensidade=${camera.shakeIntensity.toFixed(2)}.`, 120, 220, 255);
            return false;
        }
        if (action === 'vfxbench' || action === 'vfxbenchmark' || action === 'benchmarkvfx') {
            const option = String(parts[2] || 'status').toLowerCase();
            if (option === 'clear' || option === 'limpar' || option === 'off') {
                FusionVFXSystem.ClearBenchmark();
                Tell('FusionVFX 2 benchmark limpo; orçamento normal restaurado para 96 efeitos.', 180, 180, 180);
                return false;
            }
            if (option === 'status' || option === 'stats') {
                const vfx = FusionVFXSystem.GetStats();
                const tx = vfx.textures;
                Tell(`FusionVFX 2: modo=${vfx.benchmarkMode}, efeitos=${vfx.active}/${vfx.budget}, objetos desenhados=${vfx.drawn}, draw calls=${vfx.drawCalls}, cull=${vfx.culled}.`, 120, 220, 255);
                Tell(`Cache de texturas=${tx.loaded}/${tx.total}, falhas=${tx.failures}; benchmark esperado=${vfx.benchmarkExpectedDrawCalls} draw calls/frame.`, tx.failures === 0 ? 100 : 255, tx.failures === 0 ? 255 : 170, tx.failures === 0 ? 130 : 90);
                return false;
            }

            let mode = 'layered';
            let count = 25;
            const numericFirst = Number(parts[2]);
            if (Number.isFinite(numericFirst) && numericFirst > 0) {
                count = numericFirst;
                mode = String(parts[3] || 'layered').toLowerCase();
            } else {
                mode = option;
                count = Number(parts[3]) || 25;
            }
            const cx = Number(Terraria.PlayerCenterX(player));
            const cy = Number(Terraria.PlayerCenterY(player)) - 100;
            const result = FusionVFXSystem.RunBenchmark({ x: cx, y: cy }, count, mode);
            Tell(`FusionVFX 2 benchmark: ${result.mode}, ${result.spawned}/${result.requested} efeitos, orçamento=${result.budget}, alvo≈${result.expectedDrawCalls} draw calls/frame.`, 100, 255, 130);
            Tell('Fique parado por alguns segundos e observe o contador de FPS. Testes sugeridos: 25, 50, 100 e 150. Trail é propositalmente mais pesado.', 120, 220, 255);
            return false;
        }
        if (action === 'vfxfidelity' || action === 'vfxreal' || action === 'vfxfull') {
            const option = String(parts[2] || 'status').toLowerCase();
            if (option === 'clear' || option === 'limpar') {
                FusionVFXSystem.ClearBenchmark();
                Tell('FusionVFX 2 gameplay effects cleared; adaptive full-fidelity budget restored.', 180, 180, 180);
                return false;
            }
            if (option === 'boss' || option === 'fase') {
                const centerX = Number(Terraria.PlayerCenterX(player));
                const centerY = Number(Terraria.PlayerCenterY(player)) - 80;
                const fakeBoss = {
                    active: true,
                    position: { X: centerX - 40, Y: centerY - 40 },
                    width: 80,
                    height: 80
                };
                BossPhaseVFX.Trigger(fakeBoss, 'slime', 3);
                Tell('Teste real de transição de boss disparado no FusionVFX 2.', 205, 125, 255);
                return false;
            }
            if (option === 'rage' || option === 'furia' || option === 'fúria') {
                const state = ModPlayer.getByName('CalamityPlayerState');
                const worldState = ModSystem.getByName('CalamityWorldState');
                if (!state || !worldState) {
                    Tell('Rage state is missing.', 255, 90, 90);
                    return false;
                }
                if (!worldState.RevengeanceMode)
                    worldState.SetRevengeanceMode(true);
                state.RageModeActive = false;
                state.Rage = state.RageMax;
                state.RageReadyHeld = true;
                state.RageReadyGraceUsed = true;
                state.TryActivateRage(player, false);
                Tell('Teste real de Fúria ativado com o renderer FusionVFX 2.', 255, 95, 80);
                return false;
            }
            if (option === 'adrenaline' || option === 'adrenalina' || option === 'adren') {
                const state = ModPlayer.getByName('CalamityPlayerState');
                const worldState = ModSystem.getByName('CalamityWorldState');
                if (!state || !worldState) {
                    Tell('Adrenaline state is missing.', 255, 90, 90);
                    return false;
                }
                if (!worldState.RevengeanceMode)
                    worldState.SetRevengeanceMode(true);
                state.AdrenalineModeActive = false;
                state.Adrenaline = state.AdrenalineMax;
                state.TryActivateAdrenaline(player, false);
                Tell('Teste real de Adrenalina ativado com sigilo e partículas FusionVFX 2.', 90, 255, 195);
                return false;
            }
            if (option === 'arc' || option === 'arczap' || option === 'zap') {
                let target = -1;
                let best = 900 * 900;
                const px = Number(Terraria.PlayerCenterX(player));
                const py = Number(Terraria.PlayerCenterY(player));
                for (let i = 0; i < 200; i++) {
                    const npc = Terraria.Main.npc[i];
                    if (!npc || !npc.active || npc.friendly || Number(npc.life) <= 0)
                        continue;
                    const nx = Number(npc.position && npc.position.X) + Number(npc.width) * 0.5;
                    const ny = Number(npc.position && npc.position.Y) + Number(npc.height) * 0.5;
                    const dx = nx - px, dy = ny - py;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < best) { best = d2; target = i; }
                }
                const arcType = Number(ModProjectile.getTypeByName('ArcZap') || 0);
                if (!(target >= 0) || !(arcType > 0)) {
                    Tell('Coloque um inimigo perto para testar o ArcZap.', 255, 180, 90);
                    return false;
                }
                NewProjectile(null, px, py - 20, 0, -2, arcType, 25, 0, Math.floor(Number(player.whoAmI)), target, 3, 0, null);
                Tell('ArcZap de teste criado: trail + bloom + impacto FusionVFX 2.', 90, 235, 255);
                return false;
            }
            const vfx = FusionVFXSystem.GetStats();
            const q = vfx.quality;
            const tx = vfx.textures;
            Tell(`VFX fidelity: qualidade=${q.name} (nível ${q.level}), ativos=${vfx.active}/${vfx.budget}, drawCalls=${vfx.drawCalls}, cull=${vfx.culled}.`, 120, 220, 255);
            Tell(`Cache=${tx.loaded}/${tx.total}, falhas=${tx.failures}; mudanças adaptativas=${vfx.qualityChanges}. Testes: boss | rage | adrenaline | arc | clear.`, tx.failures === 0 ? 100 : 255, tx.failures === 0 ? 255 : 170, tx.failures === 0 ? 130 : 90);
            return false;
        }
        if (action === 'renderstats' || action === 'vfxstats' || action === 'render') {
            const vfx = FusionVFXSystem.GetStats();
            const renderHook = GlobalHooks.getByName('FusionRenderHooks');
            Tell(`Render leve: ativos=${vfx.active}/${vfx.budget}, atualizados=${vfx.updated}, objetos=${vfx.drawn}, drawCalls=${vfx.drawCalls}, fora da tela=${vfx.culled}.`, 120, 220, 255);
            Tell(`Total criado=${vfx.spawned}, descartado pelo limite=${vfx.dropped}, margem de culling=${vfx.margin}, hook=${renderHook && renderHook.HookInstalled ? 'OK' : 'missing'}.`, renderHook && renderHook.HookInstalled ? 100 : 255, renderHook && renderHook.HookInstalled ? 255 : 90, renderHook && renderHook.HookInstalled ? 130 : 90);
            return false;
        }
        if (action === 'camerastatus' || action === 'camera') {
            const option = parts[2] || 'status';
            if (option === 'test' || option === 'teste') {
                FusionCamera.Shake(20, 3);
                Tell('Teste de câmera iniciado: tremor leve por 20 ticks.', 100, 255, 130);
                return false;
            }
            if (option === 'focus' || option === 'foco') {
                const cx = Number(Terraria.PlayerCenterX(player)) + 260;
                const cy = Number(Terraria.PlayerCenterY(player)) - 80;
                FusionCamera.FocusPosition({ x: cx, y: cy }, 120, 0.10);
                Tell('Teste de foco iniciado por 120 ticks; a câmera deve mover suave e voltar ao player quando terminar.', 100, 255, 130);
                return false;
            }
            if (option === 'clear' || option === 'limpar') {
                FusionCamera.Clear();
                Tell('Foco, tremor e fade da câmera foram limpos.', 180, 180, 180);
                return false;
            }
            const camera = FusionCamera.GetStats();
            Tell(`Câmera: shakeTime=${camera.shakeTime}, intensidade=${camera.shakeIntensity.toFixed(2)}, offset=(${camera.offsetX.toFixed(2)}, ${camera.offsetY.toFixed(2)}), fade=${camera.fadeActive ? 'ativo' : 'inativo'}.`, 120, 220, 255);
            Tell(`Foco=${camera.focusActive ? camera.focusMode : 'inativo'}, npc=${camera.focusNPCIndex}, restante=${camera.focusTicksLeft} ticks, suavização=${camera.focusSmoothing.toFixed(2)}; DisableCameraShake=${camera.cameraShakeDisabled}.`, 180, 220, 255);
            return false;
        }
        if (action === 'performance' || action === 'fps' || action === 'desempenho') {
            let scourgeSegments = 0;
            let nuisanceSegments = 0;
            let crabShrooms = 0;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active)
                    continue;
                if (npc.type === types.scourgeBody || npc.type === types.scourgeTail)
                    scourgeSegments++;
                else if (npc.type === types.nuisanceBody || npc.type === types.nuisanceTail || npc.type === types.nuisanceYoungBody || npc.type === types.nuisanceYoungTail)
                    nuisanceSegments++;
                else if (npc.type === types.crabShroom)
                    crabShrooms++;
            }
            const ripperUI = GlobalHooks.getByName('RipperUIHooks');
            const hiddenBars = ripperUI ? Number(ripperUI.LastSuppressedSegmentBars || 0) : -1;
            Tell(`Perfil mobile ativo: segmentos do Flagelo=${scourgeSegments}, segmentos Nuisance=${nuisanceSegments}, Crab Shrooms=${crabShrooms}.`, 100, 255, 130);
            Tell(`Barras individuais de segmentos ocultadas no último frame=${hiddenBars}; a barra principal do boss permanece ativa.`, hiddenBars >= 0 ? 100 : 255, hiddenBars >= 0 ? 255 : 90, hiddenBars >= 0 ? 130 : 90);
            Tell(`Estados JS ativos=${CalamityNPCState.Count()}; segmentos não usam mais Map por frame, boss/netAlways ou busca repetida de tipos.`, 120, 220, 255);
            return false;
        }
        if (action === 'amplifier' || action === 'amplificador' || action === 'amp') {
            if (!(types.amplifier > 0)) {
                Tell('Wulfrum Amplifier registration failed.', 255, 90, 90);
                return false;
            }
            const side = parts[2] === 'left' || parts[2] === 'esquerda' ? -1 : 1;
            const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) + 120 * side), Math.floor(Terraria.PlayerCenterY(player) - 24), types.amplifier, 0, 0, 0, 0, 0, 255);
            if (index >= 0)
                Tell(`Wulfrum Amplifier spawned on the ${side < 0 ? 'left' : 'right'} (NPC slot ${index}). Stay within about 330 pixels to activate it.`, 100, 255, 130);
            else
                Tell('The Wulfrum Amplifier could not be spawned.', 255, 90, 90);
            return false;
        }
        if (action === 'charge' || action === 'supercharge' || action === 'overcharge') {
            if (!(types.rover > 0 && types.gyrator > 0 && types.drone > 0 && types.hovercraft > 0 && types.amplifier > 0)) {
                Tell('One or more Wulfrum NPCs failed to register.', 255, 90, 90);
                return false;
            }
            const amp = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) + 60), Math.floor(Terraria.PlayerCenterY(player) - 24), types.amplifier, 0, 0, 0, 0, 0, 255);
            const rover = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) - 210), Math.floor(Terraria.PlayerCenterY(player) - 20), types.rover, 0, 0, 0, 0, 0, 255);
            const gyrator = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) + 245), Math.floor(Terraria.PlayerCenterY(player) - 24), types.gyrator, 0, 0, 0, 0, 0, 255);
            const drone = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) - 80), Math.floor(Terraria.PlayerCenterY(player) - 150), types.drone, 0, 0, 0, 0, 0, 255);
            Tell(`Supercharge test spawned: Amplifier ${amp}, Rover ${rover}, Gyrator ${gyrator}, Drone ${drone}. Remain near the Amplifier until its field expands.`, 100, 255, 130);
            return false;
        }
        if (action === 'chargestatus' || action === 'superchargestatus' || action === 'ampstatus') {
            let found = 0;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active)
                    continue;
                if (npc.type !== types.rover && npc.type !== types.gyrator && npc.type !== types.drone && npc.type !== types.hovercraft && npc.type !== types.amplifier)
                    continue;
                const state = CalamityNPCState.Get(npc);
                if (npc.type === types.amplifier) {
                    Tell(`Amplifier slot ${i}: charging=${state.charging === true}, radius=${Number(state.chargeRadius).toFixed(0)}, charged=${state.lastChargedCount || 0}, reinforcements=${state.reinforcementsSpawnedCount || 0}/${state.reinforcementsRequested || 0}, attempts=${state.reinforcementAttempts || 0}, scans=${state.chargeScans || 0}, particles=${state.chargeBursts || 0}.`, 120, 220, 255);
                } else {
                    const name = npc.type === types.rover ? 'Rover' : npc.type === types.gyrator ? 'Gyrator' : npc.type === types.hovercraft ? 'Hovercraft' : 'Drone';
                    Tell(`${name} slot ${i}: supercharged=${state.superchargeTimer > 0}, timer=${state.superchargeTimer}.`, state.superchargeTimer > 0 ? 100 : 220, state.superchargeTimer > 0 ? 255 : 220, state.superchargeTimer > 0 ? 130 : 220);
                }
                found++;
            }
            if (found === 0)
                Tell('No active Wulfrum test NPCs found.', 255, 210, 90);
            return false;
        }
        if (action === 'uncharge' || action === 'clearamp' || action === 'stopcharge') {
            let removed = 0;
            let reset = 0;
            for (let i = 0; i < 200; i++) {
                const npc = Terraria.Main.npc[i];
                if (!npc || !npc.active)
                    continue;
                if (npc.type === types.amplifier) {
                    npc.active = false;
                    CalamityNPCState.Remove(npc);
                    removed++;
                } else if (npc.type === types.rover || npc.type === types.gyrator || npc.type === types.drone || npc.type === types.hovercraft) {
                    const state = CalamityNPCState.Get(npc);
                    state.superchargeTimer = 0;
                    reset++;
                }
            }
            Tell(`Supercharge test cleared: ${removed} Amplifier(s) removed and ${reset} Wulfrum timer(s) reset.`, 120, 220, 255);
            return false;
        }
        if (action === 'drone' || action === 'wulfrumdrone' || action === 'voador') {
            if (!(types.drone > 0)) {
                Tell('Wulfrum Drone registration failed.', 255, 90, 90);
                return false;
            }
            const side = parts[2] === 'left' || parts[2] === 'esquerda' ? -1 : 1;
            const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) + 230 * side), Math.floor(Terraria.PlayerCenterY(player) - 150), types.drone, 0, 0, 0, 0, 0, 255);
            if (index >= 0)
                Tell(`Wulfrum Drone spawned in the air on the ${side < 0 ? 'left' : 'right'} (NPC slot ${index}).`, 100, 255, 130);
            else
                Tell('The Wulfrum Drone could not be spawned.', 255, 90, 90);
            return false;
        }
        if (action === 'aerial' || action === 'airtest' || action === 'dronetest') {
            if (!(types.drone > 0 && types.amplifier > 0)) {
                Tell('Wulfrum Drone or Amplifier registration failed.', 255, 90, 90);
                return false;
            }
            const amp = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) + 70), Math.floor(Terraria.PlayerCenterY(player) - 24), types.amplifier, 0, 0, 0, 0, 0, 255);
            const drone = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) - 140), Math.floor(Terraria.PlayerCenterY(player) - 150), types.drone, 0, 0, 0, 0, 0, 255);
            Tell(`Aerial test spawned: Amplifier ${amp}, Drone ${drone}. Stay near the Amplifier and watch for the blue charged frames and lasers.`, 100, 255, 130);
            return false;
        }
        if (action === 'gyrator' || action === 'girador' || action === 'roller') {
            if (!(types.gyrator > 0)) {
                Tell('Wulfrum Gyrator registration failed.', 255, 90, 90);
                return false;
            }
            const side = parts[2] === 'left' || parts[2] === 'esquerda' ? -1 : 1;
            const spawnX = Math.floor(Terraria.PlayerCenterX(player) + 190 * side);
            const spawnY = Math.floor(Terraria.PlayerCenterY(player) - 24);
            const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), spawnX, spawnY, types.gyrator, 0, 0, 0, 0, 0, 255);
            if (index >= 0)
                Tell(`Wulfrum Gyrator spawned on the ${side < 0 ? 'left' : 'right'} (NPC slot ${index}).`, 100, 255, 130);
            else
                Tell('The Wulfrum Gyrator could not be spawned.', 255, 90, 90);
            return false;
        }
        if (action === 'wulfrum' || action === 'wulfrumtest') {
            if (!(types.rover > 0 && types.gyrator > 0 && types.drone > 0 && types.hovercraft > 0 && types.amplifier > 0)) {
                Tell('One or more Wulfrum NPCs failed to register.', 255, 90, 90);
                return false;
            }
            const amp = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) + 60), Math.floor(Terraria.PlayerCenterY(player) - 24), types.amplifier, 0, 0, 0, 0, 0, 255);
            const rover = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) - 220), Math.floor(Terraria.PlayerCenterY(player) - 20), types.rover, 0, 0, 0, 0, 0, 255);
            const gyrator = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) + 245), Math.floor(Terraria.PlayerCenterY(player) - 24), types.gyrator, 0, 0, 0, 0, 0, 255);
            const drone = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Terraria.PlayerCenterX(player) - 100), Math.floor(Terraria.PlayerCenterY(player) - 150), types.drone, 0, 0, 0, 0, 0, 255);
            Tell(`Full Wulfrum test spawned: Amplifier ${amp}, Rover ${rover}, Gyrator ${gyrator}, Drone ${drone}.`, 100, 255, 130);
            return false;
        }
        if (action === 'rover' || action === 'enemy' || action === 'npc') {
            if (!(types.rover > 0)) {
                Tell('Wulfrum Rover registration failed.', 255, 90, 90);
                return false;
            }
            const side = parts[2] === 'left' || parts[2] === 'esquerda' ? -1 : 1;
            const spawnX = Math.floor(Terraria.PlayerCenterX(player) + 180 * side);
            const spawnY = Math.floor(Terraria.PlayerCenterY(player) - 20);
            const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), spawnX, spawnY, types.rover, 0, 0, 0, 0, 0, 255);
            if (index >= 0)
                Tell(`Wulfrum Rover spawned on the ${side < 0 ? 'left' : 'right'} (NPC slot ${index}).`, 100, 255, 130);
            else
                Tell('The Wulfrum Rover could not be spawned.', 255, 90, 90);
            return false;
        }
        if (action === 'loot' || action === 'drops') {
            Tell('Rover/Gyrator: 1-2 Wulfrum Scrap. Drone: 1-3 Scrap. All have about 7.14% Battery chance and drop 1 Energy Core while supercharged. Rover also has a 1/10 Rover Drive chance.', 120, 220, 255);
            Tell('Amplifier: 2-3 Wulfrum Scrap, Battery about 7.14%, and 1 guaranteed Energy Core.', 255, 210, 90);
            return false;
        }

        if (action === 'luxor' || action === 'luxorsgift' || action === 'presentedeluxor') {
            if (!(types.luxorsGift > 0)) {
                Tell("Luxor's Gift registration failed.", 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.luxorsGift, 1);
            Tell("Luxor's Gift spawned. Equip it, hit an enemy, and swap held weapon classes to test each shot.", 100, 255, 130);
            return false;
        }
        if (action === 'luxorstatus' || action === 'luxorstate') {
            const state = ModPlayer.getByName('LuxorPlayer');
            if (!state) {
                Tell('LuxorPlayer is not registered.', 255, 90, 90);
                return false;
            }
            Tell(`Luxor: ${state.GetStatus(player)}`, 100, 225, 255);
            return false;
        }
        if (action === 'roverdrive' || action === 'roveraccessory' || action === 'escudorover') {
            if (!(types.roverDrive > 0)) {
                Tell('Rover Drive registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.roverDrive, 1);
            Tell('Rover Drive spawned. Equip it: the shield starts after its recharge delay.', 100, 255, 130);
            return false;
        }
        if (action === 'roverstatus' || action === 'rovershield' || action === 'shieldstatus') {
            const state = ModPlayer.getByName('RoverDrivePlayer');
            if (!state) {
                Tell('RoverDrivePlayer is not registered.', 255, 90, 90);
                return false;
            }
            const mode = String(parts[2] || 'status');
            if (mode === 'full' || mode === 'cheio')
                state.SetShield(player, 20);
            else if (mode === 'break' || mode === 'quebrar')
                state.BreakShield(player);
            Tell(`Rover Drive: ${state.GetSummary(player)}`, 100, 225, 255);
            return false;
        }
        if (action === 'battery' || action === 'wulfrumbattery') {
            if (!(types.battery > 0)) {
                Tell('Wulfrum Battery registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.battery, 1);
            Tell('Wulfrum Battery spawned. Equip it and compare summon damage.', 100, 255, 130);
            return false;
        }
        if (action === 'scrap' || action === 'wulfrumscrap') {
            if (!(types.scrap > 0)) {
                Tell('Wulfrum Metal Scrap registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.scrap, 10);
            Tell('10 Wulfrum Metal Scrap spawned.', 100, 255, 130);
            return false;
        }
        if (action === 'give' || action === 'energycore' || action === 'core') {
            if (!(types.core > 0)) {
                Tell('Energy Core registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.core, 1);
            Tell('Energy Core spawned next to the player.', 100, 255, 130);
            return false;
        }
        if (action === 'materials' || action === 'recipe') {
            if (!(types.pearl > 0 && types.prism > 0 && types.navystone > 0)) {
                Tell('One or more recipe materials failed to register.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.pearl, 3, -24);
            SpawnItem(player, types.prism, 7, 0);
            SpawnItem(player, types.navystone, 10, 24);
            Tell('Exact Seashine Sword recipe materials spawned: 3 Pearl Shards, 7 Sea Prisms and 10 Navystone.', 100, 255, 130);
            return false;
        }
        if (action === 'weapon' || action === 'sword' || action === 'seashine') {
            if (!(types.sword > 0)) {
                Tell('Seashine Sword registration failed.', 255, 90, 90);
                return false;
            }
            SpawnItem(player, types.sword, 1);
            Tell('Seashine Sword spawned. The original Anvil recipe is active.', 100, 255, 130);
            return false;
        }
        Tell('Unknown command. Use /calamityport help.', 255, 210, 90);
        return false;
    }
}
