import { NPCHooks } from './Hooks/NPC.js';
import { LangHooks } from './Hooks/Lang.js';
import { MainHooks } from './Hooks/Main.js';
import { ItemHooks } from './Hooks/Item.js';
import { PlayerHooks } from './Hooks/Player.js';
import { ProjectileHooks } from './Hooks/Projectile.js';
import { WiringHooks } from './Hooks/Wiring.js';
import { WorldGenHooks } from './Hooks/WorldGen.js';
import { GameContentHooks } from './Hooks/GameContent.js';
import { CloudHooks } from './Hooks/Cloud.js';
import { ChatHooks } from './Hooks/Chat.js';
import { MountHooks } from './Hooks/Mount.js';
import { AchievementHooks } from './Hooks/Achievement.js';
import { UIHooks } from './Hooks/UI.js';

import { GlobalHooks } from './GlobalHooks.js';

export class ModHooks {
    static initialized = false;
    
    static Initialize(info) {
        if (this.initialized) return;
        
        if (!info.is64Bits) {
            tl.log('\n[ExMod] 32-bit device detected: the mod will not work correctly.');
        }
        
        MainHooks.Initialize(info);
        //LangHooks.Initialize(info);
        NPCHooks.Initialize(info);
        ProjectileHooks.Initialize(info);
        ItemHooks.Initialize(info);
        PlayerHooks.Initialize(info);
        WiringHooks.Initialize(info);
        WorldGenHooks.Initialize(info);
        GameContentHooks.Initialize(info);
        CloudHooks.Initialize(info);
        ChatHooks.Initialize(info);
        MountHooks.Initialize(info);
        AchievementHooks.Initialize(info);
        UIHooks.Initialize(info);
        
        for (const hook of GlobalHooks.RegisteredHooks) {
            if (!hook.initialized) {
                hook.Initialize();
                hook.initialized = true;
            }
        }
        
        this.info = info;
        this.initialized = true;
    }
    
    static PostSetupContentInitialize() {
        const info = ModHooks.info;
        if (!info) return;
        ModHooks.info = null;
        
        LangHooks.Initialize(info);
    }
    
    // Initialize temp data
    static OnWorldLoad() {
        GlobalHooks.RegisteredHooks.forEach(h => h.OnWorldLoad());
    }
    
    // Clear temp data
    static OnWorldUnload() {
        ProjectileHooks.OnWorldUnload();
        PlayerHooks.OnWorldUnload();
        NPCHooks.OnWorldUnload();
        
        GlobalHooks.RegisteredHooks.forEach(h => h.OnWorldUnload());
    }
}