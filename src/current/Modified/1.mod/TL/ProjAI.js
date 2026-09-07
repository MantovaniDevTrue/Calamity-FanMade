import { Terraria } from './ModImports.js';
/**
 * Cached bridge for proj.ai / proj.localAI.
 *
 * The NativeObject field itself is declared directly on Projectile and is safe,
 * but fetching that fixed-array wrapper repeatedly is unnecessary. Capture it
 * once when this short-lived helper is created and reuse it for all reads in the
 * current callback. Setters still write the struct back to Projectile exactly as
 * before so native state remains authoritative between callbacks.
 */
export class ProjAI {
    constructor(proj, local = false) {
        this.proj = proj;
        this.ai = local ? 'localAI' : 'ai';
        try { this.value = proj ? proj[this.ai] : null; }
        catch (e) { this.value = null; }
    }

    Ensure() {
        if (this.value) return this.value;
        try { this.value = this.proj ? this.proj[this.ai] : null; }
        catch (e) { this.value = null; }
        return this.value;
    }

    Commit() {
        if (!this.proj || !this.value) return;
        this.proj[this.ai] = this.value;
    }
    
    get 0() {
        const v = this.Ensure();
        return v ? v.get_Item(0) : 0;
    }
    set 0(value) {
        const v = this.Ensure();
        if (!v) return;
        v.val0 = value;
        this.Commit();
    }
    
    get 1() {
        const v = this.Ensure();
        return v ? v.get_Item(1) : 0;
    }
    set 1(value) {
        const v = this.Ensure();
        if (!v) return;
        v.val1 = value;
        this.Commit();
    }
    
    get 2() {
        const v = this.Ensure();
        return v ? v.get_Item(2) : 0;
    }
    set 2(value) {
        const v = this.Ensure();
        if (!v) return;
        v.val2 = value;
        this.Commit();
    }
}
