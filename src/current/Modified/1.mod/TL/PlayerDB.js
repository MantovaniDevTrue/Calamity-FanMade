import { DatabaseManager } from './Core/DatabaseManager.js';
/**
 * Allows you to save data in the current player.
 * The saved data persists between sessions.
 * It only accepts primitive values: number, string, boolean
 * Example:
 * 
 * PlayerDB.set('key', 10);
 * PlayerDB.get('key'); // 10
 * 
 * PlayerDB.has('key'); // true
 * PlayerDB.delete('key');
 * PlayerDB.has('key'); // false
 */
export class PlayerDB extends DatabaseManager {
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