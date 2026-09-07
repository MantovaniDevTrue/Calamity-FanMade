import { FileManager } from './FileManager.js';
import { BinarySerializer } from './BinarySerializer.js';

const Config = {
    Namespace: 'ex:'
};

export class DatabaseManager {
    path = '';
    data = {};
    initialized = false;
    
    Initialize() {
        if (this.CheckFile()) {
            this.Load();
            this.initialized = true;
            return;
        }
        this.Clear();
    }
    
    CheckFile() {
        if (FileManager.Exists(this.path)) return true;
        FileManager.WriteBytes(this.path, new Uint8Array().makeGeneric('byte'));
        return FileManager.Exists(this.path);
    }
    
    Load() {
        if (this.initialized) return;
        const data = BinarySerializer.decode(Array.from(FileManager.ReadBytes(this.path)));
        for (const key of Object.keys(data)) {
            if (key.startsWith(Config.Namespace)) {
                this.data[key.replace(Config.Namespace, '')] = data[key];
            }
        }
        this.initialized = true;
    }
    
    Save() {
        if (!this.initialized) return;
        const oldData = BinarySerializer.decode(Array.from(FileManager.ReadBytes(this.path)));
        const newData = {};
        for (const key of Object.keys(this.data)) {
            newData[`${Config.Namespace}${key}`] = this.data[key];
        }
        Object.assign(oldData, newData);
        for (const key of Object.keys(oldData)) {
            if (oldData[key] == null) delete oldData[key];
        }
        FileManager.WriteBytes(this.path, BinarySerializer.encode(oldData).makeGeneric('byte'));
    }
    
    Clear() {
        this.path = '';
        this.data = {};
        this.initialized = false;
    }
    
    set(key, value) {
        if (!this.initialized || !DatabaseManager.isPrimitive(value)) return;
        if (this.has(key)) {
            if (value !== this.data[key]) this.data[key] = value;
        }
        else this.data[key] = value;
    }
    
    get(key) {
        return this.data[key];
    }
    
    getAllKeys() {
        return Object.keys(this.data);
    }
    
    has(key) {
        if (!this.initialized) return false;
        let has = this.data.hasOwnProperty(key);
        if (has && this.data[key] == null)
            return false;
        return has;
    }
    
    delete(key) {
        this.set(key, null);
    }
    
    deleteAllKeys() {
        for (const key in this.data) {
            this.set(key, null);
        }
    }
    
    static isPrimitive(value) {
        return value === null || (typeof value !== 'object' && typeof value !== 'function');
    }
}