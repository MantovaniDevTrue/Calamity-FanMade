import { Terraria } from './../ModImports.js';
import { CloudLoader } from './../Loaders/CloudLoader.js';

export class CloudHooks {
    static initialized = false;
    
    // Here you can disable the hooks that won't be used in your mod to avoid unnecessary processing
    static HookList = {
        All: (info) => info.hasClouds,
        AddCloud: (info) => true,
        RollRareCloud: (info) => true
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.AddCloud(info)) {
            Terraria.Cloud['void addCloud()'
            ].hook((original) => {
                if (Terraria.Main.netMode === 2 || CloudLoader.Clouds.length === 0) {
                    original();
                    return;
                }
                
                const cloudArray = Terraria.Main.cloud;
                
                let nextSlot = -1;
                for (let i = 0; i < 200; i++) {
                    if (!cloudArray[i].active) {
                        nextSlot = i;
                        break;
                    }
                }
                
                original();
                
                if (nextSlot < 0 || nextSlot >= 200) return;
                const c = cloudArray[nextSlot];
                if (!c.active) return;
                if (CloudLoader.isModType(c.type)) {
                    CloudLoader.getModCloud(c.type).OnSpawn(c);
                } else {
                    let selected = CloudLoader.ChooseCloud(CloudLoader.MAX_VANILLA_ID - 15);
                    if (!selected) return;
                    c.type = selected;
                    c.width = Terraria.GameContent.TextureAssets.Cloud[c.type].Value.Width * c.scale;
                    c.height = Terraria.GameContent.TextureAssets.Cloud[c.type].Value.Height * c.scale;
                    CloudLoader.getModCloud(selected).OnSpawn(c);
                }
            });
        }
        
        if (this.HookList.RollRareCloud(info)) {
            Terraria.Cloud['int RollRareCloud()'
            ].hook((original) => {
                let selected = CloudLoader.ChooseCloud(15, true);
                if (selected) return selected;
                return original();
            });
        }
        
        this.initialized = true;
    }
}