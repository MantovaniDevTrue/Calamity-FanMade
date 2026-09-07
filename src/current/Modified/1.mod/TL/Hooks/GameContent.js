import { Terraria, Modules } from './../ModImports.js';
import { NPCHooks } from './NPC.js';
import { CombinedLoader } from './../Loaders/CombinedLoader.js';
import { ItemLoader } from './../Loaders/ItemLoader.js';
import { NPCLoader } from './../Loaders/NPCLoader.js';
import { HairLoader } from './../Loaders/HairLoader.js';
import { NPCHappiness } from './../NPCHappiness.js';

const { Rand, Vector2 } = Modules;
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];

export class GameContentHooks {
    static initialized = false;
    
    // Here you can disable the hooks that won't be used in your mod to avoid unnecessary processing
    static HookList = {
        All: (info) => true,
        Hairs: (info) => info.hasHairs,
        NotifyItemCraft: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers || info.hasAchievements,
        DropItemFromNPC: (info) => info.hasItems || info.hasNPCs || info.hasGlobalNPCs,
        GetShoppingSettings: (info) => info.hasNPCs || info.hasGlobalNPCs,
        TownRoomManager: (info) => info.hasNPCs
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.Hairs(info)) {
            Terraria.GameContent.HairstyleUnlocksHelper['bool ListWarrantsRemake()'
            ].hook((original, self) => {
                let flag = original(self);
                for (const hair of HairLoader.Hairs) {
                    hair._oldIsUnlocked = hair.isUnlocked;
                    hair._isUnlocked = hair.IsUnlocked(self._isAtCharacterCreation, self._isAtStylist) ?? false;
                    if (hair._oldIsUnlocked !== hair._isUnlocked) {
                        flag = true;
                    }
                }
                return flag;
            });
            
            Terraria.GameContent.HairstyleUnlocksHelper['void RebuildList()'
            ].hook((original, self) => {
                original(self);
                const list = self.AvailableHairstyles;
                for (const hair of HairLoader.Hairs) {
                    if (hair.Type >= HairLoader.MAX_VANILLA_ID && hair.Type < HairLoader.HairCount) {
                        if (hair._isUnlocked) list.Add(hair.Type);
                    }
                }
            });
        }
        
        if (this.HookList.NotifyItemCraft(info)) {
            Terraria.GameContent.Achievements.AchievementsHelper['void NotifyItemCraft(Recipe recipe)'
            ].hook((original, recipe) => {
                original(recipe);
                CombinedLoader.OnCraft(recipe.createItem, Terraria.Main.player[Terraria.Main.myPlayer], recipe);
            });
        }
        
        if (this.HookList.DropItemFromNPC(info)) {
            Terraria.GameContent.ItemDropRules.CommonCode['void DropItemFromNPC(NPC npc, int itemId, int stack, bool scattered)'
            ].hook((original, npc, itemId, stack, scattered) => {
                if (!ItemLoader.isModType(itemId)) {
                    original(npc, itemId, stack, scattered);
                    return;
                }
                
                let X = Math.floor(npc.position.X + npc.width / 2);
                let Y = Math.floor(npc.position.Y + npc.height / 2);
                
                if (scattered) {
                    X = Math.floor(npc.position.X + Rand.Next(npc.width + 1));
                    Y = Math.floor(npc.position.Y + Rand.Next(npc.height + 1));
                }
                
                let itemIndex = NewItem(X, Y, 0, 0, itemId, stack, false, -1, false);
                
                NPCLoader.ModifyItemDropFromNPC(npc, itemIndex);
            });
            
            Terraria.GameContent.ItemDropRules.CommonCode['void DropItemLocalPerClientAndSetNPCMoneyTo0(NPC npc, int itemId, int stack, bool interactionRequired)'
            ].hook((original, npc, itemId, stack, interactionRequired) => {
                if (!ItemLoader.isModType(itemId)) {
                    original(npc, itemId, stack, interactionRequired);
                    return;
                }
                
                if (Terraria.Main.netMode === 2) {
                    let itemSlot = NewItem(npc.position.X, npc.position.Y, npc.width, npc.height, itemId, stack, true, -1, false);
                    Terraria.Main.timeItemSlotCannotBeReusedFor[itemSlot] = 54000;
                    for (let rc = 0; rc < 255; rc++) {
                        if (Terraria.Main.player[rc].active && (npc.playerInteraction[rc] || !interactionRequired)) {
                            Terraria.NetMessage.SendData(90, rc, -1, null, itemSlot, 0, 0, 0, 0, 0, 0);
                        }
                        Terraria.Main.item[itemSlot].active = false;
                    }
                } else {
                    Terraria.GameContent.ItemDropRules.CommonCode.DropItemFromNPC(npc, itemId, stack, false);
                }
                
                npc.value = 0.0;
            });
        }
        
        if (this.HookList.GetShoppingSettings(info)) {
            Terraria.GameContent.ShopHelper['ShoppingSettings GetShoppingSettings(Player player, NPC npc)'
            ].hook((original, self, player, npc) => {
                const shoppingSettings = Terraria.ShoppingSettings.new();
                shoppingSettings.PriceAdjustment = 1.0;
                shoppingSettings.HappinessReport = '';
                
                self._currentNPCBeingTalkedTo = npc;
                self._currentPlayerTalking = player;
                
                self.ProcessMood(player, npc);
                
                shoppingSettings.PriceAdjustment = self._currentPriceAdjustment;
                shoppingSettings.HappinessReport = self._currentHappiness;
                
                return shoppingSettings;
            });
            
            const List = new NativeClass('System.Collections.Generic', 'List`1');
            const NPCType = new NativeClass('Terraria', 'NPC');
            Terraria.GameContent.ShopHelper['void ProcessMood(Player player, NPC npc)'
            ].hook((original, self, player, npc) => {
                self._currentHappiness = '';
                self._currentPriceAdjustment = 1.0;
                if (npc.loveStruck) {
                    self._currentPriceAdjustment *= 0.9;
                }
                if (npc.type == 368) {
                    self._currentPriceAdjustment = 1.0;
                } else if (npc.type == 453) {
                    self._currentPriceAdjustment = 1.0;
                } else {
                    if (npc.type == 656 || npc.type == 637 || npc.type == 638) return;
                    if (self.IsNotReallyTownNPC(npc)) {
                        self._currentPriceAdjustment = 1.0;
                    } else {
                        const isModType = NPCLoader.isModType(npc.type);
                        if (isModType) {
                            if (npc.homeless) {
                                NPCHappiness.AddHappinessReportText(self, 'NoHome');
                                self._currentPriceAdjustment = 1000;
                            } else {
                                if (Vector2.Distance(Vector2.new(npc.homeTileX, npc.homeTileY), Vector2.new(npc.Center.X / 16, npc.Center.Y / 16)) > 120.0) {
                                    NPCHappiness.AddHappinessReportText('FarFromHome');
                                    self._currentPriceAdjustment = 1000;
                                }
                            }
                            let isInEvilBiome = false;
                            if (player.ZoneCorrupt) {
                                NPCHappiness.AddHappinessReportText(self, 'HateBiome', Terraria.GameContent.ShopHelper.BiomeNameByKey('Corruption'))
                                isInEvilBiome = true;
                            } else if (player.ZoneCrimson) {
                                NPCHappiness.AddHappinessReportText(self, 'HateBiome', Terraria.GameContent.ShopHelper.BiomeNameByKey('Crimson'))
                                isInEvilBiome = true;
                            } else if (player.ZoneDungeon) {
                                NPCHappiness.AddHappinessReportText(self, 'HateBiome', Terraria.GameContent.ShopHelper.BiomeNameByKey('Dungeon'))
                                isInEvilBiome = true;
                            }
                            if (isInEvilBiome) {
                                self._currentPriceAdjustment = 1000;
                            }
                        } else {
                            if (self.RuinMoodIfHomeless(npc)) {
                                self._currentPriceAdjustment = 1000;
                            } else if (self.IsFarFromHome(npc)) {
                                self._currentPriceAdjustment = 1000;
                            }
                            if (self.IsPlayerInEvilBiomes(player)) {
                                self._currentPriceAdjustment = 1000;
                            }
                        }
                        
                        let npcsWithinHouse = 0;
                        let npcsWithinVillage = 0;
                        
                        function GetNearbyResidentNPCs(npc) {
                            const NpcList = List.makeGeneric(NPCType);
                            const list = NpcList.new();
                            list['void .ctor()']();
                            let vector2_1 = Vector2.new(npc.homeTileX, npc.homeTileY);
                            if (npc.homeless) {
                                vector2_1 = Vector2.new(npc.Center.X / 16, npc.Center.Y / 16);
                            }
                            for (let index = 0; index < 200; ++index) {
                                if (index != npc.whoAmI) {
                                    let npc1 = Terraria.Main.npc[index];
                                    if (npc1.active && npc1.townNPC && !self.IsNotReallyTownNPC(npc1) && !Terraria.WorldGen.TownManager.CanNPCsLiveWithEachOther_ShopHelper(npc, npc1)) {
                                        let vector2_2 = Vector2.new(npc1.homeTileX, npc1.homeTileY);
                                        if (npc1.homeless) {
                                            vector2_2 = Vector2.new(npc1.Center.X / 16, npc1.Center.Y / 16);
                                        }
                                        let num = Vector2.Distance(vector2_1, vector2_2);
                                        if (num < 25.0) {
                                            list.Add(npc1);
                                            ++npcsWithinHouse;
                                        } else if (num < 120.0) {
                                            ++npcsWithinVillage;
                                        }
                                    }
                                }
                            }
                            return list;
                        }
                        
                        let nearbyResidentNpcs = GetNearbyResidentNPCs(npc);
                        
                        if (npcsWithinHouse > 2) {
                            for (let index = 2; index < npcsWithinHouse + 1; ++index) {
                                self._currentPriceAdjustment *= 1.04;
                            }
                            if (npcsWithinHouse > 4) {
                                if (isModType) {
                                    NPCHappiness.AddHappinessReportText(self, 'HateCrowded');
                                } else {
                                    self.AddHappinessReportText('HateCrowded', null);
                                }
                            } else {
                                if (isModType) {
                                    NPCHappiness.AddHappinessReportText(self, 'DislikeCrowded');
                                } else {
                                    self.AddHappinessReportText('DislikeCrowded', null);
                                }
                            }
                        }
                        
                        if (npcsWithinHouse < 2 && npcsWithinVillage < 4) {
                            if (isModType) {
                                NPCHappiness.AddHappinessReportText(self, 'LoveSpace');
                            } else {
                                self.AddHappinessReportText('LoveSpace', null);
                            }
                            self._currentPriceAdjustment *= 0.9;
                        }
                        
                        let flagArray = Array(NPCLoader.NPCCount).fill(false).makeGeneric('bool');
                        let npcListArray = Array.from(nearbyResidentNpcs.ToArray());
                        for (const _npc of npcListArray) {
                            let _type = NPCHooks.realTypes[_npc.whoAmI] ?? _npc.type;
                            flagArray[_type] = true;
                        }
                        
                        const info = Terraria.GameContent.Personalities.HelperInfo.new();
                        info.player = player;
                        info.npc = npc;
                        info.NearbyNPCs = nearbyResidentNpcs;
                        info.nearbyNPCsByType = flagArray;
                        
                        const PrimaryPlayerBiome = player.ZoneDungeon ? 8
                        : player.ZoneCorrupt ? 9
                        : player.ZoneCrimson ? 10
                        : player.ZoneGlowshroom ? 7
                        : player.ZoneHallow ? 6
                        : player.ZoneJungle ? 4
                        : player.ZoneSnow ? 2
                        : player.ZoneBeach ? 5
                        : player.ZoneDesert ? 3
                        : Terraria.PlayerPositionY(player) > Terraria.Main.worldSurface * 16.0 ? 1 : 0;
                        
                        if (!isModType) Terraria.GameContent.Personalities.AllPersonalitiesModifier.new().ModifyShopPrice(info, self);
                        else NPCHappiness.ModifyShopPrice(info, PrimaryPlayerBiome, self);
                        
                        NPCLoader.ModifyNPCHappiness(npc, player, PrimaryPlayerBiome, self, flagArray);
                        
                        if (self._currentHappiness == '') {
                            if (isModType) {
                                NPCHappiness.AddHappinessReportText(self, 'Content');
                            } else {
                                self.AddHappinessReportText('Content', null);
                            }
                        }
                        
                        self._currentPriceAdjustment = self.LimitAndRoundMultiplier(self._currentPriceAdjustment);
                    }
                }
            });
        }
        
        if (this.HookList.TownRoomManager(info)) {
            Terraria.GameContent.TownRoomManager['void Load(BinaryReader reader)'
            ].hook((original, self, reader) => {
                Terraria.Main.townNPCCanSpawn = Terraria.Main.townNPCCanSpawn.cloneResized(NPCLoader.NPCCount);
                Terraria.WorldGen.TownManager._hasRoom = Terraria.WorldGen.TownManager._hasRoom.cloneResized(NPCLoader.NPCCount);
                original(self, reader);
            });
        }
        
        this.initialized = true;
    }
}