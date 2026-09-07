import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModItem } from './../../../TL/ModItem.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { TileData } from './../../../TL/Modules/TileData.js';

const { Color, Vector2 } = Modules;
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
const KillTile = Terraria.WorldGen['void KillTile(int i, int j, bool fail, bool effectOnly, bool noItem)'];
const BASIC_TERRAIN_TILES = new Set([
    0, // Dirt
    1, // Stone
    2, // Grass
    53, // Sand
    59, // Mud
    147, // Snow
    161 // Ice
]);
function normalize(x, y, fallbackX = 0, fallbackY = 1) {
    const length = Math.sqrt(x * x + y * y);
    if (length < 0.001)
        return { x: fallbackX, y: fallbackY };
    return { x: x / length, y: y / length };
}

function getState(proj) {
    const state = FusionEntityData.GetProjectile(proj);
    if (!state)
        return null;
    if (state.initialized !== true) {
        const dir = normalize(Number(proj.velocity.X), Number(proj.velocity.Y));
        state.initialized = true;
        state.digging = false;
        state.hasTouchedTerrain = false;
        state.clearSpaceTimer = 0;
        state.digTicks = 0;
        state.dirX = dir.x;
        state.dirY = dir.y;
    }
    return state;
}

export class WulfrumDiggingTurtleProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Tools/WulfrumDiggingTurtle';
        this.Lifetime = 400;
        this.DigTime = 350;
        this.DigSpeed = 1.5;
    }

    SetDefaults() {
        const proj = this.Projectile;
        proj.width = 20;
        proj.height = 20;
        proj.friendly = true;
        proj.penetrate = -1;
        proj.timeLeft = this.Lifetime;
        proj.netImportant = true;
        proj.tileCollide = true;
        proj.ignoreWater = false;
    }

    OnSpawn(proj) {
        const state = getState(proj);
        if (!state)
            return;
        const dir = normalize(Number(proj.velocity.X), Number(proj.velocity.Y));
        state.digging = false;
        state.hasTouchedTerrain = false;
        state.clearSpaceTimer = 0;
        state.digTicks = 0;
        state.dirX = dir.x;
        state.dirY = dir.y;
    }

    CanDamage(proj) {
        return false;
    }

    OnTileCollide(proj, hitDirection) {
        const state = getState(proj);
        if (!state)
            return false;
        let dir = normalize(Number(state.dirX), Number(state.dirY));
        if (Math.abs(dir.x) + Math.abs(dir.y) < 0.1) {
            dir = normalize(Number(proj.velocity.X), Number(proj.velocity.Y));
        }
        this.BeginDigging(proj, state, dir);
        return false;
    }

    HasTile(x, y) {
        try {
            const data = new TileData(x, y);
            return Terraria.TileHasTile(data.tile);
        } catch (e) {
            return false;
        }
    }

    GetTileType(x, y) {
        try {
            return Number(new TileData(x, y).type);
        } catch (e) {
            return -1;
        }
    }

    SyncKilledTile(x, y) {
        if (Number(Terraria.Main.netMode) === 0)
            return;
        try {
            Terraria.NetMessage.SendData(17, -1, -1, null, 0, x, y, 0, 0, 0, 0);
        } catch (e) { }
    }

    KillBasicTerrain(x, y) {
        const type = this.GetTileType(x, y);
        if (!BASIC_TERRAIN_TILES.has(type))
            return false;
        try {
            KillTile(x, y, false, false, false);
        } catch (e) {
            return false;
        }
        if (this.HasTile(x, y))
            return false;
        this.SyncKilledTile(x, y);
        return true;
    }

    BeginDigging(proj, state, dir) {
        if (!state || state.digging)
            return;
        if (!state.hasTouchedTerrain) {
            state.hasTouchedTerrain = true;
            proj.timeLeft = Math.min(Number(proj.timeLeft), this.DigTime);
        }
        state.digging = true;
        state.clearSpaceTimer = 0;
        state.digTicks = 0;
        state.dirX = dir.x;
        state.dirY = dir.y;
        proj.tileCollide = false;
        proj.velocity = Vector2.new(dir.x * this.DigSpeed, dir.y * this.DigSpeed);
        proj.netUpdate = true;
    }

    GetOwner(proj) {
        try {
            const index = Number(proj.owner);
            if (index < 0 || index >= 255)
                return null;
            const owner = Terraria.Main.player[index];
            if (!owner || owner.dead)
                return null;
            return owner;
        } catch (e) {
            return null;
        }
    }

    GetBestPickPower(owner) {
        let best = 0;
        try {
            const inventory = owner.inventory;
            for (let i = 0; i < 58; i++) {
                const item = inventory[i];
                if (!item || Number(item.stack) <= 0)
                    continue;
                const power = Number(item.pick) || 0;
                if (power > best)
                    best = power;
            }
        } catch (e) { }
        return Math.max(35, best);
    }

    PickTile(owner, x, y, pickPower) {
        try {
            owner['void PickTile(int x, int y, int pickPower)'](x, y, pickPower);
            return true;
        } catch (e) { }
        try {
            owner.PickTile(x, y, pickPower);
            return true;
        } catch (e) { }
        return false;
    }

    DigTile(proj, x, y) {
        const maxX = Number(Terraria.Main.maxTilesX);
        const maxY = Number(Terraria.Main.maxTilesY);
        if (x < 2 || y < 2 || x >= maxX - 2 || y >= maxY - 2)
            return false;
        if (!this.HasTile(x, y))
            return false;
        const owner = this.GetOwner(proj);
        if (!owner || owner.noBuilding)
            return false;
        const pickPower = this.GetBestPickPower(owner);
        let invoked = false;
        for (let hit = 0; hit < 3; hit++) {
            invoked = this.PickTile(owner, x, y, pickPower) || invoked;
            if (!this.HasTile(x, y)) {
                this.SyncKilledTile(x, y);
                return true;
            }
        }
        if (pickPower >= 35 && this.KillBasicTerrain(x, y))
            return true;
        return invoked;
    }

    AI(proj) {
        const state = getState(proj);
        if (!state)
            return;
        try {
        } catch (e) { }
        let vx = Number(proj.velocity.X);
        let vy = Number(proj.velocity.Y);
        let dir = normalize(vx, vy, Number(state.dirX) || 0, Number(state.dirY) || 1);
        if (!state.digging && Terraria.Main.netMode !== 1) {
            const centerX = Number(proj.Center.X);
            const centerY = Number(proj.Center.Y);
            const frontX = Math.floor((centerX + dir.x * 13) / 16);
            const frontY = Math.floor((centerY + dir.y * 13) / 16);
            if (this.HasTile(frontX, frontY))
                this.BeginDigging(proj, state, dir);
        }
        if (state.digging) {
            state.digTicks = Number(state.digTicks || 0) + 1;
            proj.tileCollide = false;
            state.dirX = dir.x;
            state.dirY = dir.y;
            proj.velocity = Vector2.new(dir.x * this.DigSpeed, dir.y * this.DigSpeed);
            proj.rotation = Math.atan2(dir.y, dir.x) + Math.PI * 0.5;
            if (Terraria.Main.netMode !== 1) {
                const centerX = Number(proj.Center.X);
                const centerY = Number(proj.Center.Y);
                for (const angle of [-Math.PI / 4, 0, Math.PI / 4]) {
                    const c = Math.cos(angle);
                    const sn = Math.sin(angle);
                    const rayX = dir.x * c - dir.y * sn;
                    const rayY = dir.x * sn + dir.y * c;
                    const sampleX = centerX + rayX * 18;
                    const sampleY = centerY + rayY * 18;
                    this.DigTile(proj, Math.floor(sampleX / 16), Math.floor(sampleY / 16));
                }
            }
            let insideSolid = true;
            try {
                insideSolid = !!SolidCollision(Vector2.new(Number(proj.Center.X) - 25, Number(proj.Center.Y) - 25), 50, 50);
            } catch (e) { }
            if (Number(state.digTicks) >= 18 && !insideSolid) {
                state.clearSpaceTimer = Number(state.clearSpaceTimer || 0) + 1;
            } else {
                state.clearSpaceTimer = 0;
            }
            if (Number(state.clearSpaceTimer) >= 5) {
                state.digging = false;
                state.clearSpaceTimer = 0;
                proj.tileCollide = true;
                proj.netUpdate = true;
            }
        } else {
            if (Math.abs(vx) + Math.abs(vy) > 0.1) {
                state.dirX = dir.x;
                state.dirY = dir.y;
            }
            if (Number(proj.timeLeft) < 345)
                vy += 0.5;
            vx *= 0.98;
            vy *= 0.98;
            if (vy > 18)
                vy = 18;
            proj.velocity = Vector2.new(vx, vy);
            proj.rotation = Math.atan2(vy, vx) + Math.PI * 0.5;
        }
        if (Terraria.Main.netMode !== 2 && Number(proj.timeLeft) % 8 === 0) {
            const dust = NewDust(proj.position, proj.width, proj.height, Terraria.ID.DustID.Electric, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 80, Color.White, 0.7);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
    }

    OnKill(proj, timeLeft) {
        if (Terraria.Main.netMode !== 1 && !proj.noDropItem && Math.random() < 0.5) {
            const scrapType = Number(ModItem.getTypeByName('WulfrumMetalScrap') || 0);
            if (scrapType > 0) {
                NewItem(Math.floor(Number(proj.position.X)), Math.floor(Number(proj.position.Y)), proj.width, proj.height, scrapType, 1, false, -1, false);
            }
        }
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, proj.Center, 14, 0);
        } catch (e) { }
        for (let i = 0; i < 14; i++) {
            NewDust(proj.position, proj.width, proj.height, i < 8 ? Terraria.ID.DustID.Smoke : Terraria.ID.DustID.Electric, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 80, Color.White, 0.8 + Math.random() * 0.5);
        }
    }
}
