import { Terraria } from './ModImports.js';

export class NPCSpawnInfo {
    constructor(x, y, player) {
        this.SpawnTileX = Math.floor(x / 16);
        this.SpawnTileY = Math.floor(y / 16);
        this.SpawnTile = Terraria.Main.tile.get_Item(this.SpawnTileX, this.SpawnTileY);
        this.SpawnTileType = this.SpawnTile.type;
        this.Player = player;
        this._water = undefined;
        this._playerSafe = undefined;
        this._playerInTown = undefined;
    }
    
    // Layers
    get Sky() { return this.Player.ZoneSkyHeight; }
    get Surface() { return this.Player.ZoneOverworldHeight; }
    get Underground() { return this.Player.ZoneDirtLayerHeight; }
    get Cavern() { return this.Player.ZoneRockLayerHeight; }
    get Underworld() { return this.Player.ZoneUnderworldHeight; }
    get AboveSurface() { return this.Surface || this.Sky; }
    get BelowSurface() { return !this.AboveSurface && !this.Underworld; }
    
    // Climates
    get Day() { return Terraria.Main.dayTime; }
    get Night() { return !Terraria.Main.dayTime; }
    get Rain() { return Terraria.Main.raining; }
    get SlimeRain() { return Terraria.Main.slimeRain; }
    get BloodMoon() { return Terraria.Main.bloodMoon; }
    
    // Events
    get AnyEvent() { return this.SlimeRain || this.SolarEclipse || this.PumpkinMoon || this.FrostMoon || this.OldOnesArmy; }
    get SolarEclipse() { return Terraria.Main.eclipse; }
    get PumpkinMoon() { return Terraria.Main.pumpkinMoon; }
    get FrostMoon() { return Terraria.Main.snowMoon; }
    get OldOnesArmy() { return Terraria.GameContent.Events.DD2Event.Ongoing && this.Player.ZoneOldOneArmy; }
    
    // Other
    get HardMode() { return Terraria.Main.hardMode; }
    get Expert() { return Terraria.Main.expertMode || this.Master; }
    get Master() { return Terraria.Main.masterMode; }
    get Water() {
        if (this._water !== undefined) return this._water;
        let value = false;
        try { value = this.SpawnTile.liquid >= 200 && this.SpawnTile['byte liquidType()']() === 0; } catch (_) { }
        this._water = value;
        return value;
    }
    
    // Biomes
    get Ocean() {
        return this.Water && (this.SpawnTileX < 250 || this.SpawnTileX > Terraria.Main.maxTilesX - 250)
        && Terraria.Main.tileSand[this.SpawnTileType] && this.SpawnTileY < Terraria.Main.rockLayer;
    }
    get Corruption() { return this.Player.ZoneCorrupt && (this.Surface || this.Sky); }
    get UndergroundCorruption() { return this.Player.ZoneCorrupt && (this.Underground || this.Cavern); }
    get Crimson() { return this.Player.ZoneCrimson && (this.Surface || this.Sky); }
    get UndergroundCrimson() { return this.Player.ZoneCrimson && (this.Underground || this.Cavern); }
    get Hallow() { return this.Player.ZoneHallow && (this.Surface || this.Sky); }
    get UndergroundHallow() { return this.Player.ZoneHallow && (this.Underground || this.Cavern); }
    get Snow() { return this.Player.ZoneSnow && (this.Surface || this.Sky); }
    get Ice() { return this.Player.ZoneSnow && (this.Underground || this.Cavern); }
    get Jungle() { return this.Player.ZoneJungle && (this.Surface || this.Sky); }
    get UndergroundJungle() { return this.Player.ZoneJungle && (this.Underground || this.Cavern); }
    get SurfaceMushroom() { return this.Player.ZoneGlowshroom && this.Surface; }
    get Mushroom() { return this.Player.ZoneGlowshroom && this.Cavern; }
    get Meteor() { return this.Player.ZoneMeteor; }
    get Desert() { return this.Player.ZoneDesert; }
    get DesertCave() { return this.Player.ZoneUndergroundDesert; }
    get SpiderCave() { return this.SpawnTile.wall === Terraria.ID.WallID.SpiderUnsafe; }
    get Marble() { return this.Player.ZoneMarble; }
    get Granite() { return this.Player.ZoneGranite; }
    get Graveyard() { return this.Player.ZoneGraveyard; }
    get Dungeon() { return this.Player.ZoneDungeon; }
    get Lihzahrd() { return this.Player.ZoneLihzhardTemple; }
    
    // Invasions
    get Invasion() { return Terraria.Main.invasionType > 0; }
    get GoblinArmy() { return Terraria.Main.invasionType === 1; }
    get FrostLegion() { return Terraria.Main.invasionType === 2; }
    get Pirates() { return Terraria.Main.invasionType === 3; }
    get MartianMadness() { return Terraria.Main.invasionType === 4; }
    
    // Towers
    get AnyTower() { return this.SolarTower || this.VortexTower || this.NebulaTower || this.StardustTower; }
    get SolarTower() { return this.Player.ZoneTowerSolar; }
    get VortexTower() { return this.Player.ZoneTowerVortex; }
    get NebulaTower() { return this.Player.ZoneTowerNebula; }
    get StardustTower() { return this.Player.ZoneTowerStardust; }
    
    // Common Checks
    get CommonEnemy() { return !this.Invasion && !this.AnyEvent && !this.AnyTower; }
    get PlayerSafe() {
        if (this._playerSafe !== undefined) return this._playerSafe;
        const posX = Math.floor(Terraria.PlayerCenterX(this.Player) / 16);
        const posY = Math.floor(Terraria.PlayerCenterY(this.Player) / 16);
        this._playerSafe = Terraria.WorldGen.NearFriendlyWall(posX, posY) === true;
        return this._playerSafe;
    }
    get PlayerInTown() {
        // NPCSpawnInfo is one natural-spawn attempt. Terraria/tModLoader exposes
        // one PlayerInTown result for that attempt; do not reroll independently
        // for every registered ModNPC candidate.
        if (this._playerInTown !== undefined) return this._playerInTown;
        let flag = false;
        let numTownNPCs = this.Player.townNPCs;
        const Next = (n) => Math.floor(Math.random() * (n + 1));
        if (numTownNPCs === 1) {
            if (this.Graveyard) flag = Next(9) === 0;
            else flag = Next(10) === 0;
        } else if (numTownNPCs === 2) {
            if (this.Graveyard) flag = Next(6) === 0;
            else flag = Next(5) === 0;
        } else if (numTownNPCs >= 3) {
            if (this.Graveyard) flag = Next(3) === 0;
            else flag = !this.Expert || Next(30) !== 0;
        }
        this._playerInTown = flag;
        return flag;
    }
}