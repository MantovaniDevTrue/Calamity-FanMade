import { DatabaseManager } from './Core/DatabaseManager.js';
/**
 * Allows you to save data in the current world.
 * The saved data persists between sessions.
 * It only accepts primitive values: number, string, boolean
 * Example:
 * 
 * WorldDB.set('key', 10);
 * WorldDB.get('key'); // 10
 * 
 * WorldDB.has('key'); // true
 * WorldDB.delete('key');
 * WorldDB.has('key'); // false
 */
export class WorldDB extends DatabaseManager {
    constructor(path) {
        super();
        this.path = path;
        this.data = {};
    }
    
    static set(key, value) {
        if (this.Instance) this.Instance.set(key, value);
    }
    static get(key) {
        if (this.Instance) return this.Instance.get(key);
        return null;
    }
    static getAllKeys() {
        if (this.Instance) return this.Instance.getAllKeys();
        return [];
    }
    static has(key) {
        if (this.Instance) return this.Instance.has(key);
        return false;
    }
    static delete(key) {
        if (this.Instance) this.Instance.delete(key);
    }
    static deleteAllKeys() {
        if (this.Instance) this.Instance.deleteAllKeys();
    }
}