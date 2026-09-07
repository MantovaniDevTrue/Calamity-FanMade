const System = {
    Nullable: new NativeClass('System', 'Nullable`1'),
    
    Boolean: new NativeClass('System', 'Boolean'),
    Byte: new NativeClass('System', 'Byte'),
    Int16: new NativeClass('System', 'Int16'),
    UInt16: new NativeClass('System', 'UInt16'),
    Int32: new NativeClass('System', 'Int32'),
    Int64: new NativeClass('System', 'Int64'),
    Single: new NativeClass('System', 'Single'),
    String: new NativeClass('System', 'String'),
    
    Convert: new NativeClass('System', 'Convert'),
    Math: new NativeClass('System', 'Math'),
    DateTime: new NativeClass('System', 'DateTime'),
    Array: new NativeClass('System', 'Array'),
    
    Collections: {
        Generic: {
            Dictionary: new NativeClass('System.Collections.Generic', 'Dictionary`2'),
            List: new NativeClass('System.Collections.Generic', 'List`1')
        }
    },
    
    IO: {
        File: new NativeClass('System.IO', 'File'),
        FileSystem: new NativeClass('System.IO', 'FileSystem'),
        Directory: new NativeClass('System.IO', 'Directory'),
        
        Path: new NativeClass('System.IO', 'Path'),
        
        BinaryWriter: new NativeClass('System.IO', 'BinaryWriter'),
        BinaryReader: new NativeClass('System.IO', 'BinaryReader'),
        
        Stream: new NativeClass('System.IO', 'Stream'),
        MemoryStream: new NativeClass('System.IO', 'MemoryStream'),
        
        SeekOrigin: new NativeClass('System.IO', 'SeekOrigin'),
        
        Compression: {
            CompressionMode: new NativeClass('System.IO.Compression', 'CompressionMode'),
            DeflateStream: new NativeClass('System.IO.Compression', 'DeflateStream')
        }
    }
}

const File = System.IO.File;
const Directory = System.IO.Directory;
const Encoding = new NativeClass('System.Text', 'Encoding');

const _exists = File['bool Exists(string path)'];
const _delete = File['void Delete(string path)'];
const _readBytes = File['byte[] ReadAllBytes(string path)'];
const _writeBytes = File['void WriteAllBytes(string path, byte[] bytes)'];
const _dirExists = Directory['bool Exists(string path)'];
const _mkDir = Directory['DirectoryInfo CreateDirectory(string path)'];
const _getDirectoryName = System.IO.Path['string GetDirectoryName(string path)'];
const _getBytes = Encoding.UTF8['byte[] GetBytes(string s)'];
const _getString = Encoding.UTF8['string GetString(byte[] bytes)'];

export class ModBridge {
    static _root = null;

    static _init() {
        if (this._root) return;
        this._root = tl.mod.path.split('/tl_files/')[0] + '/tl_files/.temp/ModBridge/';
        if (!_dirExists(this._root)) _mkDir(this._root);
    }

    static _presencePath(modId) {
        return this._root + modId + '.present';
    }

    static _dataPath(modId, key) {
        return this._root + modId + '__' + key + '.data';
    }

    static _read(path) {
        try { return _getString(_readBytes(path)); } catch { return null; }
    }

    static _write(path, text) {
        // Bridge keys may contain path segments (for example BossChecklist/1).
        // Make the target directory before WriteAllBytes so TLPro does not throw a native IO exception.
        try {
            const parent = _getDirectoryName(String(path));
            if (parent && !_dirExists(parent)) _mkDir(parent);
        } catch (_) { }
        _writeBytes(path, _getBytes(text));
    }

    static announce(modId) {
        this._init();
        this._write(this._presencePath(modId), '1');
    }

    static revoke(modId) {
        this._init();
        const p = this._presencePath(modId);
        if (_exists(p)) _delete(p);
    }

    static isActive(modId) {
        this._init();
        return _exists(this._presencePath(modId));
    }

    static set(modId, key, value) {
        this._init();
        this._write(this._dataPath(modId, key), JSON.stringify(value));
    }

    static get(modId, key, fallback = null) {
        this._init();
        const p = this._dataPath(modId, key);
        if (!_exists(p)) return fallback;
        const raw = this._read(p);
        if (raw === null) return fallback;
        try { return JSON.parse(raw); } catch { return fallback; }
    }

    static clear(modId, key) {
        this._init();
        const p = this._dataPath(modId, key);
        if (_exists(p)) _delete(p);
    }
}