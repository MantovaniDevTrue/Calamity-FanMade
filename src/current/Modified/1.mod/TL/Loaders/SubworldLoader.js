import { Terraria, Modules } from './../ModImports.js';
import { FileManager } from './../Core/FileManager.js';

const IntPtr = new NativeClass('System', 'IntPtr');

export class SubworldLoader {
    static Subworlds = [];
    
    static ActiveSubworld = null;
    static NeedsSaving = false;
    static RunLater = null;
    static Joining = false;
    static Leaving = false;
    
    static get AnySubworldActive() {
        return SubworldLoader.ActiveSubworld !== null;
    }
    
    static getByName(name) {
        return this.Subworlds.find(w => w.constructor.name === name);
    }
    
    static get WorldsPath() {
        return tl.mod.path.split('/tl_files/')[0] + '/Worlds/';
    }
    static get SubworldsPath() {
        return tl.mod.path.split('/tl_files/')[0] + '/Subworlds/';
    }
    
    static CheckFile(path) {
        if (!tl.file.exists(path)) {
            tl.log('\nSubworld not found: ' + path);
            return false;
        }
        return true;
    }
    
    static SaveSubworld(subworld) {
        if (!SubworldLoader.NeedsSaving) return;
        const fileName = subworld.Path.substring(subworld.Path.lastIndexOf('/') + 1);
        const worldPath = this.WorldsPath + fileName;
        if (!FileManager.Exists(worldPath)) return;
        FileManager.WriteBytes(subworld.Path, FileManager.ReadBytes(worldPath));
        FileManager.Delete(worldPath);
        if (FileManager.Exists(worldPath + '.bak')) {
            FileManager.Delete(worldPath + '.bak');
        }
        if (FileManager.Exists(worldPath + '.subworld.meta')) {
            FileManager.Delete(worldPath + '.subworld.meta');
        }
        SubworldLoader.NeedsSaving = false;
    }
    
    static LoadSubworld(subworld) {
        const fileName = subworld.Path.substring(subworld.Path.lastIndexOf('/') + 1);
        FileManager.WriteBytes(this.WorldsPath + fileName, FileManager.ReadBytes(subworld.Path));
        this.WriteSubworldMeta(subworld, this.WorldsPath + fileName);
        const playerName = Terraria.Main.ActivePlayerFileData.Name;
        SubworldLoader.Joining = true;
        Terraria.WorldGen['void SaveAndQuit()']();
        SubworldLoader.RunLater = function() {
            const plr = this.FindPlr(playerName);
            const wld = this.FindWld(this.WorldsPath + fileName);
            if (plr && wld) {
                SubworldLoader.ActiveSubworld = subworld;
                SubworldLoader.NeedsSaving = true;
                plr.SetAsActive();
                wld.SetAsActive();
                Terraria.Main.menuMode = 10;
                Terraria.WorldGen['void playWorld()']();
            }
            SubworldLoader.Joining = false;
        }
    }
    
    static LeaveSubworld() {
        if (!SubworldLoader.AnySubworldActive) return;
        SubworldLoader.Leaving = true;
        SubworldLoader.ActiveSubworld.OnLeave(Terraria.Main.LocalPlayer);
        Terraria.WorldGen['void SaveAndQuit()']();
        SubworldLoader.Leaving = false;
        SubworldLoader.RunLater = function() {
            const plr = this.FindPlr(SubworldLoader.ActiveSubworld.MainPlayer);
            const wld = this.FindWld(SubworldLoader.ActiveSubworld.MainWorld);
            SubworldLoader.SaveSubworld(SubworldLoader.ActiveSubworld);
            SubworldLoader.ActiveSubworld = null;
            if (plr && wld) {
                plr.SetAsActive();
                wld.SetAsActive();
                Terraria.Main.menuMode = 10;
                Terraria.WorldGen['void playWorld()']();
            }
        }
    }
    
    static Join(name) {
        const is32bits = IntPtr.Size === 4;
        if (is32bits || Terraria.Main.gameMenu || Terraria.Main.gamePaused || SubworldLoader.AnySubworldActive) return;
        const subworld = this.getByName(name);
        if (!subworld) return;
        const subworldsPath = this.SubworldsPath;
        if (!FileManager.ExistsDirectory(subworldsPath)) {
            FileManager.CreateDirectory(subworldsPath);
        }
        const wld = Terraria.Main.ActiveWorldFileData;
        const wldPath = subworldsPath + wld.Path.substring(wld.Path.lastIndexOf('/') + 1).replace('.wld', '') + '/';
        if (!FileManager.ExistsDirectory(wldPath)) {
            FileManager.CreateDirectory(wldPath);
        }
        subworld.MainPlayer = Terraria.Main.ActivePlayerFileData.Name;
        subworld.MainWorld = wld.Path;
        subworld.Path = wldPath + subworld.WorldFilePath.substring(subworld.WorldFilePath.lastIndexOf('/') + 1).replace('.wld', '') + '.wld';
        if (!FileManager.Exists(subworld.Path)) {
            const path = 'Content/' + subworld.WorldFilePath.replace('.wld', '') + '.wld';
            if (!this.CheckFile(path)) return;
            const bytes = FileManager.ReadBytes(tl.mod.path + '/' + path);
            FileManager.WriteBytes(subworld.Path, bytes);
        }
        this.LoadSubworld(subworld);
    }
    
    static FindPlr(name) {
        Terraria.Main['void LoadPlayers(bool canFullRefresh)'](true);
        for (let i = 0; i < Terraria.Main.PlayerList.Count; i++) {
            const plr = Terraria.Main.PlayerList['PlayerFileData get_Item(int index)'](i);
            if (plr && plr.Name === name) return plr;
        }
    }
    
    static FindWld(path) {
        Terraria.Main['void LoadWorlds(bool canFullRefresh)'](true);
        for (let i = 0; i < Terraria.Main.WorldList.Count; i++) {
            const wld = Terraria.Main.WorldList['WorldFileData get_Item(int index)'](i);
            if (wld && wld.Path === path) return wld;
        }
    }
    
    static ReadSubworldMeta(worldPath) {
        const metaPath = worldPath + '.subworld.meta';
        if (!FileManager.Exists(metaPath)) return null;
        const bytes = FileManager.ReadBytes(metaPath);
        let text = '';
        for (let i = 0; i < bytes.length; i++) {
            text += String.fromCharCode(bytes[i]);
        }
        const data = {};
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const sep = lines[i].indexOf('=');
            if (sep === -1) continue;
            data[lines[i].substring(0, sep)] = lines[i].substring(sep + 1);
        }
        return data;
    }
    
    static WriteSubworldMeta(subworld, worldPath) {
        const metaPath = worldPath + '.subworld.meta';
        const text = 'mainWorld=' + subworld.MainWorld + '\n' + 'subworldPath=' + subworld.Path + '\n' + 'player=' + subworld.MainPlayer;
        const bytes = [].makeGeneric('byte').cloneResized(text.length);
        for (let i = 0; i < text.length; i++) {
            bytes[i] = text.charCodeAt(i) & 0xFF;
        }
        FileManager.WriteBytes(metaPath, bytes);
    }
    
    static RecoverSubworlds() {
        for (let i = 0; i < Terraria.Main.WorldList.Count; i++) {
            const wld = Terraria.Main.WorldList['WorldFileData get_Item(int index)'](i);
            if (!wld) continue;
            const meta = this.ReadSubworldMeta(wld.Path);
            if (!meta) continue;
            if (FileManager.Exists(wld.Path)) {
                FileManager.WriteBytes(meta.subworldPath, FileManager.ReadBytes(wld.Path));
                FileManager.Delete(wld.Path);
            }
            FileManager.Delete(wld.Path + '.subworld.meta');
        }
    }
    
    static DeleteSubworlds(wld) {
        const name = wld.Path.substring(wld.Path.lastIndexOf('/') + 1).replace('.wld', '');
        const path = this.SubworldsPath + name + '/';
        if (!FileManager.ExistsDirectory(path)) return;
        const files = FileManager.ListFiles(path);
        for (let i = 0; i < files.length; i++) {
            FileManager.Delete(files[i]);
        }
    }
}