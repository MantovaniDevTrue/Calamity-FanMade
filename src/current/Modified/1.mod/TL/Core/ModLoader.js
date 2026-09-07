import { Terraria } from './../ModImports.js';
import { CameraShake, FadeController } from './../Modules/Camera.js';
import { Prototypes } from './Prototypes.js';
import { FileManager } from './FileManager.js';

// Loaders
import { SystemLoader } from './../Loaders/SystemLoader.js';
import { TileLoader } from './../Loaders/TileLoader.js';
import { BiomeLoader } from './../Loaders/BiomeLoader.js';
import { ProjectileLoader } from './../Loaders/ProjectileLoader.js';
import { ItemLoader } from './../Loaders/ItemLoader.js';
import { PlayerLoader } from './../Loaders/PlayerLoader.js';
import { BuffLoader } from './../Loaders/BuffLoader.js';
import { NPCLoader } from './../Loaders/NPCLoader.js';
import { GoreLoader } from './../Loaders/GoreLoader.js';
import { CloudLoader } from './../Loaders/CloudLoader.js';
import { BackgroundLoaders } from './../Loaders/BackgroundLoaders.js';
import { SceneEffectLoader } from './../Loaders/SceneEffectLoader.js';
import { MenuLoader } from './../Loaders/MenuLoader.js';
import { SubworldLoader } from './../Loaders/SubworldLoader.js';
import { HairLoader } from './../Loaders/HairLoader.js';
import { MountLoader } from './../Loaders/MountLoader.js';
import { AchievementLoader } from './../Loaders/AchievementLoader.js';

// ModTypes
import { ModSystem } from './../ModSystem.js';
import { ModRecipe } from './../ModRecipe.js';
import { ModHooks } from './../ModHooks.js';
import { ModLocalization } from './../ModLocalization.js';

// Global
import { GlobalTile } from './../GlobalTile.js';
import { GlobalItem } from './../GlobalItem.js';
import { GlobalNPC } from './../GlobalNPC.js';
import { GlobalProjectile } from './../GlobalProjectile.js';

// Other
import { WorldDB } from './../WorldDB.js';
import { PlayerDB } from './../PlayerDB.js';

export class ModLoader extends ModSystem {
    static ModData = {
        TileCount: 0,
        BuffCount: 0,
        ProjectileCount: 0,
        ItemCount: 0,
        NPCCount: 0
    };
    
    constructor() {
        super();
        this.TILE_NAMES_COUNT = Terraria.ID.TileID.Search.Names.Count;
        this.BUFF_NAMES_COUNT = Terraria.ID.BuffID.Search.Names.Count;
        this.PROJECTILE_NAMES_COUNT = Terraria.ID.ProjectileID.Search.Names.Count;
        this.ITEM_NAMES_COUNT = Terraria.ID.ItemID.Search.Names.Count;
        this.NPC_NAMES_COUNT = Terraria.ID.NPCID.Search.Names.Count;
    }
    
    UpdateModData() {
        ModLoader.ModData.TileCount = Terraria.ID.TileID.Search.Names.Count - this.TILE_NAMES_COUNT;
        ModLoader.ModData.BuffCount = Terraria.ID.BuffID.Search.Names.Count - this.BUFF_NAMES_COUNT;
        ModLoader.ModData.ProjectileCount = Terraria.ID.ProjectileID.Search.Names.Count - this.PROJECTILE_NAMES_COUNT;
        ModLoader.ModData.ItemCount = Terraria.ID.ItemID.Search.Names.Count - this.ITEM_NAMES_COUNT;
        ModLoader.ModData.NPCCount = Terraria.ID.NPCID.Search.Names.Count - this.NPC_NAMES_COUNT;
    }
    
    OnModLoad() {
        FileManager._path = tl.mod.path.split('/tl_files/')[0] + '/';
        Prototypes.Initialize();
        
        const IntPtr = new NativeClass('System', 'IntPtr');
        tl.device.is32Bits = IntPtr.Size === 4;
        const info = {
            is64Bits: !tl.device.is32Bits,
            hasGlobalTiles: GlobalTile.RegisteredTiles.length > 0,
            hasItems: ItemLoader.Items.length > 0,
            hasGlobalItems: GlobalItem.RegisteredItems.length > 0,
            hasNPCs: NPCLoader.NPCs.length > 0,
            hasGlobalNPCs: GlobalNPC.RegisteredNPCs.length > 0,
            hasBuffs: BuffLoader.Buffs.length > 0,
            hasProjectiles: ProjectileLoader.Projectiles.length > 0,
            hasGlobalProjectiles: GlobalProjectile.RegisteredProjectiles.length > 0,
            hasPlayers: PlayerLoader.RegisteredPlayers.length > 0,
            hasMounts: MountLoader.Mounts.length > 0,
            hasClouds: CloudLoader.Clouds.length > 0,
            hasHairs: HairLoader.Hairs.length > 0,
            hasBiomes: BiomeLoader.Biomes.length > 0,
            hasBackgrounds: BackgroundLoaders._hasBackgrounds,
            hasAchievements: AchievementLoader.Achievements.length > 0,
            hasMenus: MenuLoader.Menus.length > 0,
            hasSubworlds: SubworldLoader.Subworlds.length > 0
        };
        
        // Hooks
        ModHooks.Initialize(info);
    }
    
    SetupContent() {
        this.UpdateModData();
        
        // ExMod 1.7.1 parity: localization is ready before any content SetupContent.
        ModLocalization.UpdateTranslations();
        SystemLoader.OnLocalizationsLoaded();
        
        // Loaders
        TileLoader.SetupContent();
        BiomeLoader.SetupContent();
        BackgroundLoaders.SetupContent();
        BuffLoader.SetupContent();
        ProjectileLoader.SetupContent();
        ItemLoader.SetupContent();
        NPCLoader.SetupContent();
        GoreLoader.SetupContent();
        CloudLoader.SetupContent();
        HairLoader.SetupContent();
        MenuLoader.SetStaticDefaults();
        
        AchievementLoader.SetupContent();
    }
    
    PostSetupContent() {
        this.UpdateModData();
        
        ModHooks.PostSetupContentInitialize();
        
        // Loaders
        MountLoader.PostSetupContent();
        TileLoader.PostSetupContent();
        BiomeLoader.PostSetupContent();
        BackgroundLoaders.PostSetupContent();
        BuffLoader.PostSetupContent();
        ProjectileLoader.PostSetupContent();
        ItemLoader.PostSetupContent();
        NPCLoader.PostSetupContent();
        GoreLoader.PostSetupContent();
        MenuLoader.OnEnter();
        
        this.CheckFiles('Players/', '.plr');
        this.CheckFiles('Worlds/', '.wld');
    }
    
    AddRecipeGroups() {
        GlobalItem.RegisteredItems.forEach(g => g?.AddRecipeGroups());
        ItemLoader.Items.forEach(i => i?.AddRecipeGroups());
    }
    
    AddRecipes() {
        GlobalItem.RegisteredItems.forEach(g => g?.AddRecipes());
        ItemLoader.Items.forEach(i => i?.AddRecipes());
    }
    
    OnWorldLoad() {
        if (!SubworldLoader.AnySubworldActive && FileManager.IsSafe(Terraria.Main.ActivePlayerFileData.Path + '.bin')) {
            PlayerDB.Instance = new PlayerDB(Terraria.Main.ActivePlayerFileData.Path + '.bin');
            PlayerDB.Instance.Load();
        }
        if (!SubworldLoader.AnySubworldActive && FileManager.IsSafe(Terraria.Main.ActiveWorldFileData.Path + '.bin')) {
            WorldDB.Instance = new WorldDB(Terraria.Main.ActiveWorldFileData.Path + '.bin');
            WorldDB.Instance.Load();
        }
        
        if (PlayerDB.Instance) {
            const savedBuffs = PlayerDB.get('modsystem:buffs')?.split('/') ?? [];
            if (savedBuffs.length > 0) {
                const player = Terraria.Main.player[Terraria.Main.myPlayer];
                for (const b of savedBuffs) {
                    const [name, time] = b.split('|');
                    const type = BuffLoader.getTypeByName(name);
                    if (type) player.AddBuff(type, +time, false);
                }
                PlayerDB.delete('modsystem:buffs');
            }
        }
        
        // OnWorldLoad may run before the world-creation/loading UI has actually left
        // Main.gameMenu.  Tearing the menu down here makes both the Calamity background
        // and its music disappear while the loading screen is still visible.
        if (Terraria.Main.gameMenu !== true) MenuLoader.OnLeave();
        ModHooks.OnWorldLoad();
    }
    
    PreSaveAndQuit() {
        if (PlayerDB.Instance) {
            const player = Terraria.Main.player[Terraria.Main.myPlayer];
            const buffs = [];
            for (let i = 0; i < Terraria.Player.maxBuffs; i++) {
                const type = player.buffType[i];
                if (Terraria.Main.buffNoSave[type]) continue;
                if (player.buffTime[i] > 0 && BuffLoader.isModType(type)) {
                    const modBuff = BuffLoader.getModBuff(type);
                    if (modBuff) buffs.push(`${modBuff.constructor.name}|${player.buffTime[i]}`);
                }
            }
            if (buffs.length) PlayerDB.set('modsystem:buffs', buffs.join('/'));
            else PlayerDB.set('modsystem:buffs', null);
            PlayerDB.Instance.Save();
        }
        if (WorldDB.Instance) WorldDB.Instance.Save();
        
        SceneEffectLoader.PreSaveAndQuit();
        CameraShake.Clear();
        FadeController.Clear();
        MenuLoader.OnEnter();
    }
    
    OnWorldUnload() {
        if (!SubworldLoader.Joining) {
            if (PlayerDB.Instance) PlayerDB.Instance.Clear();
            if (WorldDB.Instance) WorldDB.Instance.Clear();
        }
        ModHooks.OnWorldUnload();
    }
    
    CheckFiles(folder, extension) {
        const files = Array.from(FileManager.ListFiles(FileManager.path + folder));
        const files2 = files.filter(f => f.endsWith(extension + '.bin'));
        for (let bin of files2) {
            if (!FileManager.Exists(bin.replace(extension + '.bin', extension))) {
                FileManager.Delete(bin);
            }
        }
    }
    
    static DeleteDatabase(path) {
        if (FileManager.Exists(path + '.bin')) {
            FileManager.Delete(path + '.bin');
        }
    }
}