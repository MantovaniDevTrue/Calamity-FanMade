import { Terraria } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModItem } from './../../TL/ModItem.js';

const MAX_PLAYERS = 256;
function I(v, f = -1) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Tick() { try { return I(Terraria.Main.GameUpdateCount, 0); } catch (e) { return 0; } }
function PlayerIndex(player) {
    try { const i = I(Terraria.PlayerIndex(player)); if (i >= 0 && i < MAX_PLAYERS) return i; } catch (e) { }
    try { const i = I(player.whoAmI); if (i >= 0 && i < MAX_PLAYERS) return i; } catch (e) { }
    return -1;
}
function Held(player) { try { return player.HeldItem; } catch (e) { return null; } }
function BaitPower(player) {
    try {
        const inv = player.inventory;
        for (let i = 0; i < 58; i++) {
            let it = null;
            try { it = inv.get_Item(i); } catch (e) { try { it = inv[i]; } catch (_) { } }
            const bait = Number(it?.bait) || 0;
            if (bait > 0 && Number(it?.stack) > 0) return bait;
        }
    } catch (e) { }
    return 0;
}

export class AcrobaticFishingPlayer extends ModPlayer {
    constructor() {
        super();
        this.Enabled = new Array(MAX_PLAYERS).fill(false);
        this.ActiveUntil = new Array(MAX_PLAYERS).fill(-9999);
        this.InputTick = new Array(MAX_PLAYERS).fill(-1);
        this.Up = new Array(MAX_PLAYERS).fill(false);
        this.Down = new Array(MAX_PLAYERS).fill(false);
        this.Left = new Array(MAX_PLAYERS).fill(false);
        this.Right = new Array(MAX_PLAYERS).fill(false);
        this.BaitTick = new Array(MAX_PLAYERS).fill(-9999);
        this.BaitCache = new Array(MAX_PLAYERS).fill(0);
        this.BonusTick = new Array(MAX_PLAYERS).fill(-9999);
    }

    ResetPlayer(player) {
        const i = PlayerIndex(player); if (i < 0) return;
        this.Enabled[i] = false;
        this.ActiveUntil[i] = -9999;
        this.InputTick[i] = -1;
        this.Up[i] = this.Down[i] = this.Left[i] = this.Right[i] = false;
        this.BaitTick[i] = -9999;
        this.BaitCache[i] = 0;
        this.BonusTick[i] = -9999;
    }
    OnEnterWorld(player) { this.ResetPlayer(player); }
    OnRespawn(player) { this.ResetPlayer(player); }
    UpdateDead(player) { this.ResetPlayer(player); }
    ResetEffects(player) { const i = PlayerIndex(player); if (i >= 0) this.Enabled[i] = false; }

    Enable(player) { const i = PlayerIndex(player); if (i >= 0) this.Enabled[i] = true; }
    IsEnabled(player) { const i = PlayerIndex(player); return i >= 0 && this.Enabled[i] === true; }
    MarkActive(player) { const i = PlayerIndex(player); if (i >= 0) this.ActiveUntil[i] = Tick() + 1; }

    // Phase 13.13.0.2 mobile input fix:
    // Player.Update() is where TLPro/mobile finishes applying the virtual joystick.
    // Sampling and clearing controls in PreUpdate captured stale false values on Android,
    // so the rift appeared but the bobber could never be steered into it.
    // Keep PreUpdate empty and capture the final control state from PostUpdate instead.
    PreUpdate(player) { }

    PostUpdate(player) {
        const i = PlayerIndex(player); if (i < 0 || !this.Enabled[i]) return;
        const tick = Tick();
        if (this.ActiveUntil[i] < tick - 1) return;
        this.Up[i] = player.controlUp === true;
        this.Down[i] = player.controlDown === true;
        this.Left[i] = player.controlLeft === true;
        this.Right[i] = player.controlRight === true;
        this.InputTick[i] = tick;
    }

    GetInput(player) {
        const i = PlayerIndex(player);
        if (i < 0) return { up:false, down:false, left:false, right:false };
        const tick = Tick();
        // Use the post-Player.Update sample when available, but OR it with the live
        // flags as a timing-safe fallback. Different mobile builds update the virtual
        // joystick at slightly different points in the frame.
        const cached = this.InputTick[i] === tick;
        return {
            up: (cached && this.Up[i]) || player.controlUp === true,
            down: (cached && this.Down[i]) || player.controlDown === true,
            left: (cached && this.Left[i]) || player.controlLeft === true,
            right: (cached && this.Right[i]) || player.controlRight === true
        };
    }

    UpdateEquips(player) {
        // Official Heron Rod: final fishing power is multiplied by 1.1 in Space.
        // TLPro has no GetFishingLevel ModPlayer hook, so reproduce the same final-level
        // increase by adding the equivalent 10% to fishingSkill once per tick.
        const i = PlayerIndex(player); if (i < 0) return;
        const tick = Tick(); if (this.BonusTick[i] === tick) return;
        const held = Held(player);
        const heron = Number(ModItem.getTypeByName('HeronRod') || 0);
        let sky = false;
        try { sky = player.ZoneSkyHeight === true; } catch (e) { sky = false; }
        if (!(heron > 0) || Number(held?.type) !== heron || !sky) return;
        this.BonusTick[i] = tick;

        if (tick - this.BaitTick[i] >= 30) {
            this.BaitCache[i] = BaitPower(player);
            this.BaitTick[i] = tick;
        }
        const pole = Math.max(0, Number(held?.fishingPole) || 0);
        const bait = Math.max(0, Number(this.BaitCache[i]) || 0);
        let skill = 0;
        try { skill = Math.max(0, Number(player.fishingSkill) || 0); } catch (e) { skill = 0; }
        const bonus = Math.max(1, Math.round((pole + bait + skill) * 0.10));
        try { player.fishingSkill = skill + bonus; } catch (e) { }
    }
}
