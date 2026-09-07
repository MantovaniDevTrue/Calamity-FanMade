import { Terraria } from './../ModImports.js';
import { ItemLoader } from './../Loaders/ItemLoader.js';

export class UIHooks {
    static initialized = false;
    
    static HookList = {
        All: (info) => true,
        ItemSorting: (info) => info.hasItems,
        CanEquipBothAccessories: (info) => info.hasItems || info.hasGlobalItems,
        DrawItemIcon: (info) => info.hasItems || info.hasGlobalItems
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.ItemSorting(info)) {
            Terraria.UI.ItemSorting['void Sort(bool withFeedback, Item[] inv, int[] ignoreSlots)'
            ].hook((original, withFeedback, inv, ignoreSlots) => {
                const isIgnored = (slot) => {
                    for (let i = 0; i < ignoreSlots.length; i++) {
                        if (ignoreSlots[i] === slot) return true;
                    }
                    return false;
                };
                const saved = [];
                for (let i = 0; i < inv.length; i++) {
                    if (isIgnored(i)) continue;
                    const item = inv[i];
                    if (item && item.type >= ItemLoader.MAX_VANILLA_ID && item.stack > 0 && !item.favorited) {
                        saved.push(item.Clone());
                        item.TurnToAir(false);
                    }
                }
                saved.sort((a, b) => {
                    let t = a.type - b.type;
                    if (t !== 0) return t;
                    const pa = a.prefix > 0 ? 1 : 0;
                    const pb = b.prefix > 0 ? 1 : 0;
                    if (pa !== pb) return pb - pa;
                    return b.stack - a.stack;
                });
                const step = 1 / saved.length;
                original(withFeedback, inv, ignoreSlots);
                for (let i = 0; i < saved.length; i++) {
                    const item = saved[i];
                    let empty = -1;
                    for (let j = 0; j < inv.length; j++) {
                        if (isIgnored(j)) continue;
                        const target = inv[j];
                        if (target && target.type > 0) {
                            if (target.stack < target.maxStack && Terraria.Item['bool CanStack(Item item1, Item item2)'](target, item)) {
                                let transfer = item.stack;
                                const space = target.maxStack - target.stack;
                                if (transfer > space) transfer = space;
                                target.stack += transfer;
                                item.stack -= transfer;
                                if (item.stack <= 0) break;
                            }
                        } else if (empty === -1) empty = j;
                    }
                    if (item.stack > 0 && empty !== -1) {
                        inv[empty] = item;
                        if (withFeedback) {
                            const hue = (i + 0.5) * step;
                            Terraria.UI.ItemSlot.SetGlow(empty, hue, Terraria.Main.player[Terraria.Main.myPlayer].chest !== -1);
                        }
                    }
                }
            });
        }
        
        if (this.HookList.CanEquipBothAccessories(info)) {
            Terraria.UI.ItemSlot['bool CanEquipBothAccessories(Item acc1, Item acc2)'
            ].hook((original, acc1, acc2) => {
                return original(acc1, acc2) && ItemLoader.CanAccessoryBeEquippedWith(acc2, acc1, Terraria.Main.player[Terraria.Main.myPlayer]);
            });
        }
        
        if (this.HookList.DrawItemIcon(info)) {
            Terraria.UI.ItemSlot['float DrawItemIcon(Item item, int context, SpriteBatch spriteBatch, Vector2 screenPositionForItemCenter, float scale, float sizeLimit, Color environmentColor, float itemFade, bool flip)'
            ].hook((original, item, context, sb, position, scale, maxScale, color, itemFade, flip) => {
                let finalScale = 0;
                if (ItemLoader.PreDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip)) {
                    finalScale = original(item, context, sb, position, scale, maxScale, color, itemFade, flip);
                    ItemLoader.PostDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip);
                }
                return finalScale;
            });
        }
        
        this.initialized = true;
    }
}