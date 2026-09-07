import { System } from './../ModImports.js';

export class Prototypes {
    static Initialize() {
        // TL
        if (!tl.device) tl.device = {};
        
        // Arrays
        function makeGeneric(Type) {
            if (typeof Type === 'string') {
                Type = Prototypes._getTypeByName(Type);
                if (!Type) return this;
            }
            const list = System.Collections.Generic.List.makeGeneric(Type).new();
            list['void .ctor()']();
            for (let i = 0; i < this.length; i++) {
                list.Add(this[i]);
            }
            return list.ToArray();
        }
        
        Uint8Array.prototype.makeGeneric = makeGeneric;
        Array.prototype.makeGeneric = makeGeneric;
    }
    
    static _getTypeByName(name) {
        name = name.toLowerCase();
        let Type = null;
        switch (name) {
            case 'bool':
                Type = System.Boolean;
                break;
            case 'byte':
                Type = System.Byte;
                break;
            case 'int':
                Type = System.Int32;
                break;
            case 'float':
                Type = System.Single;
                break;
            case 'short':
                Type = System.Int16;
                break;
            case 'ushort':
                Type = System.UInt16;
                break;
            case 'long':
                Type = System.Int64;
                break;
            case 'string':
                Type = System.String;
                break
        }
        return Type;
    }
}