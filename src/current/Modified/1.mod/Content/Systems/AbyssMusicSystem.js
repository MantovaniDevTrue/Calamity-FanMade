import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { AbyssLayer1Runtime } from './../../Core/AbyssLayer1Runtime.js';

const TRACKS = Object.freeze({
    1: 'Sounds/Music/AbyssLayer1.ogg',
    2: 'Sounds/Music/AbyssLayer2.ogg',
    3: 'Sounds/Music/AbyssLayer3.ogg',
    4: 'Sounds/Music/AbyssLayer4.ogg'
});
const LAYER3_ALT = 'Sounds/Music/AbyssLayer3Alt.ogg';
const FADE_TICKS = 36;

function Clamp01(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

class AndroidLoopingMusic {
    static _bindings = null;
    static _cache = new Map();
    static LastError = '';

    static _getBindings() {
        if (this._bindings) return this._bindings;
        const SystemArray = new NativeClass('System', 'Array');
        const SystemType = new NativeClass('System', 'Type');
        const ObjectType = SystemType['Type GetType(string typeName)']('System.Object');
        const CreateInstance = SystemArray['Array CreateInstance(Type elementType, int length)'];
        const SetValue = SystemArray['void SetValue(object value, int index)'];
        const AndroidJavaObject = new NativeClass('UnityEngine', 'AndroidJavaObject');
        const SystemFile = new NativeClass('System.IO', 'File');
        this._bindings = {
            ObjectType,
            CreateInstance,
            SetValue,
            AndroidJavaObject,
            Exists: SystemFile['bool Exists(string path)'],
            Construct: AndroidJavaObject['void .ctor(string className, object[] args)'],
            CallVoid: AndroidJavaObject['void Call(string methodName, object[] args)']
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

    static _call(handle, name, values = []) {
        if (!handle || handle.released || !handle.player) return false;
        try {
            handle.bindings.CallVoid(handle.player, name, this._args(handle.bindings, values));
            return true;
        } catch (e) {
            this.LastError = String(e && e.message ? e.message : e);
            return false;
        }
    }

    static _create(relativePath) {
        let handle = null;
        try {
            const b = this._getBindings();
            const filePath = tl.mod.path + '/' + relativePath;
            if (!b.Exists(filePath)) throw new Error(`Music not found: ${filePath}`);
            const player = b.AndroidJavaObject.new();
            b.Construct(player, 'android.media.MediaPlayer', this._args(b));
            handle = { player, bindings: b, relativePath, filePath, released: false, started: false, volume: -1 };
            b.CallVoid(player, 'setDataSource', this._args(b, [{ value: filePath, type: 'string' }]));
            b.CallVoid(player, 'prepare', this._args(b));
            b.CallVoid(player, 'setLooping', this._args(b, [{ value: true, type: 'bool' }]));
            b.CallVoid(player, 'setVolume', this._args(b, [
                { value: 0, type: 'float' },
                { value: 0, type: 'float' }
            ]));
            this._cache.set(relativePath, handle);
            this.LastError = '';
            return handle;
        } catch (e) {
            this.LastError = String(e && e.message ? e.message : e);
            try { tl.log(`[CalamityPort AbyssMusic] ${this.LastError}`); } catch (_) { }
            if (handle) this.Release(handle);
            return null;
        }
    }

    static Get(relativePath) {
        let handle = this._cache.get(relativePath);
        if (handle && !handle.released) return handle;
        return this._create(relativePath);
    }

    static Start(handle) {
        if (!handle || handle.released) return false;
        if (handle.started) return true;
        if (!this._call(handle, 'start')) return false;
        handle.started = true;
        return true;
    }

    static Pause(handle) {
        if (!handle || handle.released || !handle.started) return;
        this._call(handle, 'pause');
        handle.started = false;
    }

    static SetVolume(handle, value) {
        if (!handle || handle.released) return;
        const v = Clamp01(value);
        if (Math.abs(Number(handle.volume) - v) < 0.004) return;
        if (this._call(handle, 'setVolume', [
            { value: v, type: 'float' },
            { value: v, type: 'float' }
        ])) handle.volume = v;
    }

    static Release(handle) {
        if (!handle || handle.released) return;
        try { this._call(handle, 'stop'); } catch (_) { }
        handle.released = true;
        try {
            handle.bindings.CallVoid(handle.player, 'release', this._args(handle.bindings));
        } catch (_) { }
        handle.player = null;
        handle.started = false;
        this._cache.delete(handle.relativePath);
    }

    static ReleaseAll() {
        for (const handle of Array.from(this._cache.values())) this.Release(handle);
        this._cache.clear();
    }
}

export class AbyssMusicSystem extends ModSystem {
    constructor() {
        super();
        this.CurrentLayer = 0;
        this.CurrentPath = '';
        this.Current = null;
        this.Outgoing = null;
        this.CurrentGain = 0;
        this.OutgoingGain = 0;
        this.Layer3Alt = false;
        this.LastLogLayer = -1;
        this.CandidateLayer = 0;
        this.CandidatePath = '';
        this.CandidateTicks = 0;
        this.VolumeTick = 0;
        this.IdleProbe = 0;
    }

    OnWorldLoad() { this.Reset(false); }
    OnWorldUnload() { this.Reset(true); }
    PreSaveAndQuit() { this.Reset(true); }

    DesiredPath(layer) {
        if (layer === 3 && this.Layer3Alt) return LAYER3_ALT;
        return TRACKS[layer] || '';
    }

    GetLayer() {
        try {
            if (Terraria.Main.gameMenu || Terraria.Main.netMode === 2) return 0;
            const player = Terraria.Main.LocalPlayer;
            if (!player || !player.active || player.dead) return 0;
            return Math.max(0, Math.min(4, Number(AbyssLayer1Runtime.GetPlayerLayer(player)) || 0));
        } catch (_) { return 0; }
    }

    BeginTrack(layer, path) {
        if (this.Outgoing && this.Outgoing !== this.Current) {
            AndroidLoopingMusic.SetVolume(this.Outgoing, 0);
            AndroidLoopingMusic.Pause(this.Outgoing);
            this.Outgoing = null;
            this.OutgoingGain = 0;
        }
        if (this.Current) {
            this.Outgoing = this.Current;
            this.OutgoingGain = Math.max(0, this.CurrentGain);
        }
        this.Current = path ? AndroidLoopingMusic.Get(path) : null;
        this.CurrentLayer = layer;
        this.CurrentPath = path;
        this.CurrentGain = 0;
        if (this.Current) AndroidLoopingMusic.Start(this.Current);
        if (this.LastLogLayer !== layer) {
            this.LastLogLayer = layer;
            try { tl.log(`[CalamityPort AbyssMusic] layer=${layer} track=${path || 'none'}`); } catch (_) { }
        }
    }

    Reset(release = false) {
        if (release) AndroidLoopingMusic.ReleaseAll();
        else {
            if (this.Current) AndroidLoopingMusic.Pause(this.Current);
            if (this.Outgoing && this.Outgoing !== this.Current) AndroidLoopingMusic.Pause(this.Outgoing);
        }
        this.CurrentLayer = 0;
        this.CurrentPath = '';
        this.Current = null;
        this.Outgoing = null;
        this.CurrentGain = 0;
        this.OutgoingGain = 0;
        this.LastLogLayer = -1;
        this.CandidateLayer = 0;
        this.CandidatePath = '';
        this.CandidateTicks = 0;
        this.VolumeTick = 0;
        this.IdleProbe = 0;
    }

    Update() {
        // Outside the Abyss there is no fade or MediaPlayer work to maintain. A 6 Hz
        // layer probe is enough to detect entry, then candidate/current tracks restore
        // full-rate observation immediately for smooth transitions and fades.
        if (!this.Current && !this.Outgoing && this.CurrentLayer === 0 && this.CandidateLayer === 0) {
            this.IdleProbe = (this.IdleProbe + 1) % 10;
            if (this.IdleProbe !== 0) return;
        } else this.IdleProbe = 0;
        const observedLayer = this.GetLayer();
        const observedPath = this.DesiredPath(observedLayer);
        if (observedPath === this.CurrentPath && observedLayer === this.CurrentLayer) {
            this.CandidateLayer = observedLayer;
            this.CandidatePath = observedPath;
            this.CandidateTicks = 0;
        } else {
            if (observedLayer === this.CandidateLayer && observedPath === this.CandidatePath) this.CandidateTicks++;
            else { this.CandidateLayer = observedLayer; this.CandidatePath = observedPath; this.CandidateTicks = 1; }
            // Layer borders are only a handful of tiles apart. Require a short stable
            // residence before swapping Android MediaPlayers so vertical movement around
            // L1/L2/L3 boundaries cannot trigger JNI track churn every second.
            const needed = (observedLayer === 0 || this.CurrentLayer === 0) ? 8 : 24;
            if (this.CandidateTicks >= needed) {
                this.BeginTrack(observedLayer, observedPath);
                this.CandidateTicks = 0;
            }
        }

        let musicVolume = 1;
        try { musicVolume = Clamp01(Terraria.Main.musicVolume); } catch (_) { }
        const step = 1 / FADE_TICKS;
        this.VolumeTick = (this.VolumeTick + 1) % 3;
        const pushVolume = this.VolumeTick === 0;

        if (this.Current) {
            this.CurrentGain = Math.min(1, this.CurrentGain + step);
            if (pushVolume || this.CurrentGain >= 0.999) AndroidLoopingMusic.SetVolume(this.Current, this.CurrentGain * musicVolume);
        }
        if (this.Outgoing) {
            this.OutgoingGain = Math.max(0, this.OutgoingGain - step);
            if (pushVolume || this.OutgoingGain <= 0.001) AndroidLoopingMusic.SetVolume(this.Outgoing, this.OutgoingGain * musicVolume);
            if (this.OutgoingGain <= 0.001) {
                AndroidLoopingMusic.Pause(this.Outgoing);
                this.Outgoing = null;
            }
        }
    }

    GetStatus() {
        return `layer=${this.CurrentLayer} path=${this.CurrentPath || 'none'} gain=${this.CurrentGain.toFixed(2)} alt3=${this.Layer3Alt} error=${AndroidLoopingMusic.LastError || 'none'}`;
    }
}
