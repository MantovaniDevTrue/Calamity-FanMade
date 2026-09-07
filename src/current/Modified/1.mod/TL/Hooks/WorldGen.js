import { Terraria, Microsoft, Modules } from './../ModImports.js';
import { TileData } from './../Modules/TileData.js';
import { TileLoader } from './../Loaders/TileLoader.js';
import { GlobalTile } from './../GlobalTile.js';
import { SystemLoader } from './../Loaders/SystemLoader.js';
import { NPCLoader } from './../Loaders/NPCLoader.js';
import { SubworldLoader } from './../Loaders/SubworldLoader.js';

const { Point, Rectangle, Vector2 } = Modules;
const PlaySound = (id, x, y) => Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](id, Vector2.new(x, y), 1, 0);

export class WorldGenHooks {
    static initialized = false;
    
    // Here you can disable the hooks that won't be used in your mod to avoid unnecessary processing
    static HookList = {
        All: (info) => true,
        PlaceTile: (info) => info.hasGlobalTiles,
        IsTileReplaceable: (info) => info.hasGlobalTiles,
        ReplaceTile: (info) => info.hasGlobalTiles,
        CanKillTile: (info) => info.hasGlobalTiles,
        KillTile: (info) => info.hasGlobalTiles,
        KillTile_PlaySounds: (info) => info.hasGlobalTiles,
        KillTile_GetTileDustAmount: (info) => info.hasGlobalTiles,
        KillTile_MakeTileDust: (info) => info.hasGlobalTiles,
        KillTile_DropItems: (info) => info.hasGlobalTiles,
        SlopeTile: (info) => info.hasGlobalTiles,
        ShakeTree: (info) => info.hasGlobalTiles,
        SaveAndQuit: (info) => true,
        SpawnTownNPC: (info) => info.hasNPCs
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.PlaceTile(info)) {
            Terraria.WorldGen['bool PlaceTile(int i, int j, int Type, bool mute, bool forced, int plr, int style)'
            ].hook((original, i, j, type, mute, forced, plr, style) => {
                if (TileLoader.CanPlace(i, j, type, mute, forced, plr, style) === false) {
                    return false;
                }
                
                const placed = original(i, j, type, mute, forced, plr, style);
                if (placed) TileLoader.OnPlace(i, j, type, plr, style);
                return placed;
            });
        }
        
        if (this.HookList.IsTileReplaceable(info)) {
            Terraria.WorldGen['bool IsTileReplaceable(int x, int y)'
            ].hook((original, x, y) => {
                const type = new TileData(x, y).type;
                if (TileLoader.IsReplaceable(type, x, y) === false) {
                    return false;
                }
                if (type < TileLoader.MAX_VANILLA_ID) {
                    return original(x, y);
                }
                return true;
            });
        }
        
        if (this.HookList.ReplaceTile(info)) {
            Terraria.WorldGen['bool ReplaceTile(int x, int y, int targetType, int targetStyle)'
            ].hook((original, x, y, targetType, targetStyle) => {
                const result = original(x, y, targetType, targetStyle);
                if (result) TileLoader.OnReplace(x, y, targetType, targetStyle);
                return result;
            });
        }
        
        if (this.HookList.CanKillTile(info)) {
            Terraria.WorldGen['bool CanKillTile(int i, int j)'
            ].hook((original, i, j) => {
                const canKillTile = TileLoader.CanKillTile(i, j);
                if (canKillTile === false) {
                    return false;
                }
                if (canKillTile === true) {
                    return true;
                }
                return original(i, j);
            });
        }
        
        if (this.HookList.KillTile(info)) {
            Terraria.WorldGen['void KillTile(int i, int j, bool fail, bool effectOnly, bool noItem)'
            ].hook((original, i, j, fail, effectOnly, noItem) => {
                original(i, j, fail, effectOnly, noItem);
                TileLoader.KillTile(i, j, fail, effectOnly, noItem);
            });
        }
        
        if (this.HookList.KillTile_PlaySounds(info)) {
            Terraria.WorldGen['void KillTile_PlaySounds(int i, int j, bool fail, Tile tileCache)'
            ].hook((original, i, j, fail, tile) => {
                if (TileLoader.KillSound(i, j, tile.type, fail) === false) {
                    return;
                }
                original(i, j, fail, tile);
            });
        }
        
        if (this.HookList.KillTile_GetTileDustAmount(info)) {
            Terraria.WorldGen['int KillTile_GetTileDustAmount(bool fail, Tile tileCache)'
            ].hook((original, fail, tile) => {
                const amount = original(fail, tile);
                return TileLoader.GetTileDustAmount(fail, tile, amount);
            });
        }
        
        if (this.HookList.KillTile_MakeTileDust(info)) {
            Terraria.WorldGen['int KillTile_MakeTileDust(int i, int j, Tile tileCache)'
            ].hook((original, i, j, tile) => {
                if (TileLoader.MakeTileDust(i, j, tile)) {
                    return original(i, j, tile);
                }
                return 6000;
            });
        }
        
        if (this.HookList.KillTile_DropItems(info)) {
            Terraria.WorldGen['void KillTile_DropItems(int x, int y, Tile tileCache, bool includeLargeObjectDrops)'
            ].hook((original, i, j, tile, includeLargeObjectDrops) => {
                if (TileLoader.CanDropItems(i, j, tile, includeLargeObjectDrops)) {
                    original(i, j, tile, includeLargeObjectDrops);
                    TileLoader.DropItems(i, j, tile);
                }
            });
        }
        
        if (this.HookList.SlopeTile(info)) {
            Terraria.WorldGen['bool SlopeTile(int i, int j, int slope, bool noEffects, bool quiet)'
            ].hook((original, i, j, slope, noEffects, quiet) => {
                if (!noEffects) {
                    const type = new TileData(i, j).type;
                    if (TileLoader.Slope(i, j, type, slope) === false) {
                        return false;
                    }
                }
                return original(i, j, slope, noEffects, quiet);
            });
        }
        
        if (this.HookList.ShakeTree(info)) {
            Terraria.WorldGen['void ShakeTree(int i, int j)'
            ].hook((original, i, j) => {
                if (Terraria.WorldGen.numTreeShakes === Terraria.WorldGen.maxTreeShakes) {
                    original(i, j);
                    return;
                }
                
                const treeType = Terraria.WorldGen['TreeTypes GetTreeType(int x, int y)'](i, j);
                
                if (TileLoader.PreShakeTree(i, j, treeType)) {
                    original(i, j);
                    TileLoader.ShakeTree(i, j, treeType);
                }
            });
        }
        
        if (this.HookList.SaveAndQuit(info)) {
            Terraria.WorldGen['void SaveAndQuit()'
            ].hook((original) => {
                if (SubworldLoader.AnySubworldActive && !SubworldLoader.Leaving) {
                    SubworldLoader.LeaveSubworld();
                    return;
                }
                SystemLoader.PreSaveAndQuit();
                original();
                SystemLoader.OnWorldUnload();
            });
        }
        
        if (this.HookList.SpawnTownNPC(info)) {
            /*const AchievementsHelper = new NativeClass('Terraria.GameContent.Achievements', 'AchievementsHelper');
            const TownNPCSpawnResult = new NativeClass('Terraria.Enums', 'TownNPCSpawnResult');
            const List = new NativeClass('System.Collections.Generic', 'List`1');
            const Int32 = new NativeClass('System', 'Int32');
            Terraria.WorldGen['TownNPCSpawnResult SpawnTownNPC(int x, int y, bool canSpawnNewTownNPC)'
            ].hook((original, x, y, canSpawnNewTownNPC) => {
                if (Terraria.Main.wallHouse[Terraria.Main.tile.get_Item(x, y).wall])
                    Terraria.WorldGen.canSpawn = true;
                if (!Terraria.WorldGen.canSpawn || !Terraria.WorldGen.StartRoomCheck(x, y, null) || !Terraria.WorldGen.RoomNeeds())
                    return TownNPCSpawnResult.Blocked;
                let index1 = Terraria.WorldGen.prioritizedTownNPCType;
                let index2 = Terraria.WorldGen.FindNPCLookingForHomeThatCanMoveIn(index1);
                
                let hasRoom = Terraria.WorldGen.TownManager._hasRoom[index1];
                let roomPosition1 = hasRoom ? (Array.from(Terraria.WorldGen.TownManager._roomLocationPairs.ToArray()).find(e => e.Item1 === index1)?.Item2 ?? null) : Point.Zero;
                
                let flag1 = Terraria.ID.NPCID.Sets.IsTownPet[index1] && hasRoom;
                if ((Terraria.WorldGen.roomHasStinkbug || Terraria.WorldGen.roomHasEchoStinkbug) && !flag1)
                    return TownNPCSpawnResult.Blocked;
                Terraria.WorldGen.ScoreRoom(-1, index1, null);
                if (Terraria.WorldGen.hiScore <= 0)
                    return TownNPCSpawnResult.Blocked;
                if (Terraria.WorldGen.CheckSpecialTownNPCSpawningConditions(Terraria.WorldGen.prioritizedTownNPCType) && Terraria.NPC.AnyNPCs(Terraria.WorldGen.prioritizedTownNPCType)) {
                    canSpawnNewTownNPC = false;
                } else {
                    index2 = -1;
                    if (canSpawnNewTownNPC) {
                        index1 = Terraria.WorldGen.IsThereASpawnablePrioritizedTownNPC(Terraria.WorldGen.bestX, Terraria.WorldGen.bestY);
                        canSpawnNewTownNPC = index1 > 0;
                    }
                }
                if (index2 !== -1) {
                    Terraria.Main.townNPCCanSpawn[Terraria.WorldGen.prioritizedTownNPCType] = false;
                    Terraria.Main.npc[index2].homeTileX = Terraria.WorldGen.bestX;
                    Terraria.Main.npc[index2].homeTileY = Terraria.WorldGen.bestY;
                    Terraria.Main.npc[index2].homeless = false;
                    Terraria.Main.npc[index2].homelessDespawn = false;
                    AchievementsHelper.NotifyProgressionEvent(8);
                    Terraria.WorldGen.prioritizedTownNPCType = 0;
                    return TownNPCSpawnResult.RelocatedHomeless;
                }
                if (Terraria.NPC.AnyNPCs(Terraria.WorldGen.prioritizedTownNPCType)) 
                    canSpawnNewTownNPC = false;
                if (canSpawnNewTownNPC) {
                    let hasRoom = Terraria.WorldGen.TownManager._hasRoom[index1];
                    let roomPosition2 = hasRoom ? (Array.from(Terraria.WorldGen.TownManager._roomLocationPairs.ToArray()).find(e => e.Item1 === index1)?.Item2 ?? null) : Point.Zero;
                    if (hasRoom && !Terraria.WorldGen.currentlyTryingToUseAlternateHousingSpot) {
                        let bestX = Terraria.WorldGen.bestX;
                        let bestY = Terraria.WorldGen.bestY;
                        Terraria.WorldGen.currentlyTryingToUseAlternateHousingSpot = true;
                        let townNpcSpawnResult = Terraria.WorldGen.SpawnTownNPC(roomPosition2.X, roomPosition2.Y - 2);
                        Terraria.WorldGen.currentlyTryingToUseAlternateHousingSpot = false;
                        Terraria.WorldGen.bestX = bestX;
                        Terraria.WorldGen.bestY = bestY;
                        if (townNpcSpawnResult == TownNPCSpawnResult.Successful)
                            return townNpcSpawnResult;
                    }
                    let spawnTileX = Terraria.WorldGen.bestX;
                    let spawnTileY = Terraria.WorldGen.bestY;
                    let prioritizedTownNpcType = Terraria.WorldGen.prioritizedTownNPCType;
                    if (Terraria.WorldGen.IsRoomConsideredAlreadyOccupied(spawnTileX, spawnTileY, prioritizedTownNpcType)) {
                        return TownNPCSpawnResult.BlockedInfiHousing;
                    }
                    let flag2 = false;
                    if (!flag2) {
                        flag2 = true;
                        let rectangle = Rectangle.new(spawnTileX * 16 + 8 - Terraria.NPC.sWidth / 2 - Terraria.NPC.safeRangeX, spawnTileY * 16 + 8 - Terraria.NPC.sHeight / 2 - Terraria.NPC.safeRangeY, Terraria.NPC.sWidth + Terraria.NPC.safeRangeX * 2, Terraria.NPC.sHeight + Terraria.NPC.safeRangeY * 2);
                        for (let index3 = 0; index3 < 255; index3++) {
                            const checkedPlayer = Terraria.Main.player[index3];
                            if (!checkedPlayer || checkedPlayer.active !== true) continue;
                            const checkedRect = Terraria.PlayerRect(checkedPlayer);
                            if (rectangle['bool Intersects(Rectangle rect)'](checkedRect)) {
                                flag2 = false;
                                break;
                            }
                        }
                    }
                    if (!flag2 && spawnTileY <= Terraria.Main.worldSurface) {
                        for (let index4 = 1; index4 < 500; index4++) {
                            for (let index5 = 0; index5 < 2; index5++) {
                                spawnTileX = index5 != 0 ? Terraria.WorldGen.bestX - index4 : Terraria.WorldGen.bestX + index4;
                                if (spawnTileX > 10 && spawnTileX < Terraria.Main.maxTilesX - 10) {
                                    let num1 = Terraria.WorldGen.bestY - index4;
                                    let num2 = Terraria.WorldGen.bestY + index4;
                                    if (num1 < 10) num1 = 10;
                                    if (num2 > Terraria.Main.worldSurface)
                                        num2 = Terraria.Main.worldSurface;
                                    for (let index6 = num1; index6 < num2; index6++) {
                                        spawnTileY = index6;
                                        const tile = Terraria.Main.tile.get_Item(spawnTileX, spawnTileY);
                                        if (tile.nactive() && Terraria.Main.tileSolid[tile.type]) {
                                            if (!Terraria.Collision['bool SolidTiles(int startX, int endX, int startY, int endY)'](spawnTileX - 1, spawnTileX + 1, spawnTileY - 3, spawnTileY - 1)) {
                                                flag2 = true;
                                                let rectangle = Rectangle.new(spawnTileX * 16 + 8 - Terraria.NPC.sWidth / 2 - Terraria.NPC.safeRangeX, spawnTileY * 16 + 8 - Terraria.NPC.sHeight / 2 - Terraria.NPC.safeRangeY, Terraria.NPC.sWidth + Terraria.NPC.safeRangeX * 2, Terraria.NPC.sHeight + Terraria.NPC.safeRangeY * 2);
                                                const player = Terraria.Main.player[Terraria.Main.myPlayer];
                                                if (player.active && Terraria.PlayerRect(player)['bool Intersects(Rectangle rect)'](rectangle)) {
                                                    flag2 = false;
                                                }
                                                break;
                                            }
                                            break;
                                        }
                                    }
                                }
                                if (flag2) break;
                            }
                            if (flag2) break;
                        }
                    }
                    
                    let index8 = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForTownSpawn(), spawnTileX * 16, spawnTileY * 16, index1, 1, 0, 0, 0, 0, 255);
                    if (index8 === Terraria.Main.maxNPCs && Terraria.Main.npc[index8].type !== index1) {
                        return TownNPCSpawnResult.BlockedTooManyNPCs;
                    }
                    Terraria.Main.townNPCCanSpawn[index1] = false;
                    const npc = Terraria.Main.npc[index8];
                    
                    npc.homeTileX = Terraria.WorldGen.bestX;
                    npc.homeTileY = Terraria.WorldGen.bestY;
                    
                    if (spawnTileX < Terraria.WorldGen.bestX)
                        npc.direction = 1;
                    else if (spawnTileX > Terraria.WorldGen.bestX)
                        npc.direction = -1;
                    
                    npc.netUpdate = true;
                    
                    let fullName = npc.FullName;
                    switch (Terraria.Main.netMode) {
                        case 0:
                            Terraria.Main.NewText(Terraria.Localization.Language.GetText('Announcement.HasArrived').Value.replace('{0}', fullName), 50, 125, 255);
                            break;
                        case 2:
                            //ChatHelper.BroadcastChatMessage(NetworkText.FromKey("Announcement.HasArrived", (object) Main.npc[index5].GetFullNetName()), new Color(50, 125, (int) byte.MaxValue));
                            break;
                    }
                    
                    AchievementsHelper.NotifyProgressionEvent(8);
                    if (npc.type == 160) {
                        AchievementsHelper.NotifyProgressionEvent(18);
                        Terraria.NPC.unlockedTruffleSpawn = true;
                        Terraria.NetMessage.SendData(7, -1, -1, null, 0, 0, 0, 0, 0, 0, 0);
                    }
                    else if (npc.type == 17)
                        Terraria.NPC.unlockedMerchantSpawn = true;
                    else if (npc.type == 207)
                        Terraria.NPC.unlockedDyeTraderSpawn = true;
                    else if (npc.type == 18)
                        Terraria.NPC.unlockedNurseSpawn = true;
                    else if (npc.type == 19)
                        Terraria.NPC.unlockedArmsDealerSpawn = true;
                    else if (npc.type == 38)
                        Terraria.NPC.unlockedDemolitionistSpawn = true;
                    else if (npc.type == 208)
                        Terraria.NPC.unlockedPartyGirlSpawn = true;
                    else if (npc.type == 663)
                        Terraria.NPC.unlockedPrincessSpawn = true;
                    else if (npc.type == 678)
                        Terraria.NPC.unlockedSlimeGreenSpawn = true;
                    
                    Terraria.WorldGen.CheckAchievement_RealEstateAndTownSlimes();
                    Terraria.WorldGen.prioritizedTownNPCType = 0;
                    return TownNPCSpawnResult.Successful;
                }
                Terraria.WorldGen.LastFoundHouse = Point.new(x, y);
                return TownNPCSpawnResult.FoundHouseNoSpawn;
            });*/
            
            Terraria.WorldGen['bool CheckSpecialTownNPCSpawningConditions(int type)'
            ].hook((original, type) => {
                if (NPCLoader.isModType(type)) {
                    if (!(NPCLoader.getModNPC(type)?.CheckConditions(Terraria.WorldGen.roomX1, Terraria.WorldGen.roomX2, Terraria.WorldGen.roomY1, Terraria.WorldGen.roomY2) ?? true)) {
                        return false;
                    }
                    return true;
                }
                return original(type);
            });
            
            const List = new NativeClass('System.Collections.Generic', 'List`1');
            const Int32 = new NativeClass('System', 'Int32');
            Terraria.WorldGen.IsThereASpawnablePrioritizedTownNPC.hook((original, x, y) => {
                let occupantsList = List.makeGeneric(Int32).new();
                occupantsList['void .ctor()']();
                Terraria.WorldGen.TownManager['void AddOccupantsToList(int x, int y, List`1 occupantsList)'](x, y, occupantsList);
                
                 for (let index1 = 0; index1 < occupantsList.Count; ++index1) {
                     let index2 = occupantsList.get_Item(index1);
                     if (Terraria.Main.townNPCCanSpawn[index2] && !Terraria.NPC.AnyNPCs(index2) && Terraria.WorldGen.CheckSpecialTownNPCSpawningConditions(index2)) {
                         return index2;
                     }
                 }
                    
                if (Terraria.WorldGen.TownManager._hasRoom.length < NPCLoader.NPCCount) {
                    Terraria.WorldGen.TownManager._hasRoom = Terraria.WorldGen.TownManager._hasRoom.cloneResized(NPCLoader.NPCCount);
                }
                    
                let num = -1;
                for (let index = 0; index < NPCLoader.NPCCount; ++index) {
                    if (Terraria.Main.townNPCCanSpawn[index] && Terraria.WorldGen.CheckSpecialTownNPCSpawningConditions(index)) {
                        if (Terraria.NPC.AnyNPCs(index)) {
                            Terraria.Main.townNPCCanSpawn[index] = false;
                        } else {
                            if (Terraria.WorldGen.TownManager.HasRoomQuick(index)) {
                                return index;
                            }
                            if (!Terraria.ID.NPCID.Sets.IsTownPet[Terraria.WorldGen.prioritizedTownNPCType] || Terraria.ID.NPCID.Sets.IsTownPet[index]) {
                                num = index;
                            }
                        }
                    }
                }
                return num;
            });
        }
        
        this.initialized = true;
    }
}