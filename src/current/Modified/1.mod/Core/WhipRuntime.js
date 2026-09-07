import { Terraria, Microsoft, System } from './../TL/ModImports.js';

const Vector2 = Microsoft.Xna.Framework.Vector2;

function NewPointList() {
    const list = System.Collections.Generic.List.makeGeneric(Vector2).new();
    list['void .ctor()']();
    return list;
}

// Base reaproveitável pros whips do Calamity. Uso a lista nativa direto para não
// criar ToArray()/Array.from() em todo PreDraw, que era o ponto mais caro da referência.
export class WhipRuntime {
    static SharedPoints = null;

    static MarkWhip(type) {
        const t = Math.floor(Number(type));
        if (!(t > 0))
            return false;
        try {
            Terraria.ID.ProjectileID.Sets.IsAWhip[t] = true;
            return true;
        } catch (e) {
            return false;
        }
    }

    static GetSharedList() {
        if (!this.SharedPoints)
            this.SharedPoints = NewPointList();
        return this.SharedPoints;
    }

    static Fill(proj, list = null, includePlayerArm = true) {
        if (!proj)
            return null;
        const points = list || this.GetSharedList();
        try { points.Clear(); }
        catch (e) { return null; }
        let player = null;
        try { player = Terraria.Main.player[Math.floor(Number(proj.owner))]; }
        catch (e) { }
        if (!player)
            return null;
        try {
            Terraria.Projectile.FillWhipControlPoints(proj, points, player, includePlayerArm !== false);
            return points;
        } catch (e) {
            return null;
        }
    }

    static Count(list) {
        try { return Math.max(0, Math.floor(Number(list.Count) || 0)); }
        catch (e) { return 0; }
    }

    static Point(list, index) {
        const i = Math.max(0, Math.floor(Number(index) || 0));
        try {
            if (list.get_Item)
                return list.get_Item(i);
        } catch (e) { }
        try {
            const getter = list['Vector2 get_Item(int index)'];
            if (getter)
                return getter(i);
        } catch (e) { }
        return null;
    }

    static Clear() {
        if (!this.SharedPoints)
            return;
        try { this.SharedPoints.Clear(); }
        catch (e) { }
    }
}
