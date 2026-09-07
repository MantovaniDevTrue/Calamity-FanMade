import { Terraria, Microsoft } from './../ModImports.js';
import { Color } from './Color.js';
import { Vector2 } from './Vector2.js';

export class Effects {
    static get SpriteEffects() {
        return Microsoft.Xna.Framework.Graphics.SpriteEffects;
    }
    
    static NewDust(position, width, height, dustType, speedX = 0, speedY = 0, alpha = 0, color = Color.White, scale = 1.0) {
        return Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'
        ](position, width, height, dustType, speedX, speedY, alpha, color, scale);
    }
    
    static QuickDust(x, y, dustType) {
        return this.NewDust(Vector2.new(x, y), 1, 1, dustType);
    }
    
    static NewDustFromTile(i, j, dustType) {
        return Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'
        ](Vector2.new(i * 16, j * 16), 16, 16, dustType, 0, 0, 0, Color.White, 1.0);
    }
    
    static NewDustFromNPC(npc, dustType) {
        return Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'
        ](npc.Center, npc.width, npc.height, dustType, 0, 0, npc.alpha, npc.color, 1.0);
    }
    
    static NewGoreFromNPC(npc, goreId, scattered = false) {
        let x = npc.Center.X;
        let y = npc.Center.Y;
        if (scattered) {
            x += Math.random() * npc.width * 2 - npc.width / 2;
            y += Math.random() * npc.height * 2 - npc.height / 2;
        }
        return Terraria.Gore['int NewGore(Vector2 Position, Vector2 Velocity, int Type, float Scale)'
        ](Vector2.new(x, y), npc.velocity, goreId, npc.scale);
    }
    
    static GetParticleByName(name) {
        return Terraria.GameContent.Drawing.ParticleOrchestraType[name] ?? Terraria.GameContent.Drawing.ParticleOrchestraType.new();
    }
    
    static NewParticle(type, position, movementVector) {
        const settings = Terraria.GameContent.Drawing.ParticleOrchestraSettings.new();
        settings.PositionInWorld = position;
        settings.MovementVector = movementVector ?? Vector2.Zero;
        Terraria.GameContent.Drawing.ParticleOrchestrator.RequestParticleSpawn(
            false,
            type,
            settings,
            null
        );
    }
    
    static AddLight(position, r, g, b) {
        Terraria.Lighting['void AddLight(Vector2 position, float r, float g, float b)'
        ](position, r, g, b);
    }
    
    static PlaySound(type, x = -1, y = -1, style = 1, pitch = 0, volume = 1.0) {
        // TLPro/IL2CPP: never marshal LegacySoundStyle NativeObjects through JS.
        if (typeof type !== 'number')
            return false;
        Terraria.Audio.SoundEngine['SoundEffectInstance PlaySound(int type, int x, int y, int Style, float volumeScale, float pitchOffset)'
        ](type, x, y, style, volume, pitch);
        return true;
    }
}