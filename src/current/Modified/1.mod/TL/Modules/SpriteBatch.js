const Main = new NativeClass('Terraria', 'Main');
const MXF_SpriteBatch = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteBatch');
const SpriteSortMode = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteSortMode');

export class SpriteBatch {
    static new(graphicsDevice) {
        const sb = MXF_SpriteBatch.new();
        sb['void .ctor(GraphicsDevice graphicsDevice)'](graphicsDevice);
        return sb;
    }
    
    static get Current() {
        return Main.spriteBatch;
    }
    
    static get Current2() {
        return Main.spriteBatch2;
    }
    
    static End(spriteBatch) {
        spriteBatch['void End()']();
    }
    
    static Begin(spriteBatch, spriteSortMode = SpriteSortMode.Deferred, blendState = null, samplerState = null, depthStencilState = null, rasterizerState = null, effect = null, transformMatrix = null, deferredBatch = true) {
        spriteBatch['void Begin(SpriteSortMode sortMode, BlendState blendState, SamplerState samplerState, DepthStencilState depthStencilState, RasterizerState rasterizerState, Effect effect, Nullable`1 transformMatrix, bool defferedBatch)'
        ](spriteSortMode, blendState, samplerState, depthStencilState, rasterizerState, effect, transformMatrix, deferredBatch);
    }
    
    static InsertNewBatchItem(spriteBatch, texture) {
        return spriteBatch['SpriteBatchItem InsertNewBatchItem(Texture2D texture)'](texture);
    }
    
    constructor(graphicsDevice) {
        this.Value = SpriteBatch.new(graphicsDevice);
    }
    
    End() {
        this.Value['void End()']();
    }
    
    Begin(spriteSortMode = SpriteSortMode.Deferred, blendState = null, samplerState = null, depthStencilState = null, rasterizerState = null, effect = null, transformMatrix = null, deferredBatch = true) {
        this.Value['void Begin(SpriteSortMode sortMode, BlendState blendState, SamplerState samplerState, DepthStencilState depthStencilState, RasterizerState rasterizerState, Effect effect, Nullable`1 transformMatrix, bool defferedBatch)'
        ](spriteSortMode, blendState, samplerState, depthStencilState, rasterizerState, effect, transformMatrix, deferredBatch);
    }
    
    InsertNewBatchItem(texture) {
        SpriteBatch.InsertNewBatchItem(this.Value, texture);
    }
    
    BindTo(spriteBatch) {
        this.Value = spriteBatch;
    }
}