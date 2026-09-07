export class BinarySerializer {
    static encode(obj) {
        const bytes = [];
        for (const [key, value] of Object.entries(obj)) {
            const keyBytes = this.strToBytes(key);
            bytes.push(keyBytes.length, ...keyBytes);

            if (typeof value === 'number') {
                bytes.push(1, ...this.float64ToBytes(value));
            } else if (typeof value === 'boolean') {
                bytes.push(2, value ? 1 : 0);
            } else if (typeof value === 'string') {
                const valBytes = this.strToBytes(value);
                // Legacy TLPro DB strings store length in one byte. Calamity worldgen
                // now persists metadata strings larger than 255 bytes, so use a new
                // backward-compatible record type for long values.
                if (valBytes.length <= 255) {
                    bytes.push(3, valBytes.length, ...valBytes);
                } else {
                    bytes.push(5, ...this.uint32ToBytes(valBytes.length), ...valBytes);
                }
            } else if (value === null) {
                bytes.push(4);
            } else {
                //throw new Error('Unsupported type: ' + typeof value);
                return new Uint8Array();
            }
        }
        return new Uint8Array(bytes);
    }

    static decode(arr) {
        const obj = {};
        let i = 0;
        while (i < arr.length) {
            const keyLen = arr[i++];
            if (!Number.isFinite(keyLen) || keyLen < 0 || i + keyLen + 1 > arr.length)
                break;
            const key = this.bytesToStr(arr.slice(i, i + keyLen));
            i += keyLen;

            const type = arr[i++];
            let value;
            switch (type) {
                case 1:
                    value = this.bytesToFloat64(arr.slice(i, i + 8));
                    i += 8;
                    break;
                case 2:
                    value = !!arr[i++];
                    break;
                case 3: {
                    const strLen = arr[i++];
                    if (!Number.isFinite(strLen) || strLen < 0 || i + strLen > arr.length)
                        return obj;
                    value = this.bytesToStr(arr.slice(i, i + strLen));
                    i += strLen;
                    break;
                }
                case 5: {
                    if (i + 4 > arr.length) return obj;
                    const strLen = this.bytesToUint32(arr.slice(i, i + 4));
                    i += 4;
                    if (!Number.isFinite(strLen) || strLen < 0 || i + strLen > arr.length)
                        return obj;
                    value = this.bytesToStr(arr.slice(i, i + strLen));
                    i += strLen;
                    break;
                }
                case 4:
                    value = null;
                    break;
                default:
                    //throw new Error('Unknown type ' + type);
                    value = null;
            }
            obj[key] = value;
        }
        return obj;
    }

    static strToBytes(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 0x80) bytes.push(code);
            else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
            else bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
        return bytes;
    }

    static bytesToStr(bytes) {
        let out = '', i = 0;
        while (i < bytes.length) {
            const b1 = bytes[i++];
            if (b1 < 0x80) out += String.fromCharCode(b1);
            else if (b1 < 0xe0) out += String.fromCharCode(((b1 & 0x1f) << 6) | (bytes[i++] & 0x3f));
            else out += String.fromCharCode(((b1 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
        }
        return out;
    }

    static uint32ToBytes(num) {
        const n = Math.max(0, Math.floor(Number(num) || 0)) >>> 0;
        return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
    }

    static bytesToUint32(bytes) {
        if (!bytes || bytes.length < 4) return 0;
        return ((bytes[0] || 0) | ((bytes[1] || 0) << 8) | ((bytes[2] || 0) << 16) | ((bytes[3] || 0) << 24)) >>> 0;
    }

    static float64ToBytes(num) {
        const buf = new ArrayBuffer(8);
        new DataView(buf).setFloat64(0, num, true);
        return Array.from(new Uint8Array(buf));
    }

    static bytesToFloat64(bytes) {
        const buf = new ArrayBuffer(8);
        new Uint8Array(buf).set(bytes);
        return new DataView(buf).getFloat64(0, true);
    }
}