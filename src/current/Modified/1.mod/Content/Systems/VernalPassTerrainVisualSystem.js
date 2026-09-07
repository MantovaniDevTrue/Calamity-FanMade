import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModTexture } from './../../TL/ModTexture.js';
import { VernalSoilRuntime, VernalSoilAnchorTile } from './../../Core/VernalSoilRuntime.js';

const CHECK_INTERVAL = 8;
function Tick(){ try{return Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(e){return 0;} }
function LocalPlayer(){
    try { const i=Math.floor(Number(Terraria.Main.myPlayer)); return i>=0&&i<255 ? Terraria.Main.player.get_Item(i) : null; }
    catch(e){ return null; }
}

export class VernalPassTerrainVisualSystem extends ModSystem {
    constructor(){ super(); this.Ready=false; this.Failed=false; this.Applied=false; this.Asset=null; this.Old=null; this.LastCheck=-9999; }
    EnsureAsset(){
        if(this.Ready) return true;
        if(this.Failed) return false;
        try{
            const tex=new ModTexture('Textures/Tiles/VernalPass/VernalSoil');
            if(!tex?.exists){this.Failed=true;return false;}
            this.Asset=tex.asset.asset; this.Ready=true; return true;
        }catch(e){this.Failed=true;try{tl.log(`[CalamityPort] Vernal Soil texture load failed: ${e}`);}catch(_){}return false;}
    }
    PostSetupContent(){ this.EnsureAsset(); }
    OnWorldLoad(){ this.LastCheck=-9999; this.Restore(); this.EnsureAsset(); VernalSoilRuntime.ReloadBounds(); }
    ShouldApply(){
        if(Terraria.Main.gameMenu===true) return false;
        const p=LocalPlayer(); if(!p || p.dead===true) return false;
        try{
            const c=Terraria.PlayerCenter(p); const tx=Math.floor(Number(c.X)/16), ty=Math.floor(Number(c.Y)/16);
            return VernalSoilRuntime.IsInsideStructure(tx,ty,48) || VernalSoilRuntime.IsNearTracked(tx,ty,48);
        }catch(e){return false;}
    }
    Apply(){
        if(this.Applied || !this.EnsureAsset()) return;
        try{ this.Old=Terraria.GameContent.TextureAssets.Tile[VernalSoilAnchorTile]; Terraria.GameContent.TextureAssets.Tile[VernalSoilAnchorTile]=this.Asset; this.Applied=true; }
        catch(e){this.Old=null;this.Applied=false;try{tl.log(`[CalamityPort] Vernal Soil texture swap failed: ${e}`);}catch(_){} }
    }
    Restore(){
        if(!this.Applied) return;
        try{ if(this.Old) Terraria.GameContent.TextureAssets.Tile[VernalSoilAnchorTile]=this.Old; }catch(e){}
        this.Old=null; this.Applied=false;
    }
    Update(){
        const tick=Tick(); if(tick-this.LastCheck<CHECK_INTERVAL)return; this.LastCheck=tick;
        const active=this.ShouldApply(); if(active&&!this.Applied)this.Apply(); else if(!active&&this.Applied)this.Restore();
    }
    OnWorldUnload(){ this.Restore(); this.LastCheck=-9999; }
}
