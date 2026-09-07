import { System } from './../ModImports.js';

export class FileManager {
    static get path() {
        return this._path;
    }
    
    static IsSafe(path) {
        return path.startsWith(this.path);
    }
    
    static Exists(path) {
        if (this.IsSafe(path)) {
            return System.IO.File['bool Exists(string path)'](path);
        }
        return false;
    }
    
    static ExistsDirectory(path) {
        if (this.IsSafe(path)) {
            return System.IO.Directory['bool Exists(string path)'](path);
        }
        return false;
    }
    
    static CreateDirectory(path) {
        if (this.IsSafe(path)) {
            return System.IO.Directory['DirectoryInfo CreateDirectory(string path)'](path);
        }
    }
    
    static ListFiles(path) {
        if (!this.IsSafe(path) || !this.ExistsDirectory(path)) return [];
        return System.IO.Directory['string[] GetFiles(string path)'](path);
    }
    
    static ListDirectories(path) {
        if (!this.IsSafe(path) || !this.ExistsDirectory(path)) return [];
        return System.IO.Directory['string[] GetDirectories(string path)'](path);
    }
    
    static ReadBytes(path) {
        if (this.Exists(path)) {
            return System.IO.File['byte[] ReadAllBytes(string path)'](path);
        }
        return [];
    }
    
    static WriteBytes(path, bytes = []) {
        if (this.IsSafe(path)) {
            System.IO.File['void WriteAllBytes(string path, byte[] bytes)'](path, bytes);
            return true;
        }
        return false;
    }
    
    static Move(from, to) {
        if (this.IsSafe(from) && this.IsSafe(to)) {
            System.IO.FileSystem['void MoveFile(string sourceFullPath, string destFullPath)'](from, to);
        }
    }
    
    static Delete(path) {
        if (this.IsSafe(path) && this.Exists(path)) {
            System.IO.File['void Delete(string path)'](path);
        }
    }
}