import { ModAsset } from './ModAsset.js';
import { Microsoft } from './ModImports.js';

export class ModTexture {
    static overrideFrames = {};
    constructor(name, horizontalFrames = -1, frameCount = -1, ticksPerFrame = 100) {
        this.name = name;
        this.path = name + '.png';
        this.exists = tl.file.exists(this.path);
        if (this.exists) {
            this.texture = frameCount > -1 ? tl.texture.loadAnimation(this.path, frameCount, ticksPerFrame) : tl.texture.load(this.path);
            this.texture_path = [tl.mod.uuid, name].join('/');
            this.asset = new ModAsset(Microsoft.Xna.Framework.Graphics.Texture2D, this.texture_path, this.texture);
            this.texture._sourceLoadAsset = this.texture_path;
            if (horizontalFrames !== -1) {
                ModTexture.overrideFrames[this.texture_path] = horizontalFrames;
            }
        }
    }
}