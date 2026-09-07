import { Terraria, Modules } from './../ModImports.js';
import { MountLoader } from './../Loaders/MountLoader.js';

const { Vector2 } = Modules;

export class MountHooks {
    static initialized = false;
    
    static HookList = {
        All: (info) => info.hasMounts,
        SetMount: (info) => true, // <-- This hook is required for mounts to spawn
        Dismount: (info) => true,
        JumpHeight: (info) => true,
        JumpSpeed: (info) => true,
        UpdateEffects: (info) => true,
        UpdateFrame: (info) => true,
        UseAbility: (info) => false,
        AimAbility: (info) => true,
        Draw: (info) => true
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.SetMount(info)) {
            Terraria.Mount['void SetMount(int m, Player mountedPlayer, bool ignoreEffect)'
            ].hook((original, self, m, mountedPlayer, ignoreEffect) => {
                if (!MountLoader.isModType(m)) {
                    original(self, m, mountedPlayer, ignoreEffect);
                    return;
                }
                
                if (self._type === m || m >= Terraria.Mount.mounts.length) {
                    return;
                }
                
                if (self._active) {
                    mountedPlayer.ClearBuff(self._data.buff);
                    if (self.AnyTrackRider) {
                        mountedPlayer.cartFlip = false;
                        mountedPlayer.lastBoost = Vector2.Zero
                    }
                    mountedPlayer.fullRotation = 0.0;
                    mountedPlayer.fullRotationOrigin = Vector2.Zero;
                    // TLPro/IL2CPP: assigning JS null to this native field can abort the process.
                    // Leaving it untouched is safer for custom mount transitions.
                } else {
                    self._active = true;
                }
                
                self._flyTime = 0;
                self._type = m;
                self._data = Terraria.Mount.mounts[m];
                self._fatigueMax = self._data.fatigueMax;
                if (!mountedPlayer.isDisplayDollOrInanimate && Terraria.PlayerIndex(mountedPlayer) === Terraria.Main.myPlayer) {
                    Terraria.NetMessage.SendData(13, -1, -1, null, Terraria.PlayerIndex(mountedPlayer), 0, 0, 0, 0, 0, 0);
                }
                mountedPlayer.AddBuff(self._data.buff, 3600, false);
                self._flipDraw = false;
                
                /*const pos = mountedPlayer.position;
                pos.Y -= mountedPlayer.height;
                for (let i = 0; i < mountedPlayer.shadowPos.length; i++) {
                    const pos2 = mountedPlayer.shadowPos[i];
                    pos2.Y -= mountedPlayer.height;
                    mountedPlayer.shadowPos[i] = pos;
                }
                mountedPlayer.height = 42 + self._data.heightBoost;
                pos.Y -= mountedPlayer.height;
                for (let i = 0; i < mountedPlayer.shadowPos.length; i++) {
                    const pos2 = mountedPlayer.shadowPos[i];
                    pos2.Y -= mountedPlayer.height;
                    mountedPlayer.shadowPos[i] = pos;
                }
                mountedPlayer.position = pos;*/
                
                mountedPlayer.ResetAdvancedShadows();
                
                const modMount = MountLoader.toModMount(self);
                if (modMount) ignoreEffect = modMount.SetMount(self, mountedPlayer) === false;
                if (!ignoreEffect) self.DoSpawnDust(mountedPlayer, false);
            });
        }
        
        if (this.HookList.Dismount(info)) {
            Terraria.Mount['void Dismount(Player mountedPlayer, bool ignoreEffect)'
            ].hook((original, self, mountedPlayer, ignoreEffect) => {
                if (MountLoader.isModType(self._type)) {
                    const mount = MountLoader.toModMount(self);
                    if (mount) ignoreEffect = mount.Dismount(self, mountedPlayer) === false;
                }
                original(self, mountedPlayer, ignoreEffect);
            });
        }
        
        if (this.HookList.JumpHeight(info)) {
            Terraria.Mount['int JumpHeight(float xVelocity)'
            ].hook((original, self, xVelocity) => {
                const jumpHeight = original(self, xVelocity);
                if (!MountLoader.isModType(self._type)) {
                    return jumpHeight;
                }
                return MountLoader.JumpHeight(self, jumpHeight, xVelocity);
            });
        }
        
        if (this.HookList.JumpSpeed(info)) {
            Terraria.Mount['float JumpSpeed(float xVelocity)'
            ].hook((original, self, xVelocity) => {
                const jumpSpeed = original(self, xVelocity);
                if (!MountLoader.isModType(self._type)) {
                    return jumpSpeed;
                }
                return MountLoader.JumpSpeed(self, jumpSpeed, xVelocity);
            });
        }
        
        if (this.HookList.UpdateEffects(info)) {
            Terraria.Mount['void UpdateEffects(Player mountedPlayer)'
            ].hook((original, self, player) => {
                if (MountLoader.isModType(self._type)) {
                    MountLoader.UpdateEffects(self, player);
                }
                original(self, player);
            });
        }
        
        if (this.HookList.UpdateFrame(info)) {
            Terraria.Mount['void UpdateFrame(Player mountedPlayer, int state, Vector2 velocity)'
            ].hook((original, self, player, state, velocity) => {
                let canUpdate = true;
                if (MountLoader.isModType(self._type)) {
                    canUpdate = MountLoader.UpdateFrame(self, player, state, velocity);
                }
                if (canUpdate) original(self, player, state, velocity);
            });
        }
        
        if (this.HookList.UseAbility(info)) {
            Terraria.Mount['void UseAbility(Player mountedPlayer, Vector2 mousePosition, bool toggleOn)'
            ].hook((original, self, player, mousePosition, toggleOn) => {
                original(self, player, mousePosition, toggleOn);
                if (MountLoader.isModType(self._type)) {
                    MountLoader.UseAbility(self, player, mousePosition, toggleOn);
                }
            });
        }
        
        if (this.HookList.AimAbility(info)) {
            Terraria.Mount['bool AimAbility(Player mountedPlayer, Vector2 mousePosition)'
            ].hook((original, self, player, mousePosition) => {
                if (MountLoader.isModType(self._type)) {
                    MountLoader.AimAbility(self, player, mousePosition);
                }
                return original(self, player, mousePosition);
            });
        }
        
        if (this.HookList.Draw(info)) {
            Terraria.Mount['void Draw(PlayerDrawSet playerDrawData, int drawType, Player drawPlayer, Vector2 Position, Color drawColor, SpriteEffects playerEffect, float shadow)'
            ].hook((original, self, playerDrawData, drawType, drawPlayer, position, drawColor, spriteEffects, shadow) => {
                if (MountLoader.isModType(self._type)) {
                    if (MountLoader.Draw(self, playerDrawData, drawType, drawPlayer, position, drawColor, spriteEffects, shadow) === false) {
                        return;
                    }
                }
                original(self, playerDrawData, drawType, drawPlayer, position, drawColor, spriteEffects, shadow);
            });
        }
        
        this.initialized = true;
    }
}