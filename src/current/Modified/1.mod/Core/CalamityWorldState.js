import { ModSystem } from './../TL/ModSystem.js';
import { WorldDB } from './../TL/WorldDB.js';
import { CalamityNPCState } from './CalamityNPCState.js';

export class CalamityWorldState extends ModSystem {
    constructor() {
        super();
        this.ResetRuntime();
    }
    static Prefix(key) {
        return `calamity:world:${key}`;
    }

    ResetRuntime() {
        this.Loaded = false;
        this.RevengeanceMode = false;
        this.DeathMode = false;
        this.WulfrumRoverKills = 0;
        this.WulfrumGyratorKills = 0;
        this.WulfrumAmplifierKills = 0;
        this.WulfrumDroneKills = 0;
        this.DownedDesertScourge = false;
        this.DownedCrabulon = false;
        this.DownedHiveMind = false;
        this.DownedPerforators = false;
        this.DownedSlimeGod = false;
        this.DownedGiantClam = false;
    }

    OnWorldLoad() {
        this.Loaded = true;
        this.RevengeanceMode = WorldDB.get(CalamityWorldState.Prefix('revengeanceMode')) === true;
        this.DeathMode = WorldDB.get(CalamityWorldState.Prefix('deathMode')) === true;
        if (this.DeathMode)
            this.RevengeanceMode = true;
        this.WulfrumRoverKills = Number(WorldDB.get(CalamityWorldState.Prefix('wulfrumRoverKills')) || 0);
        this.WulfrumGyratorKills = Number(WorldDB.get(CalamityWorldState.Prefix('wulfrumGyratorKills')) || 0);
        this.WulfrumAmplifierKills = Number(WorldDB.get(CalamityWorldState.Prefix('wulfrumAmplifierKills')) || 0);
        this.WulfrumDroneKills = Number(WorldDB.get(CalamityWorldState.Prefix('wulfrumDroneKills')) || 0);
        this.DownedDesertScourge = WorldDB.get(CalamityWorldState.Prefix('downedDesertScourge')) === true;
        this.DownedCrabulon = WorldDB.get(CalamityWorldState.Prefix('downedCrabulon')) === true;
        this.DownedHiveMind = WorldDB.get(CalamityWorldState.Prefix('downedHiveMind')) === true;
        this.DownedPerforators = WorldDB.get(CalamityWorldState.Prefix('downedPerforators')) === true;
        this.DownedSlimeGod = WorldDB.get(CalamityWorldState.Prefix('downedSlimeGod')) === true;
        this.DownedGiantClam = WorldDB.get(CalamityWorldState.Prefix('downedGiantClam')) === true;
        WorldDB.set(CalamityWorldState.Prefix('schemaVersion'), 8);
        CalamityNPCState.Clear();
    }

    OnWorldUnload() {
        CalamityNPCState.Clear();
        this.ResetRuntime();
    }

    PreSaveAndQuit() {
        this.Save();
    }

    Save() {
        if (!this.Loaded)
            return;
        WorldDB.set(CalamityWorldState.Prefix('revengeanceMode'), this.RevengeanceMode === true);
        WorldDB.set(CalamityWorldState.Prefix('deathMode'), this.DeathMode === true);
        WorldDB.set(CalamityWorldState.Prefix('wulfrumRoverKills'), this.WulfrumRoverKills);
        WorldDB.set(CalamityWorldState.Prefix('wulfrumGyratorKills'), this.WulfrumGyratorKills);
        WorldDB.set(CalamityWorldState.Prefix('wulfrumAmplifierKills'), this.WulfrumAmplifierKills);
        WorldDB.set(CalamityWorldState.Prefix('wulfrumDroneKills'), this.WulfrumDroneKills);
        WorldDB.set(CalamityWorldState.Prefix('downedDesertScourge'), this.DownedDesertScourge);
        WorldDB.set(CalamityWorldState.Prefix('downedCrabulon'), this.DownedCrabulon);
        WorldDB.set(CalamityWorldState.Prefix('downedHiveMind'), this.DownedHiveMind);
        WorldDB.set(CalamityWorldState.Prefix('downedPerforators'), this.DownedPerforators);
        WorldDB.set(CalamityWorldState.Prefix('downedSlimeGod'), this.DownedSlimeGod);
        WorldDB.set(CalamityWorldState.Prefix('downedGiantClam'), this.DownedGiantClam);
    }

    SetRevengeanceMode(value) {
        this.RevengeanceMode = value === true;
        if (!this.RevengeanceMode)
            this.DeathMode = false;
        if (WorldDB.Instance) {
            WorldDB.set(CalamityWorldState.Prefix('revengeanceMode'), this.RevengeanceMode);
            WorldDB.set(CalamityWorldState.Prefix('deathMode'), this.DeathMode === true);
        }
        return this.RevengeanceMode;
    }

    SetDeathMode(value) {
        this.DeathMode = value === true;
        if (this.DeathMode)
            this.RevengeanceMode = true;
        if (WorldDB.Instance) {
            WorldDB.set(CalamityWorldState.Prefix('deathMode'), this.DeathMode);
            WorldDB.set(CalamityWorldState.Prefix('revengeanceMode'), this.RevengeanceMode);
        }
        return this.DeathMode;
    }

    RecordWulfrumRoverKill() {
        this.WulfrumRoverKills++;
        WorldDB.set(CalamityWorldState.Prefix('wulfrumRoverKills'), this.WulfrumRoverKills);
    }

    RecordWulfrumGyratorKill() {
        this.WulfrumGyratorKills++;
        WorldDB.set(CalamityWorldState.Prefix('wulfrumGyratorKills'), this.WulfrumGyratorKills);
    }

    RecordWulfrumAmplifierKill() {
        this.WulfrumAmplifierKills++;
        WorldDB.set(CalamityWorldState.Prefix('wulfrumAmplifierKills'), this.WulfrumAmplifierKills);
    }

    RecordWulfrumDroneKill() {
        this.WulfrumDroneKills++;
        WorldDB.set(CalamityWorldState.Prefix('wulfrumDroneKills'), this.WulfrumDroneKills);
    }

    RecordDesertScourgeKill() {
        this.DownedDesertScourge = true;
        if (WorldDB.Instance)
            WorldDB.set(CalamityWorldState.Prefix('downedDesertScourge'), true);
        return this.DownedDesertScourge;
    }

    RecordCrabulonKill() {
        this.DownedCrabulon = true;
        if (WorldDB.Instance)
            WorldDB.set(CalamityWorldState.Prefix('downedCrabulon'), true);
        return this.DownedCrabulon;
    }

    RecordHiveMindKill() {
        this.DownedHiveMind = true;
        if (WorldDB.Instance)
            WorldDB.set(CalamityWorldState.Prefix('downedHiveMind'), true);
        const aerialite = ModSystem.getByName('AerialiteProgressionSystem');
        if (aerialite && typeof aerialite.RequestEnchant === 'function')
            aerialite.RequestEnchant();
        return this.DownedHiveMind;
    }

    RecordPerforatorsKill() {
        this.DownedPerforators = true;
        if (WorldDB.Instance)
            WorldDB.set(CalamityWorldState.Prefix('downedPerforators'), true);
        const aerialite = ModSystem.getByName('AerialiteProgressionSystem');
        if (aerialite && typeof aerialite.RequestEnchant === 'function')
            aerialite.RequestEnchant();
        return this.DownedPerforators;
    }

    RecordSlimeGodKill() {
        this.DownedSlimeGod = true;
        if (WorldDB.Instance)
            WorldDB.set(CalamityWorldState.Prefix('downedSlimeGod'), true);
        return this.DownedSlimeGod;
    }

    RecordGiantClamKill() {
        this.DownedGiantClam = true;
        if (WorldDB.Instance)
            WorldDB.set(CalamityWorldState.Prefix('downedGiantClam'), true);
        return this.DownedGiantClam;
    }

    GetSummary() {
        return `loaded=${this.Loaded}, revengeance=${this.RevengeanceMode}, death=${this.DeathMode}, roverKills=${this.WulfrumRoverKills}, gyratorKills=${this.WulfrumGyratorKills}, droneKills=${this.WulfrumDroneKills}, amplifierKills=${this.WulfrumAmplifierKills}, desertScourge=${this.DownedDesertScourge}, crabulon=${this.DownedCrabulon}, hiveMind=${this.DownedHiveMind}, perforators=${this.DownedPerforators}, slimeGod=${this.DownedSlimeGod}, giantClam=${this.DownedGiantClam}`;
    }
}
