import { Terraria, Modules, GeneralDrawLayer } from './ModImports.js';

const { Vector2 } = Modules;

export class GeneralParticleHandler {
    static Particles = [];
    static MaxParticles = 192;
    static NextType = 1;
    static LastError = '';

    static get ActiveCount() {
        return this.Particles.length;
    }

    static SpawnParticle(particle) {
        if (!particle)
            return null;

        if (this.Particles.length >= this.MaxParticles) {
            let replace = -1;
            for (let i = 0; i < this.Particles.length; i++) {
                const current = this.Particles[i];
                if (current && !current.Important) {
                    replace = i;
                    break;
                }
            }
            if (replace < 0)
                return null;
            const old = this.Particles[replace];
            if (old) old.Active = false;
            this.Particles[replace] = particle;
        } else {
            this.Particles.push(particle);
        }

        particle.Type = this.NextType++;
        particle.Active = true;
        return particle;
    }

    static RemoveParticle(particle) {
        if (particle)
            particle.Active = false;
    }

    static Update() {
        const particles = this.Particles;
        const length = particles.length;
        if (length === 0 || Terraria.Main.gameMenu || Terraria.Main.gamePaused)
            return;

        // Stable in-place compaction avoids Array.splice shifting the whole particle list
        // whenever several effects expire on the same frame.
        let write = 0;
        for (let read = 0; read < length; read++) {
            const particle = particles[read];
            if (!particle || particle.Active === false)
                continue;
            try {
                particle.Position = Vector2.Add(particle.Position, particle.Velocity);
                particle.Time++;
                particle.Update();
                if (particle.Active !== false && particle.SetLifetime && particle.Time >= particle.Lifetime)
                    particle.Kill();
            } catch (e) {
                this.LastError = String(e);
                particle.Active = false;
            }
            if (particle.Active !== false)
                particles[write++] = particle;
        }
        particles.length = write;
    }

    static Draw(spriteBatch = Terraria.Main.spriteBatch, layer = GeneralDrawLayer.AfterDusts) {
        if (!spriteBatch || this.Particles.length === 0 || Terraria.Main.gameMenu || Terraria.Main.mapFullscreen)
            return;

        for (let i = 0; i < this.Particles.length; i++) {
            const particle = this.Particles[i];
            if (!particle || particle.Active === false || particle.DrawLayer !== layer)
                continue;
            try {
                if (particle.UseCustomDraw)
                    particle.CustomDraw(spriteBatch);
                else if (typeof particle.Draw === 'function')
                    particle.Draw(spriteBatch);
            } catch (e) {
                this.LastError = String(e);
            }
        }
    }

    static Clear() {
        for (let i = 0; i < this.Particles.length; i++) {
            const particle = this.Particles[i];
            if (particle)
                particle.Active = false;
        }
        this.Particles.length = 0;
        this.LastError = '';
    }
}
