const Main = new NativeClass('Terraria', 'Main');
const List = new NativeClass('System.Collections.Generic', 'List`1');
const DropRateInfo = new NativeClass('Terraria.GameContent.ItemDropRules', 'DropRateInfo');
const DropRateInfoChainFeed = new NativeClass('Terraria.GameContent.ItemDropRules', 'DropRateInfoChainFeed');
const ItemDropBestiaryInfoElement = new NativeClass('Terraria.GameContent.Bestiary', 'ItemDropBestiaryInfoElement');

export class BestiaryHelper {
    static GetEntry(npcId) {
        return Main.BestiaryDB.FindEntryByNPCID(npcId);
    }
    
    static AddDropToNPC(npcId, itemDropRule) {
        const entry = this.GetEntry(npcId);
        
        const drops = List.makeGeneric(DropRateInfo).new();
        drops['void .ctor()']();
        const ratesInfo = DropRateInfoChainFeed.new();
        ratesInfo['void .ctor(float droprate)'](1);
        
        itemDropRule.ReportDroprates(drops, ratesInfo);
        
        const _drops = drops.ToArray();
        const len = _drops.length;
        for (let i = 0; i < len; i++) {
            const infoElement = ItemDropBestiaryInfoElement.new();
            infoElement['void .ctor(DropRateInfo info)'](_drops[i]);
            entry.Info.Add(infoElement);
        }
    }
    
    static RemoveDropFromNPC(npcId, itemId) {
        const entry = this.GetEntry(npcId);
        
        const allDrops = entry.Info.ToArray();
        const len = allDrops.length;
        for (let i = 0; i < len; i++) {
            let drop;
            try { drop = allDrops[i]?._droprateInfo; } catch {}
            if (!drop) continue;
            if (drop.itemId === itemId) {
                entry.Info.RemoveAt(i);
            }
        }
    }
}