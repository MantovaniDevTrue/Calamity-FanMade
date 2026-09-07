export const OfficialStructureMap = {
    Areas: [],

    Reset() {
        this.Areas = [];
    },

    Intersects(a, b, padding = 0) {
        const p = Math.max(0, Math.floor(Number(padding) || 0));
        return !(a.right + p <= b.left || a.left >= b.right + p || a.bottom + p <= b.top || a.top >= b.bottom + p);
    },

    CanPlace(rect, padding = 0) {
        for (const area of this.Areas)
            if (this.Intersects(rect, area.rect, Math.max(Number(padding) || 0, Number(area.padding) || 0)))
                return false;
        return true;
    },

    Reserve(name, rect, padding = 0) {
        const normalized = {
            left: Math.floor(Number(rect.left) || 0),
            top: Math.floor(Number(rect.top) || 0),
            right: Math.floor(Number(rect.right) || 0),
            bottom: Math.floor(Number(rect.bottom) || 0)
        };
        this.Areas.push({ name: String(name || ''), rect: normalized, padding: Math.max(0, Math.floor(Number(padding) || 0)) });
        return normalized;
    }
};
