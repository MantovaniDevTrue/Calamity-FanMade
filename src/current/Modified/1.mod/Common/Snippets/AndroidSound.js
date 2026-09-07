import { ModSystem } from './../../TL/ModSystem.js';

export class AndroidSound {
    static _bindings = null;
    static _active = new Set();
    static _channels = new Map();
    static _lastPlayMs = new Map();
    static _cachedExclusive = new Map();
    static LastError = '';
    static _getBindings() {
        if (this._bindings)
            return this._bindings;
        const SystemArray = new NativeClass('System', 'Array');
        const SystemType = new NativeClass('System', 'Type');
        const ObjectType = SystemType['Type GetType(string typeName)']('System.Object');
        const CreateInstance = SystemArray['Array CreateInstance(Type elementType, int length)'];
        const SetValue = SystemArray['void SetValue(object value, int index)'];
        const AndroidJavaObject = new NativeClass('UnityEngine', 'AndroidJavaObject');
        const SystemFile = new NativeClass('System.IO', 'File');
        const Exists = SystemFile['bool Exists(string path)'];
        const Construct = AndroidJavaObject['void .ctor(string className, object[] args)'];
        const CallVoid = AndroidJavaObject['void Call(string methodName, object[] args)'];
        this._bindings = {
            ObjectType,
            CreateInstance,
            SetValue,
            AndroidJavaObject,
            Exists,
            Construct,
            CallVoid
        };
        return this._bindings;
    }
    static _args(bindings, values = []) {
        const args = bindings.CreateInstance(bindings.ObjectType, values.length);
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            bindings.SetValue(args, NativeObject.wrap(value.value, value.type), i);
        }
        return args;
    }
    static _safeCall(handle, methodName, values = []) {
        if (!handle || handle.released || !handle.player)
            return false;
        try {
            const b = handle.bindings;
            b.CallVoid(handle.player, methodName, this._args(b, values));
            return true;
        } catch (e) {
            return false;
        }
    }
    static _resolveVolumes(defaultVolume, targetX, targetY, maxDistance) {
        let left = Math.max(0, Math.min(1, Number(defaultVolume) || 0));
        let right = left;
        if (targetX !== null && targetY !== null) {
            try {
                const Main = new NativeClass('Terraria', 'Main');
                const localPlayer = Main.LocalPlayer;
                const center = localPlayer && Terraria.PlayerCenter(localPlayer);
                if (center) {
                    const dx = Number(targetX) - Number(center.X);
                    const dy = Number(targetY) - Number(center.Y);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > maxDistance) {
                        return { skipped: true, left: 0, right: 0 };
                    }
                    const intensity = 1 - distance / Math.max(1, maxDistance);
                    const pan = Math.max(-1, Math.min(1, dx / Math.max(1, maxDistance)));
                    left *= intensity * (pan < 0 ? 1 : 1 - pan);
                    right *= intensity * (pan > 0 ? 1 : 1 + pan);
                }
            } catch (e) { }
        }
        return { skipped: false, left, right };
    }
    static _start(fileName, defaultVolume, targetX, targetY, maxDistance) {
        let handle = null;
        try {
            const volumes = this._resolveVolumes(defaultVolume, targetX, targetY, maxDistance);
            if (volumes.skipped)
                return { ok: false, skipped: true, error: 'fora do alcance' };
            const b = this._getBindings();
            const filePath = tl.mod.path + '/' + String(fileName);
            if (!b.Exists(filePath))
                throw new Error(`Audio not found: ${filePath}`);
            const player = b.AndroidJavaObject.new();
            const emptyArgs = this._args(b);
            b.Construct(player, 'android.media.MediaPlayer', emptyArgs);
            handle = {
                player, bindings: b, released: false, filePath, channel: null, generation: 1, cachedKey: null
            };
            b.CallVoid(player, 'setDataSource', this._args(b, [
                { value: filePath, type: 'string' }
            ]));
            b.CallVoid(player, 'prepare', emptyArgs);
            b.CallVoid(player, 'setVolume', this._args(b, [
                { value: volumes.left, type: 'float' },
                { value: volumes.right, type: 'float' }
            ]));
            b.CallVoid(player, 'start', emptyArgs);
            this._active.add(handle);
            this.LastError = '';
            return { ok: true, path: filePath, handle };
        } catch (e) {
            const message = String(e && e.message ? e.message : e);
            this.LastError = message;
            try {
                tl.log(`[AndroidSound] ${message}`);
            } catch (ignored) { }
            if (handle)
                this.Release(handle);
            return { ok: false, error: message };
        }
    }
    static _scheduleRelease(handle, releaseTicks) {
        const generation = Math.floor(Number(handle && handle.generation) || 0);
        ModSystem.SetTimeout(() => {
            if (!handle || handle.released || Math.floor(Number(handle.generation) || 0) !== generation)
                return;
            AndroidSound.Release(handle);
        }, Math.max(30, Math.floor(Number(releaseTicks) || 90)));
    }
    static _restartPrepared(handle, volumes) {
        if (!handle || handle.released || !handle.player)
            return false;
        try {
            this._safeCall(handle, 'pause');
            this._safeCall(handle, 'seekTo', [{ value: 0, type: 'int' }]);
            this._safeCall(handle, 'setVolume', [
                { value: volumes.left, type: 'float' },
                { value: volumes.right, type: 'float' }
            ]);
            this._safeCall(handle, 'start');
            handle.generation = Math.floor(Number(handle.generation) || 0) + 1;
            return true;
        } catch (e) {
            return false;
        }
    }
    static _scheduleCachedPause(handle, channel, releaseTicks) {
        const generation = Math.floor(Number(handle && handle.generation) || 0);
        ModSystem.SetTimeout(() => {
            if (!handle || handle.released || Math.floor(Number(handle.generation) || 0) !== generation)
                return;
            if (this._channels.get(channel) !== handle)
                return;
            this._safeCall(handle, 'pause');
            this._channels.delete(channel);
        }, Math.max(30, Math.floor(Number(releaseTicks) || 90)));
    }
    static PlayOneShot(fileName, defaultVolume = 1.0, targetX = null, targetY = null, maxDistance = 1200, releaseTicks = 90) {
        const result = this._start(fileName, defaultVolume, targetX, targetY, maxDistance);
        if (result.ok)
            this._scheduleRelease(result.handle, releaseTicks);
        return { ok: result.ok, skipped: result.skipped, error: result.error, path: result.path };
    }
    static PlayExclusive(channelName, fileName, defaultVolume = 1.0, targetX = null, targetY = null, maxDistance = 1200, releaseTicks = 90, cooldownTicks = 0, force = false) {
        const channel = String(channelName || 'default');
        const now = Date.now();
        const cooldownMs = Math.max(0, Number(cooldownTicks) || 0) * (1000 / 60);
        const last = Number(this._lastPlayMs.get(channel) || 0);
        if (!force && cooldownMs > 0 && now - last < cooldownMs) {
            return { ok: false, skipped: true, error: 'cooldown' };
        }
        this.StopChannel(channel);
        const result = this._start(fileName, defaultVolume, targetX, targetY, maxDistance);
        if (!result.ok)
            return { ok: false, skipped: result.skipped, error: result.error };
        result.handle.channel = channel;
        this._channels.set(channel, result.handle);
        this._lastPlayMs.set(channel, now);
        this._scheduleRelease(result.handle, releaseTicks);
        return { ok: true, path: result.path };
    }
    static PlayCachedExclusive(channelName, fileName, defaultVolume = 1.0, targetX = null, targetY = null, maxDistance = 1200, releaseTicks = 90, cooldownTicks = 0, force = false) {
        const channel = String(channelName || 'default');
        const now = Date.now();
        const cooldownMs = Math.max(0, Number(cooldownTicks) || 0) * (1000 / 60);
        const last = Number(this._lastPlayMs.get(channel) || 0);
        if (!force && cooldownMs > 0 && now - last < cooldownMs)
            return { ok: false, skipped: true, error: 'cooldown' };

        const volumes = this._resolveVolumes(defaultVolume, targetX, targetY, maxDistance);
        if (volumes.skipped)
            return { ok: false, skipped: true, error: 'fora do alcance' };

        const filePath = tl.mod.path + '/' + String(fileName);
        const cacheKey = `${channel}|${filePath}`;
        const previous = this._channels.get(channel);
        if (previous && !previous.released && previous !== this._cachedExclusive.get(cacheKey))
            this._safeCall(previous, 'pause');

        let handle = this._cachedExclusive.get(cacheKey);
        if (handle && !handle.released) {
            if (!this._restartPrepared(handle, volumes)) {
                this.Release(handle);
                handle = null;
                this._cachedExclusive.delete(cacheKey);
            }
        }

        if (!handle) {
            const result = this._start(fileName, defaultVolume, targetX, targetY, maxDistance);
            if (!result.ok)
                return { ok: false, skipped: result.skipped, error: result.error };
            handle = result.handle;
            handle.cachedKey = cacheKey;
            this._cachedExclusive.set(cacheKey, handle);
        }

        handle.channel = channel;
        this._channels.set(channel, handle);
        this._lastPlayMs.set(channel, now);
        this._scheduleCachedPause(handle, channel, releaseTicks);
        return { ok: true, path: filePath, cached: true };
    }
    static StopChannel(channelName) {
        const channel = String(channelName || 'default');
        const handle = this._channels.get(channel);
        if (handle)
            this.Release(handle);
        this._channels.delete(channel);
    }
    static Release(handle) {
        if (!handle || handle.released)
            return;
        try {
            this._safeCall(handle, 'stop');
        } catch (e) { }
        handle.released = true;
        try {
            if (handle.player && handle.bindings) {
                handle.bindings.CallVoid(handle.player, 'release', this._args(handle.bindings));
            }
        } catch (e) { }
        if (handle.channel && this._channels.get(handle.channel) === handle) {
            this._channels.delete(handle.channel);
        }
        if (handle.cachedKey && this._cachedExclusive.get(handle.cachedKey) === handle)
            this._cachedExclusive.delete(handle.cachedKey);
        this._active.delete(handle);
        handle.player = null;
    }
    static ReleaseAll() {
        for (const handle of Array.from(this._active))
            this.Release(handle);
        this._active.clear();
        this._channels.clear();
        this._cachedExclusive.clear();
        this._lastPlayMs.clear();
    }
}
