import { Terraria, Modules } from './../TL/ModImports.js';
import { CameraShake, FadeController } from './../TL/Modules/Camera.js';

const { Camera } = Modules;
function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
}
function Tick() {
    try { return Math.max(0, Math.floor(Number(Terraria.Main.GameUpdateCount) || 0)); }
    catch (_) { return 0; }
}
function NPCAt(index) {
    const i = Math.floor(Number(index));
    if (!Number.isFinite(i) || i < 0 || i >= 200)
        return null;
    let array = null;
    try { array = Terraria.Main.npc; } catch (_) { }
    if (!array)
        return null;
    // TLPro can expose Terraria arrays either through get_Item or indexed access.
    try {
        const npc = array.get_Item(i);
        if (npc) return npc;
    } catch (_) { }
    try { return array[i] || null; }
    catch (_) { return null; }
}

export class FusionCamera {
    static MaxShakeTime = 120;
    static MaxShakeIntensity = 12;
    static FocusMode = 'none';
    static FocusNPCIndex = -1;
    static FocusX = 0;
    static FocusY = 0;
    static FocusUntilTick = 0;
    static FocusReturnUntilTick = 0;
    static FocusSmoothing = 0.12;
    static MaxFocusDistance = 1800;
    static CurrentX = 0;
    static CurrentY = 0;
    static FocusInitialized = false;
    static CachedScreenWidth = -1;
    static CachedScreenHeight = -1;
    static HalfScreenWidth = 0;
    static HalfScreenHeight = 0;

    static Shake(time, intensity) {
        const safeTime = Math.floor(Clamp(time, 1, this.MaxShakeTime));
        const safeIntensity = Clamp(intensity, 0, this.MaxShakeIntensity);
        Camera.Shake(safeTime, safeIntensity);
        return safeIntensity;
    }

    static ShakeAt(position, time, intensity, range = 1200) {
        let player = null;
        try { player = Terraria.Main.LocalPlayer; } catch (_) { }
        if (!player || !player.active || player.dead || !position)
            return 0;
        const dx = Number(position.X ?? position.x ?? 0) - Number(Terraria.PlayerCenterX(player));
        const dy = Number(position.Y ?? position.y ?? 0) - Number(Terraria.PlayerCenterY(player));
        const distance2 = dx * dx + dy * dy;
        const maxRange = Math.max(1, Number(range) || 1200);
        if (distance2 >= maxRange * maxRange)
            return 0;
        const distance = Math.sqrt(distance2);
        const strength = Clamp(intensity, 0, this.MaxShakeIntensity) * (1 - distance / maxRange);
        if (strength <= 0.01)
            return 0;
        this.Shake(time, strength);
        return strength;
    }

    static Fade(color = null, fadeIn = 5, hold = 15, fadeOut = 5) {
        Camera.Fade(color, Math.max(1, Math.floor(fadeIn)), Math.max(0, Math.floor(hold)), Math.max(1, Math.floor(fadeOut)));
    }

    static FocusPosition(position, duration = 60, smoothing = 0.12) {
        if (!position)
            return false;
        const x = Number(position.X ?? position.x);
        const y = Number(position.Y ?? position.y);
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return false;
        this.FocusMode = 'position';
        this.FocusNPCIndex = -1;
        this.FocusX = x;
        this.FocusY = y;
        this.FocusSmoothing = Clamp(smoothing, 0.02, 1);
        this.FocusUntilTick = Tick() + Math.max(1, Math.floor(Number(duration) || 60));
        this.FocusReturnUntilTick = 0;
        this.FocusInitialized = false;
        return true;
    }

    static FocusNPC(npcOrIndex, duration = 60, smoothing = 0.12) {
        let index = Math.floor(Number(npcOrIndex));
        if (!Number.isFinite(index) && npcOrIndex) {
            try { index = Math.floor(Number(npcOrIndex.whoAmI)); }
            catch (_) { index = -1; }
        }
        const npc = NPCAt(index);
        if (!npc || !npc.active)
            return false;
        this.FocusMode = 'npc';
        this.FocusNPCIndex = index;
        this.FocusSmoothing = Clamp(smoothing, 0.02, 1);
        this.FocusUntilTick = Tick() + Math.max(1, Math.floor(Number(duration) || 60));
        this.FocusReturnUntilTick = 0;
        this.FocusInitialized = false;
        return true;
    }

    static ReleaseFocus() {
        this.FocusMode = 'none';
        this.FocusNPCIndex = -1;
        this.FocusUntilTick = 0;
        this.FocusReturnUntilTick = 0;
        this.FocusInitialized = false;
    }

    static BeginReturn(tick = Tick()) {
        if (this.FocusMode === 'none' || this.FocusMode === 'return')
            return;
        this.FocusMode = 'return';
        this.FocusNPCIndex = -1;
        this.FocusReturnUntilTick = tick + 20;
    }

    static UpdateScreenCache() {
        const w = Number(Terraria.Main.screenWidth) || 1920;
        const h = Number(Terraria.Main.screenHeight) || 1080;
        if (w !== this.CachedScreenWidth || h !== this.CachedScreenHeight) {
            this.CachedScreenWidth = w;
            this.CachedScreenHeight = h;
            this.HalfScreenWidth = w * 0.5;
            this.HalfScreenHeight = h * 0.5;
        }
    }

    static UpdateFocus() {
        if (this.FocusMode === 'none' || Terraria.Main.gameMenu)
            return false;
        const pos = Terraria.Main.screenPosition;
        if (!pos)
            return false;
        const tick = Tick();
        const vanillaX = Number(pos.X);
        const vanillaY = Number(pos.Y);
        if (!this.FocusInitialized) {
            this.CurrentX = vanillaX;
            this.CurrentY = vanillaY;
            this.FocusInitialized = true;
        }

        if (this.FocusMode !== 'return' && tick > this.FocusUntilTick)
            this.BeginReturn(tick);

        if (this.FocusMode === 'return') {
            this.CurrentX += (vanillaX - this.CurrentX) * 0.18;
            this.CurrentY += (vanillaY - this.CurrentY) * 0.18;
            const dx = vanillaX - this.CurrentX;
            const dy = vanillaY - this.CurrentY;
            if (tick > this.FocusReturnUntilTick || dx * dx + dy * dy < 1) {
                this.ReleaseFocus();
                return false;
            }
            pos.X = this.CurrentX;
            pos.Y = this.CurrentY;
            Terraria.Main.screenPosition = pos;
            return true;
        }

        let targetX = this.FocusX;
        let targetY = this.FocusY;
        if (this.FocusMode === 'npc') {
            const npc = NPCAt(this.FocusNPCIndex);
            if (!npc || !npc.active) {
                this.BeginReturn(tick);
                return false;
            }
            targetX = Number(npc.position.X) + Number(npc.width) * 0.5;
            targetY = Number(npc.position.Y) + Number(npc.height) * 0.5;
        }

        this.UpdateScreenCache();
        const desiredX = targetX - this.HalfScreenWidth;
        const desiredY = targetY - this.HalfScreenHeight;
        const dxTarget = desiredX - vanillaX;
        const dyTarget = desiredY - vanillaY;
        if (dxTarget * dxTarget + dyTarget * dyTarget > this.MaxFocusDistance * this.MaxFocusDistance) {
            this.BeginReturn(tick);
            return false;
        }

        const smooth = this.FocusSmoothing;
        this.CurrentX += (desiredX - this.CurrentX) * smooth;
        this.CurrentY += (desiredY - this.CurrentY) * smooth;
        pos.X = this.CurrentX;
        pos.Y = this.CurrentY;
        Terraria.Main.screenPosition = pos;
        return true;
    }

    static Clear() {
        try { CameraShake.Clear(); } catch (_) { }
        try { FadeController.Clear(); } catch (_) { }
        this.ReleaseFocus();
    }

    static GetStats() {
        const tick = Tick();
        return {
            shakeTime: Number(CameraShake._time) || 0,
            shakeIntensity: Number(CameraShake._intensity) || 0,
            offsetX: Number(CameraShake._offsetX) || 0,
            offsetY: Number(CameraShake._offsetY) || 0,
            fadeActive: FadeController._active === true,
            fadeAlpha: Number(FadeController._alpha) || 0,
            cameraShakeDisabled: Terraria.Main.DisableCameraShake === true,
            focusActive: this.FocusMode !== 'none',
            focusMode: this.FocusMode,
            focusNPCIndex: this.FocusNPCIndex,
            focusTicksLeft: Math.max(0, this.FocusUntilTick - tick),
            focusSmoothing: this.FocusSmoothing
        };
    }
}
