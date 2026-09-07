import { Terraria, Microsoft, Modules, System } from './../ModImports.js';
import { PlayerLoader } from './../Loaders/PlayerLoader.js';
import { BuffLoader } from './../Loaders/BuffLoader.js';
import { NPCLoader } from './../Loaders/NPCLoader.js';
import { CombinedLoader } from './../Loaders/CombinedLoader.js';
import { NPCSpawnInfo } from './../NPCSpawnInfo.js';

const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const { Rectangle, Vector2 } = Modules;

function NativeBool(value) {
    if (value === true) return true;
    if (value === false || value == null) return false;
    try { const n = Number(value); if (Number.isFinite(n)) return n !== 0; } catch (e) { }
    return String(value).toLowerCase() === 'true';
}

export class NPCHooks {
    static initialized = false;
    static LoadedTypes = new Set();
    
    // Here you can disable the hooks that won't be used in your mod to avoid unnecessary processing
    static HookList = {
        All: (info) => info.hasNPCs || info.hasGlobalNPCs || info.hasPlayers,
        SetDefaults: (info) => info.hasNPCs || info.hasGlobalNPCs,
        DrawNPCs: (info) => info.hasNPCs,
        CheckActive: (info) => info.hasNPCs || info.hasGlobalNPCs,
        CheckDead: (info) => info.hasNPCs || info.hasGlobalNPCs,
        NPCLoot: (info) => info.hasNPCs || info.hasGlobalNPCs,
        BossHeadSlot: (info) => info.hasNPCs,
        BossHeadRotation: (info) => info.hasNPCs,
        AI: (info) => info.hasNPCs || info.hasGlobalNPCs,
        GetAlpha: (info) => NPCLoader.hasAnyHandlers('GetAlpha'),
        TypeToDefaultHeadIndex: (info) => info.hasNPCs,
        CatchNPC: (info) => info.hasNPCs || info.hasGlobalNPCs || info.hasPlayers,
        ReleaseNPC: (info) => info.hasPlayers,
        AddBuff: (info) => info.hasBuffs,
        UpdateNPC_BuffApplyDOTs: (info) => NPCLoader.hasAnyHandlers('UpdateLifeRegen'),
        UpdateNPC_BuffSetFlags: (info) => info.hasBuffs && false, // lag
        HitEffect: (info) => NPCLoader.hasAnyHandlers('HitEffect'),
        Collision_DecideFallThroughPlatforms: (info) => NPCLoader.hasHandlers('CanFallThroughPlatforms'),
        GetChat: (info) => info.hasNPCs || info.hasGlobalNPCs,
        getNewNPCName: (info) => NPCLoader.hasAnyHandlers('SetNPCNameList'),
        GetShimmered: (info) => info.hasNPCs,
        UsesPartyHat: (info) => info.hasNPCs,
        GUINPCDialogue: (info) => info.hasNPCs,
        SpawnNPC: (info) => info.hasNPCs,
        OnSpawn: (info) => NPCLoader.hasAnyHandlers('OnSpawn'),
        SetupShop: (info) => NPCLoader.hasAnyHandlers('SetupShop') || NPCLoader.hasAnyHandlers('PostSetupShop')
    };
    
    static realTypes = {};
    static NPCsToDraw_BehindTiles = new Set();
    static NPCsToDraw_OverTiles = new Set();
    
    // These NPCs usually appear in large numbers and can cause lag.
    static BlackListedNPCs = new Set([
        135, 136 // destroyer
    ]);
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.SetDefaults(info)) {
            Terraria.NPC['void SetDefaults(int Type, NPCSpawnParams spawnparams)'
            ].hook((original, self, type, spawnparams) => {
                original(self, type, spawnparams);
                const isCalamityNPC = NPCLoader.isModType(type);
                if (isCalamityNPC && self.buffImmune.length !== BuffLoader.BuffCount) {
                    self.buffImmune = self.buffImmune.cloneResized(BuffLoader.BuffCount);
                }
                
                if (!isCalamityNPC) {
                    if (NPCLoader.HasGlobalCallback('SetDefaults')) NPCLoader.SetDefaults(self);
                    return;
                }
                
                if (Terraria.Main.npcCatchable[self.type]) {
                    self.catchableNPCTempImmunityCounter = 90;
                    self.friendly = true;
                }
            });
            
            Terraria.NPC['void ScaleStats(Nullable`1 activePlayersCount, Nullable`1 strengthOverride)'
            ].hook((original, self, activePlayersCount, strengthOverride) => {
                if (NPCLoader.isModType(self.type)) {
                    if (self.buffImmune.length !== BuffLoader.BuffCount) self.buffImmune = self.buffImmune.cloneResized(BuffLoader.BuffCount);
                    const npc = NPCLoader.getModNPC(self.type);
                    npc.SetDefaults(self);
                    try {
                        Object.assign(self, npc.NPC);
                    } catch (error) {
                        throw new Error(`SetDefaults failed for npc <${npc.constructor.name}>, error: ${error}`);
                    }
                    
                    self.life = self.lifeMax;
                    self.defDamage = self.damage;
                    self.defDefense = self.defense;
                    self.defLifeMax = self.lifeMax;
                    self.netID = self.type;
                    
                    npc.ApplyBuffImmunity(self);
                    
                    if (npc.ScaleStats(self, activePlayersCount, strengthOverride) === false) return;
                }
                original(self, activePlayersCount, strengthOverride);
            });
        }
        
        if (this.HookList.DrawNPCs(info)) {
            Terraria.Main['void DrawNPCs(bool behindTiles)'
            ].hook((original, self, behindTiles) => {
                original(self, behindTiles);
                
                const drawBehindTiles = NativeBool(behindTiles);
                const drawNpcs = drawBehindTiles ? NPCHooks.NPCsToDraw_BehindTiles : NPCHooks.NPCsToDraw_OverTiles;
                
                const npcArray = Terraria.Main.npc;
                const DrawNPCDirect = Terraria.Main.instance['void DrawNPCDirect(SpriteBatch mySpriteBatch, NPC rCurrentNPC, bool behindTiles, Vector2 screenPos)'];
                const screenPosition = Terraria.Main.screenPosition;
                const spriteBatch = Terraria.Main.spriteBatch;
                // ExMod 1.7.1 draw hot-path: cache asset arrays and skip custom JS draw work for off-screen NPCs.
                // Keep our NativeBool conversion and existing draw-set lifecycle because those are TLPro/mobile-specific fixes.
                const npcAssets = Terraria.GameContent.TextureAssets.Npc;
                const extraAssets = Terraria.GameContent.TextureAssets.Extra;
                const sX = screenPosition.X, sY = screenPosition.Y;
                const sW = Terraria.Main.screenWidth, sH = Terraria.Main.screenHeight;
                
                globalThis.__TLProCurrentNPCBehindTilesPass = drawBehindTiles;
                for (const npcIndex of drawNpcs) {
                    const npc = npcArray[npcIndex];
                    if (!npc.active) {
                        if (drawBehindTiles) NPCHooks.NPCsToDraw_BehindTiles.delete(npcIndex);
                        else NPCHooks.NPCsToDraw_OverTiles.delete(npcIndex);
                        continue;
                    }
                    const pos = npc.position;
                    const x = pos.X, y = pos.Y;
                    if (x + npc.width < sX || x >= sX + sW || y + npc.height < sY || y >= sY + sH) continue;
                    if (NPCLoader.PreDraw(npc, spriteBatch, screenPosition)) {
                        let originalTexture = null;
                        
                        let altTextureIndex = npc.townNPC ? NPCLoader.GetAltTextureIndex(npc) : -1;
                        if (altTextureIndex !== -1) {
                            originalTexture = npcAssets[npc.type];
                            npcAssets[npc.type] = extraAssets[altTextureIndex];
                        }
                        
                        DrawNPCDirect(spriteBatch, npc, behindTiles, screenPosition);
                        
                        if (originalTexture != null) npcAssets[npc.type] = originalTexture;
                        NPCLoader.PostDraw(npc, spriteBatch, screenPosition);
                    }
                }
                globalThis.__TLProCurrentNPCBehindTilesPass = null;
            });
            
            Terraria.NPC['void FindFrame()'
            ].hook((original, self) => {
                // Vanilla Code
                if (!NPCLoader.isModType(self.type)) {
                    original(self);
                    return;
                }
                
                let frameHeight = 1;
                if (!Terraria.Main.dedServ) {
                    if (!Terraria.GameContent.TextureAssets.Npc[self.type].IsLoaded)
                        return;
                    frameHeight = Terraria.GameContent.TextureAssets.Npc[self.type].Value.Height / Terraria.Main.npcFrameCount[self.type];
                }
                
                // AnimationType
                const modnpc = NPCLoader.getModNPC(self.type);
                if (modnpc && modnpc.AnimationType > 0) {
                    const isTownNPC = self.townNPC;
                    const oldTexture = Terraria.GameContent.TextureAssets.Npc[modnpc.AnimationType];
                    if (!isTownNPC) Terraria.GameContent.TextureAssets.Npc[modnpc.AnimationType] = Terraria.GameContent.TextureAssets.Npc[modnpc.Type];
                    self.type = modnpc.AnimationType;
                    if (!this.LoadedTypes.has(modnpc.AnimationType)) {
                        Terraria.Main.instance.LoadNPC(modnpc.AnimationType);
                        this.LoadedTypes.add(modnpc.AnimationType);
                    }
                    original(self);
                    self.type = modnpc.Type;
                    if (!isTownNPC) Terraria.GameContent.TextureAssets.Npc[modnpc.AnimationType] = oldTexture;
                    NPCLoader.FindFrame(self, frameHeight);
                    return;
                }
                
                // FindFrame
                const newPos = self.position;
                newPos.X + self.netOffset.X;
                newPos.Y + self.netOffset.Y;
                self.position = newPos;
                
                NPCLoader.FindFrame(self, frameHeight);
            });
        }
        
        if (this.HookList.CheckActive(info)) {
            Terraria.NPC['void CheckActive()'
            ].hook((original, self) => {
                const isModNPC = NPCLoader.isModType(self.type);
                if (this.BlackListedNPCs.has(self.type) || !isModNPC) {
                    original(self);
                    if (self.active && self.boss) NPCLoader.AnyBossActive = true;
                    return;
                }

                if (NPCLoader.CheckActive(self)) original(self);

                if (self.active) {
                    if (self.boss) {
                        NPCLoader.AnyBossActive = true;
                        NPCLoader.ActiveBoss = self.type;
                    }
                    if (NativeBool(self.behindTiles)) {
                        NPCHooks.NPCsToDraw_OverTiles.delete(self.whoAmI);
                        NPCHooks.NPCsToDraw_BehindTiles.add(self.whoAmI);
                    } else {
                        NPCHooks.NPCsToDraw_BehindTiles.delete(self.whoAmI);
                        NPCHooks.NPCsToDraw_OverTiles.add(self.whoAmI);
                    }
                }
            });
        }

        if (this.HookList.CheckDead(info)) {
            Terraria.NPC['void checkDead()'
            ].hook((original, self) => {
                if (NPCHooks.BlackListedNPCs.has(self.type) || !NPCLoader.isModType(self.type)) {
                    original(self);
                    return;
                }

                if (NPCLoader.CheckDead(self)) {
                    if (!self.active || (self.realLife >= 0 && self.realLife !== self.whoAmI) || self.life > 0) {
                        original(self);
                        return;
                    }
                    if (NPCLoader.PreKill(self)) original(self);
                    else self.active = false;
                }
            });
        }

        if (this.HookList.NPCLoot(info)) {
            Terraria.NPC['void NPCLoot()'
            ].hook((original, self) => {
                original(self);
                if (!NPCLoader.isModType(self.type)) return;
                
                if (Terraria.Main.netMode === 1) return;
                
                const closestPlayer = Terraria.Main.player[Terraria.Main.myPlayer];
                
                self.CountKillForAchievements();
                if (self.GetWereThereAnyInteractions()) {
                    if (self.IsNPCValidForBestiaryKillCredit()) {
                        Terraria.Main.BestiaryTracker.Kills.RegisterKill(self);
                    }
                    self.CountKillForBannersAndDropThem();
                }
                
                if (self.SpawnedFromStatue && ((Terraria.ID.NPCID.Sets.NoEarlymodeLootWhenSpawnedFromStatue[self.type] && !Terraria.Main.hardMode) || (Terraria.ID.NPCID.Sets.StatueSpawnedDropRarity[self.type] !== -1 && (Terraria.Main.rand['float NextFloat()']() >= Terraria.ID.NPCID.Sets.StatueSpawnedDropRarity[self.type] || !self.AnyInteractions())))) {
                    return;
                }
                
                let canDrop = false;
                if (NPCLoader.BeforeLoot(self, closestPlayer)) {
                    canDrop = true;
                    self.NPCLoot_DropItems(closestPlayer);
                }
                NPCLoader.OnKill(self);
                
                if (self.boss) {
                    // DropBossPotionsAndHearts
                    if (canDrop) {
                        const Next = Terraria.Main.rand['int Next(int minValue, int maxValue)'];
                        let Stack = Next(5, 16);
                        let Type = NPCLoader.BossLoot(self, 28);
                        Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'
                        ](self.position.X, self.position.Y, self.width, self.height, Type, Stack, false, 0, false);
                        let num = Next(0, 5) + 5;
                        for (let i = 0; i < num; i++) {
                            Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'
                            ](self.position.X, self.position.Y, self.width, self.height, 58, 1, false, 0, false);
                        }
                    }
                    
                    // CelebrateBossDeath
                    if (Terraria.Main.netMode == 0) {
                        const modNPC = NPCLoader.getModNPC(self.type);
                        if (modNPC) {
                            if (typeof modNPC.DeathMessage === 'function') {
                                const deathMessage = modNPC.DeathMessage(self);
                                if (deathMessage) {
                                    const msgColor = modNPC.DeathMessageColor(self);
                                    NewText(deathMessage, msgColor?.R ?? 175, msgColor?.G ?? 75, msgColor?.B ?? 255);
                                }
                            }
                        }
                    }
                }
                
                // Notify NPC Death
                if (self.townNPC) {
                    if (Terraria.Main.netMode == 0) {
                        const modNPC = NPCLoader.getModNPC(self.type);
                        if (modNPC && typeof modNPC.DeathMessage === 'function') {
                            const deathMessage = modNPC.DeathMessage(self);
                            if (deathMessage) {
                                const msgColor = modNPC.DeathMessageColor(self);
                                NewText(deathMessage, msgColor?.R ?? 255, msgColor?.G ?? 25, msgColor?.B ?? 25);
                            }
                        }
                    }
                }
                
                self.NPCLoot_DropMoney(closestPlayer);
                if (NPCLoader.DropHeals(self, closestPlayer)) {
                    self.NPCLoot_DropCommonLifeAndMana(closestPlayer);
                }
            });
        }
        
        if (this.HookList.BossHeadSlot(info)) {
            Terraria.NPC['int GetBossHeadTextureIndex()'
            ].hook((original, self) => {
                if (!NPCLoader.isModType(self.type)) return original(self);
                return NPCLoader.BossHeadSlot(self) ?? original(self);
            });
        }
        
        if (this.HookList.BossHeadRotation(info)) {
            Terraria.NPC['float GetBossHeadRotation()'
            ].hook((original, self) => {
                if (!NPCLoader.isModType(self.type)) return original(self);
                return NPCLoader.BossHeadRotation(self) ?? original(self);
            });
        }
        
        if (this.HookList.AI(info)) {
            Terraria.NPC['void AI()'
            ].hook((original, self) => {
                if (NPCHooks.BlackListedNPCs.has(self.type) || !NPCLoader.isModType(self.type)) {
                    original(self);
                    return;
                }

                const modNPC = NPCLoader.getModNPC(self.type);
                if (NPCLoader.PreAI(self)) {
                    let oldType = 0;
                    const overrideAI = modNPC?.AIType ?? 0;
                    if (overrideAI > 0) {
                        NPCHooks.realTypes[self.whoAmI] = self.type;
                        oldType = self.type;
                        self.type = overrideAI;
                    }
                    original(self);
                    if (oldType) {
                        delete NPCHooks.realTypes[self.whoAmI];
                        self.type = oldType;
                    } else if (self.aiStyle == 7) {
                        const attackType = Terraria.ID.NPCID.Sets.AttackType[self.type];
                        const attackFrame = attackType === 0 ? 10.0
                            : attackType === 1 ? 12.0
                            : attackType === 2 ? 14.0
                            : attackType === 3 ? 15.0 : -1;
                        if (attackFrame >= 0 && self.ai[0] == attackFrame) {
                            modNPC?.TownNPCAttack(
                                self,
                                self.ai[1] === Terraria.ID.NPCID.Sets.AttackTime[self.type],
                                self.ai[1]
                            );
                        }
                    }
                    NPCLoader.AI(self);
                }
                NPCLoader.PostAI(self);
            });
        }

        if (this.HookList.GetAlpha(info)) {
            Terraria.NPC['Color GetAlpha(Color newColor)'
            ].hook((original, self, newColor) => {
                if (NPCHooks.BlackListedNPCs.has(self.type) || !NPCLoader.isModType(self.type))
                    return original(self, newColor);
                return original(self, NPCLoader.GetAlpha(self, newColor));
            });
        }
        
        if (this.HookList.TypeToDefaultHeadIndex(info)) {
            Terraria.NPC['int TypeToDefaultHeadIndex(int type)'
            ].hook((original, type) => {
                return NPCLoader.NPCHeadSlot(type) ?? original(type);
            });
        }
        
        if (this.HookList.CatchNPC(info)) {
            Terraria.NPC['void CatchNPC(int i, int who)'
            ].hook((original, npcIndex, playerIndex) => {
                const npc = Terraria.Main.npc[npcIndex];
                const player = Terraria.Main.player[playerIndex];
                if (!npc || !npc.active) return;
                if (!CombinedLoader.CanCatchNPC(player, npc, player.inventory[player.selectedItem])) return;
                if (Terraria.Main.netMode == 1) {
                    npc.active = false;
                    Terraria.NetMessage.SendData(70, -1, -1, Terraria.Localization.NetworkText.Empty, npcIndex, playerIndex, 0, 0, 0, 0, 0);
                } else {
                    if (npc.catchItem <= 0) return;
                    if (npc.SpawnedFromStatue) {
                        let position = Vector2.new(npc.Center.X - 20, npc.Center.Y);
                        Terraria.Utils.PoofOfSmoke(position);
                        CombinedLoader.OnCatchNPC(player, npc, player.inventory[player.selectedItem], true);
                        Terraria.NetMessage.SendData(23, -1, -1, Terraria.Localization.NetworkText.Empty, npcIndex, 0, 0, 0, 0, 0, 0);
                        Terraria.NetMessage.SendData(106, -1, -1, Terraria.Localization.NetworkText.Empty, Math.floor(position.X), position.Y, 0, 0, 0, 0, 0);
                    } else {
                        Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'
                        ](Terraria.PlayerCenterX(player), Terraria.PlayerCenterY(player), 0, 0, npc.catchItem, 1, false, 0, true);
                        npc.active = false;
                        Terraria.NetMessage.SendData(23, -1, -1, Terraria.Localization.NetworkText.Empty, npcIndex, 0, 0, 0, 0, 0, 0);
                        CombinedLoader.OnCatchNPC(player, npc, player.inventory[player.selectedItem], false);
                    }
                }
            });
        }
        
        if (this.HookList.ReleaseNPC(info)) {
            Terraria.NPC['int ReleaseNPC(int x, int y, int Type, int Style, int who)'
            ].hook((original, x, y, type, style, playerIndex) => {
                const player = Terraria.Main.player[playerIndex];
                const item = player.inventory[player.selectedItem];
                let result = -1;
                if (PlayerLoader.CanReleaseNPC(player, type, item, x, y)) {
                    result = original(x, y, type, style, playerIndex);
                }
                if (result !== -1) {
                    PlayerLoader.OnReleaseNPC(player, Terraria.Main.npc[result]);
                }
                return result;
            });
        }
        
        if (this.HookList.AddBuff(info)) {
            Terraria.NPC['void AddBuff(int type, int time, bool quiet)'
            ].hook((original, self, buffType, buffTime, quiet) => {
                // Vanilla/foreign NPCs only pay the managed-array resize when a custom
                // buff is actually applied, instead of on every NPC SetDefaults/ScaleStats.
                if (BuffLoader.isModType(buffType) && self.buffImmune.length !== BuffLoader.BuffCount) {
                    self.buffImmune = self.buffImmune.cloneResized(BuffLoader.BuffCount);
                }
                const currentIndex = self.FindBuffIndex(buffType);
                if (currentIndex >= 0) {
                    if (BuffLoader.ReApplyNPC(self, buffTime, currentIndex)) {
                        original(self, buffType, buffTime, quiet);
                        return;
                    }
                }
                original(self, buffType, buffTime, quiet);
                if (self.FindBuffIndex(buffType) >= 0) {
                    BuffLoader.ApplyNPC(self, buffType, buffTime);
                }
            });
        }
        
        if (this.HookList.UpdateNPC_BuffApplyDOTs(info)) {
            Terraria.NPC['void UpdateNPC_BuffApplyDOTs()'
            ].hook((original, self) => {
                original(self);
                if (this.BlackListedNPCs.has(self.type) || !NPCLoader.isModType(self.type)) return;
                if (self.dontTakeDamage) return;
                NPCLoader.UpdateLifeRegen(self, self.lifeRegenExpectedLossPerSecond);
            });
        }
        
        if (this.HookList.UpdateNPC_BuffSetFlags(info)) {
            Terraria.NPC['void UpdateNPC_BuffSetFlags(bool lowerBuffTime)'
            ].hook((original, self, lowerBuffTime) => {
                original(self, lowerBuffTime);
                
                if (!NPCHooks.BlackListedNPCs.has(self.type)) {
                    const buffType = self.buffType;
                    const buffTime = self.buffTime;
                    const maxBuffs = buffType.length;
                    for (let i = 0; i < maxBuffs; i++) {
                        if (buffType[i] > 0 && buffTime[i] > 0 && BuffLoader.isModType(buffType[i])) {
                            BuffLoader.UpdateNPC(self, i);
                        }
                    }
                }
            });
        }
        
        if (this.HookList.HitEffect(info)) {
            Terraria.NPC['void HitEffect(int hitDirection, double dmg)'
            ].hook((original, self, hitDirection, dmg) => {
                original(self, hitDirection, dmg);
                if (NPCLoader.isModType(self.type) || NPCLoader.HasGlobalCallback('HitEffect')) {
                    NPCLoader.HitEffect(self, hitDirection, dmg);
                }
            });
        }
        
        if (this.HookList.Collision_DecideFallThroughPlatforms(info)) {
            Terraria.NPC['bool Collision_DecideFallThroughPlatforms()'
            ].hook((original, self) => {
                if (self.type < NPCLoader.MAX_VANILLA_ID) {
                    return original(self);
                }
                if (NPCLoader.ModTypes.has(self.type)) {
                    return NPCLoader.CanFallThroughPlatforms(self) ?? original(self);
                }
                return false;
            });
        }
        
        if (this.HookList.GetChat(info)) {
            Terraria.NPC['string GetChat()'
            ].hook((original, self) => {
                if (NPCLoader.CanChat(self)) {
                    return NPCLoader.GetChat(self) ?? original(self);
                }
                return '';
            });
        }
        
        if (this.HookList.getNewNPCName(info)) {
            Terraria.NPC['string getNewNPCName(int npcType)'
            ].hook((original, type) => {
                return NPCLoader.GetNewNPCName(type) ?? original(type);
            });
        }
        
        if (this.HookList.GetShimmered(info)) {
            Terraria.NPC['void GetShimmered()'
            ].hook((original, self) => {
                let flag = false;
                let oldType = self.type;
                if (NPCLoader.isModType(self.type)
                && Terraria.ID.NPCID.Sets.ShimmerTownTransform[self.type]
                ) {
                    self.type = Terraria.ID.NPCID.Guide;
                    flag = true;
                }
                original(self);
                if (flag) {
                    self.type = oldType;
                }
            });
        }
        
        if (this.HookList.UsesPartyHat(info)) {
            Terraria.NPC['bool UsesPartyHat()'
            ].hook((original, self) => {
                let result = original(self);
                if (result && NPCLoader.isModType(self.type)) {
                    return NPCLoader.getModNPC(self.type)?.UsesPartyHat(self) ?? result;
                }
                return result;
            });
        }
        
        if (this.HookList.GUINPCDialogue(info)) {
            const SpriteSortMode = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteSortMode');
            const GUINPCDialogue = new NativeClass('', 'GUINPCDialogue');
            const GUIControlsBanner = new NativeClass('', 'GUIControlsBanner');
            const GUIInstance = new NativeClass('', 'GUIInstance');
            const GUIInputRegionManager = new NativeClass('', 'GUIInputRegionManager');
            const GUIInputRegionManager_RegisterInputRegion = GUIInputRegionManager['bool RegisterInputRegion(Rectangle rect)'];
            const GUITransactionButton = new NativeClass('', 'GUITransactionButton');
            const GUITransactionButton_Draw = GUITransactionButton['InputState Draw(TransactionButton_Layout layout, Texture2D itemTexture, string label, bool disabled, ref float scale, Nullable`1 overloadedItemColour, bool forcedPressed, bool hasControllerFocus, bool forceOver, bool disablePressedState)'];
            const ControllerActionManager = new NativeClass('Controller', 'ControllerActionManager');
            const NPCDialogue_Layout = new NativeClass('', 'NPCDialogue_Layout');
            const LayoutCalculator = new NativeClass('', 'LayoutCalculator');
            const TutorialLevel = new NativeClass('', 'TutorialLevel');
            const ItemSlot = new NativeClass('Terraria.UI', 'ItemSlot');
            const Int64 = new NativeClass('System', 'Int64');
            GUINPCDialogue.Draw.hook((original, self) => {
                const player = Terraria.Main.player[Terraria.Main.myPlayer];
                if (player.talkNPC < 0 || TutorialLevel.Instance?.Enabled) {
                    original(self);
                    return;
                }
                
                const npc = Terraria.Main.npc[player.talkNPC];
                if (!NPCLoader.isModType(npc.type) && npc.type >= NPCLoader.MAX_VANILLA_ID) {
                    original(self);
                    return;
                }
                
                let originalTexture = null;
                let altTextureIndex = npc.townNPC ? NPCLoader.GetAltTextureIndex(npc) : -1;
                if (altTextureIndex > 0) {
                    originalTexture = Terraria.GameContent.TextureAssets.Npc[npc.type];
                    Terraria.GameContent.TextureAssets.Npc[npc.type] = Terraria.GameContent.TextureAssets.Extra[altTextureIndex];
                }
                original(self);
                if (originalTexture != null) {
                    Terraria.GameContent.TextureAssets.Npc[npc.type] = originalTexture;
                }
                
                const modNpc = NPCLoader.getModNPC(npc.type);
                
                let active = GUIInstance.Active;
                let layout = NPCDialogue_Layout.Instance;
                
                const button1 = {
                    text: '',
                    texture: null,
                    cost: 0
                };
                const button2 = {
                    text: '',
                    texture: null
                }
                NPCLoader.SetChatButtons(npc, player, button1, button2);
                
                ControllerActionManager.Instance.get_ActiveController();
                
                let option1Clicked = false;
                if (self.NumberOfOptions < 1 && button1.text.length > 0) {
                    self.NumberOfOptions = 1;
                    let option1State = GUITransactionButton_Draw(
                        layout.Option1, button1.texture, button1.text,
                        false, 0, null,
                        active.GUIVirtualInputController.ControllerActive,
                        false, false, false
                    );
                    if (option1State.value__ != GUITransactionButton.InputState.None.value__ && ControllerActionManager.AnyControllerConnected) {
                        active.GUIControlsBanner.AddAction(
                            GUIControlsBanner.ActionSource.NPCDialogue,
                            active.GUIControllerNavigationController.UIAction[0],
                            button1.text
                        );
                    }
                    option1Clicked = option1State.value__ == GUITransactionButton.InputState.Clicked.value__;
                }
                
                let option2Clicked = false;
                if (self.NumberOfOptions < 2 && button2.text.length > 0) {
                    self.NumberOfOptions = 2;
                    let option2State = GUITransactionButton_Draw(
                        layout.Option2, button2.texture, button2.text,
                        false, 0, null,
                        active.GUIVirtualInputController.ControllerActive,
                        false, false, false
                    );
                    if (option2State.value__ != GUITransactionButton.InputState.None.value__ && ControllerActionManager.AnyControllerConnected) {
                        active.GUIControlsBanner.AddAction(
                            GUIControlsBanner.ActionSource.NPCDialogue,
                            active.GUIControllerNavigationController.UIAction[0],
                            button2.text
                        );
                    }
                    option2Clicked = option2State.value__ == GUITransactionButton.InputState.Clicked.value__;
                }
                
                if (button1.cost > 0) {
                    let costLayout = ControllerActionManager.AnyControllerConnected 
                        ? layout.Option1CostController
                        : layout.Option1Cost;
                    
                    let costPosition = LayoutCalculator.GetAnchoredPosition(
                        costLayout.AnchorControl,
                        costLayout.Anchor,
                        costLayout.Location);
                    
                    Terraria.Main.spriteBatch.End();
                    Terraria.Main.spriteBatch['void Begin(SpriteSortMode sortMode, BlendState blendState, SamplerState samplerState, DepthStencilState depthStencilState, RasterizerState rasterizerState, Effect effect, Nullable`1 transformMatrix, bool defferedBatch)'
                    ](SpriteSortMode.Deferred, null, null, null, null, null, null, true);
                    
                    Terraria.Main.spriteBatch2['void Begin(SpriteSortMode sortMode, BlendState blendState, SamplerState samplerState, DepthStencilState depthStencilState, RasterizerState rasterizerState, Effect effect, Nullable`1 transformMatrix, bool defferedBatch)'
                    ](SpriteSortMode.Deferred, null, null, null, null, null, null, true);
                    ItemSlot.DrawCost(Terraria.Main.spriteBatch, costPosition.X, costPosition.Y, BigInt(button1.cost), Terraria.Main.spriteBatch2);
                    Terraria.Main.spriteBatch.End();
                    Terraria.Main.spriteBatch2.End();
                    
                    Terraria.Main.spriteBatch['void Begin(SpriteSortMode sortMode, BlendState blendState, SamplerState samplerState, DepthStencilState depthStencilState, RasterizerState rasterizerState, Effect effect, Nullable`1 transformMatrix, bool defferedBatch)'
                    ](SpriteSortMode.Deferred, null, null, null, null, null, null, true);
                }
                
                if (option1Clicked) {
                    NPCLoader.Option1Clicked(npc, player, button1.cost);
                } else if (option2Clicked) {
                    NPCLoader.Option2Clicked(npc, player);
                }
            });
        }
        
        if (this.HookList.SpawnNPC(info)) {
            Terraria.NPC['void SpawnNPC()'
            ].hook((original) => {
                if (Terraria.NPC.noSpawnCycle) {
                    original();
                    return;
                }
                
                const npcArray = Terraria.Main.npc;
                
                let nextSlot = -1;
                for (let i = 0; i < 200; i++) {
                    if (!npcArray[i].active) {
                        nextSlot = i;
                        break;
                    }
                }
                
                original();
                
                if (nextSlot >= 0) {
                    let npc = npcArray[nextSlot];
                    if (!npc.active) return;
                    
                    const spawnX = npc.Center.X;
                    const spawnY = npc.Bottom.Y;
                    const newNpc = NPCLoader.ChooseSpawn(new NPCSpawnInfo(spawnX, spawnY, Terraria.Main.player[Terraria.Main.myPlayer]));
                    if (newNpc == null || newNpc === 0) return;
                    if (newNpc == -1) {
                        npc.active = false;
                        return;
                    }
                    
                    npcArray[nextSlot].active = false;
                    if (NPCLoader.isModType(newNpc)) {
                        NPCLoader.getModNPC(newNpc)?.SpawnNPC(spawnX, spawnY);
                    } else {
                        Terraria.NPC.NewNPC(
                            Terraria.NPC.GetSpawnSourceForNaturalSpawn(),
                            spawnX, spawnY, newNpc,
                            0, 0, 0, 0, 0, 255
                        );
                    }
                }
            });
        }
        
        if (this.HookList.OnSpawn(info)) {
            const HasGlobalOnSpawn = NPCLoader.HasGlobalCallback('OnSpawn');
            Terraria.NPC['void GiveTownUniqueDataToNPCsThatNeedIt(int Type, int nextNPC)'
            ].hook((original, type, index) => {
                original(type, index);
                const npc = Terraria.Main.npc[index];
                npc.active = true;
                // GlobalNPC.OnSpawn também recebe NPC vanilla. Isso custa só no spawn
                // e deixa o registro compacto de alvos atualizado sem scans por frame.
                if (NPCLoader.isModType(npc.type) || HasGlobalOnSpawn) NPCLoader.OnSpawn(npc);
            });
        }
        
        if (this.HookList.SetupShop(info)) {
            Terraria.InventoryStorage['void SetupShop(int type)'
            ].hook((original, self, type) => {
                original(self, type);
                const player = Terraria.Main.player[Terraria.Main.myPlayer];
                if (player && player.talkNPC >= 0 && player.talkNPC < 200) {
                    const npc = Terraria.Main.npc[player.talkNPC];
                    if (npc && npc.active) {
                        NPCLoader.SetupShop(npc, player, type);
                    }
                }
            });
        }
        
        this.initialized = true;
    }
    
    static OnWorldUnload() {
        this.realTypes = {};
        this.NPCsToDraw_BehindTiles = new Set();
        this.NPCsToDraw_OverTiles = new Set();
    }
}