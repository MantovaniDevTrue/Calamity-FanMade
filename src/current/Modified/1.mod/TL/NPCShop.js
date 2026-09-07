import { Terraria } from './ModImports.js';

export class NPCShop {
    constructor(shopIndex = 99) {
        shopIndex = Math.max(0, Math.min(shopIndex, 99));
        this.shopIndex = shopIndex;
        this.shop = Terraria.Main.instance.shop[shopIndex];
    }
    
    get item() { return this.shop.item; }
    
    AddRange(entries) {
        for (const entry of entries) {
            if (entry?.stack) this.Add(entry.type, entry.stack);
            else this.Add(entry);
        }
    }
    
    Add(type, stack = 1) {
        if (!type || !stack) return -1;
        for (let i = 0; i < 40; i++) {
            if (this.item[i] === null || this.item[i].type === 0) {
                this.item[i] = Terraria.Item.new();
                let newVar = Terraria.GameContent.Items.ItemVariant.new();
                this.item[i]['void SetDefaults(int Type, ItemVariant variant)'](type, newVar);
                this.item[i].isAShopItem = true;
                this.item[i].favorited = false;
                this.item[i].buyOnce = false;
                this.item[i].stack = Math.max(1, Math.min(stack, this.item[i].maxStack));
                this.item[i].material = Terraria.ID.ItemID.Sets.IsAMaterial[type];
                return i;
            }
        }
        return -1;
    }
    
    Remove(type, stack = 9999) {
        for (let i = 0; i < 40; i++) {
            if (this.item[i]?.type === type) {
                if (this.item[i].stack <= stack) {
                    this.item[i].TurnToAir(true);
                } else {
                    this.item[i].stack -= stack;
                }
                return i;
            }
        }
        return -1;
    }
    
    RemoveAt(slot = 0, type = null) {
        slot = Math.max(0, Math.min(slot, 39));
        if (type !== null) {
            if (this.item[slot]?.type === type) {
                this.item[slot].TurnToAir(true);
            }
        } else if (this.item[slot]?.type) {
            this.item[slot].TurnToAir(true);
        }
    }
    
    HasItem(type) {
        for (let i = 0; i < 40; i++) {
            if (this.item[i]?.type === type) return true;
        }
        return false;
    }
    
    GetItem(type) {
        for (let i = 0; i < 40; i++) {
            if (this.item[i]?.type === type) {
                return this.item[i];
            }
        }
    }
    
    NextSlot() {
        for (let i = 0; i < 40; i++) {
            if (this.item[i] === null || this.item[i].type === 0) {
                return i;
            }
        }
        return -1;
    }
    
    Clear() {
        for (let i = 0; i < 40; i++) {
            if (this.item[i]?.type) {
                this.item[i].TurnToAir(true);
            }
        }
    }
    
    ModifyPrices(priceMultiplier = 1.0) {
        for (let i = 0; i < 40; i++) {
            if (this.item[i]?.type) {
                this.item[i].value = Math.min(this.item[i].value * priceMultiplier, 9999000000);
            }
        }
    }
    
    static _vanillaShopNames = [
        null,
        this.GetShopName(Terraria.ID.NPCID.Merchant),
        this.GetShopName(Terraria.ID.NPCID.ArmsDealer),
        this.GetShopName(Terraria.ID.NPCID.Dryad),
        this.GetShopName(Terraria.ID.NPCID.Demolitionist),
        this.GetShopName(Terraria.ID.NPCID.Clothier),
        this.GetShopName(Terraria.ID.NPCID.GoblinTinkerer),
        this.GetShopName(Terraria.ID.NPCID.Wizard),
        this.GetShopName(Terraria.ID.NPCID.Mechanic),
        this.GetShopName(Terraria.ID.NPCID.SantaClaus),
        this.GetShopName(Terraria.ID.NPCID.Truffle),
        this.GetShopName(Terraria.ID.NPCID.Steampunker),
        this.GetShopName(Terraria.ID.NPCID.DyeTrader),
        this.GetShopName(Terraria.ID.NPCID.PartyGirl),
        this.GetShopName(Terraria.ID.NPCID.Cyborg),
        this.GetShopName(Terraria.ID.NPCID.Painter),
        this.GetShopName(Terraria.ID.NPCID.WitchDoctor),
        this.GetShopName(Terraria.ID.NPCID.Pirate),
        this.GetShopName(Terraria.ID.NPCID.Stylist),
        this.GetShopName(Terraria.ID.NPCID.TravellingMerchant),
        this.GetShopName(Terraria.ID.NPCID.SkeletonMerchant),
        this.GetShopName(Terraria.ID.NPCID.DD2Bartender),
        this.GetShopName(Terraria.ID.NPCID.Golfer),
        this.GetShopName(Terraria.ID.NPCID.BestiaryGirl),
        this.GetShopName(Terraria.ID.NPCID.Princess),
        this.GetShopName(Terraria.ID.NPCID.Painter, 'Decor')
    ];
    
    static GetShopName(type, name = '') {
        if (type < Terraria.ID.NPCID.Count) {
            return Terraria.ID.NPCID.Search.GetName(type) + name;
        }
        return '';
    }
    
    static GetShopByName(name) {
        if (name && this._vanillaShopNames.includes(name)) {
            return this._vanillaShopNames.indexOf(name);
        }
        return 99;
    }
    
    static GetShopByType(type, name = '') {
        if (Terraria.ID.NPCID.Search.ContainsId(type))
            return this.GetShopByName(Terraria.ID.NPCID.Search.GetId(type) + name);
        return 99;
    }
}