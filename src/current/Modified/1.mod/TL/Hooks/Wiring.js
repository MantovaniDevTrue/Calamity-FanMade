import { Terraria, Modules } from './../ModImports.js';
import { NPCLoader } from './../Loaders/NPCLoader.js';
import { TileLoader } from './../Loaders/TileLoader.js';
import { TileData } from './../Modules/TileData.js';

const { Vector2 } = Modules;

export class WiringHooks {
    static initialized = false;
    
    // Here you can disable the hooks that won't be used in your mod to avoid unnecessary processing
    static HookList = {
        All: (info) => true,
        HitWireSingle: (info) => info.hasGlobalTiles,
        CheckMech: (info) => info.hasNPCs || info.hasGlobalNPCs
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.HitWireSingle(info)) {
            Terraria.Wiring['void HitWireSingle(int i, int j)'
            ].hook((original, i, j) => {
                const type = new TileData(i, j).type;
                if (TileLoader.PreHitWire(i, j, type)) {
                    original(i, j);
                    TileLoader.HitWire(i, j, type);
                }
            });
        }
        
        if (this.HookList.CheckMech(info)) {
            Terraria.Wiring['bool CheckMech(int i, int j, int time)'
            ].hook((original, i, j, time) => {
                let result = original(i, j ,time);
                if (result) {
                    const tileCache = new TileData(i, j);
                    if (tileCache.type === 105) {
                        let fx = tileCache.frameX;
                        let fy = tileCache.frameY;
                        let style = fx / 36 + (fy / 54 % 3) * 55;
                        if (style < 40 || style > 41) return result;
                        
                        let numArray = [];
                        for (let i = 0; i < 200; i++) {
                            if (numArray.length >= 50) break;
                            
                            const npc = Terraria.Main.npc[i];
                            if (!npc.active) continue;
                            
                            // King Statue
                            if (style === 40) {
                                let canGo = NPCLoader.CanGoToStatue(npc, true);
                                if (canGo) {
                                    numArray.push(i);
                                } else if (canGo !== false) {
                                    if (NPCLoader.KingStatueNPCs.has(npc.type)) {
                                        numArray.push(i);
                                    }
                                }
                                continue;
                            }
                            
                            // Queen Statue
                            if (style === 41) {
                                let canGo = NPCLoader.CanGoToStatue(npc, false);
                                if (canGo) {
                                    numArray.push(i);
                                } else if (canGo !== false) {
                                    if (NPCLoader.QueenStatueNPCs.has(npc.type)) {
                                        numArray.push(i);
                                    }
                                }
                            }
                        }
                        
                        if (numArray.length > 0) {
                            let selectedIndex = numArray[Math.floor(Math.random()*numArray.length)];
                            let selectedNPC = Terraria.Main.npc[selectedIndex];
                            let X = i * 16 + 16;
                            let Y = (j + 3) * 16;
                            selectedNPC.position = Vector2.new(X - selectedNPC.width / 2, Y - selectedNPC.height - 1);
                            NPCLoader.OnGoToStatue(selectedNPC, style === 40);
                            Terraria.NetMessage.SendData(23, -1, -1, Terraria.Localization.NetworkText.Empty, selectedIndex, 0.0, 0, 0, 0, 0, 0);
                        }
                    }
                }
                return result;
            });
        }
        
        this.initialized = true;
    }
}