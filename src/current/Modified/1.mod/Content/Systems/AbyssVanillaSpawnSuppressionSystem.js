import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { AbyssLayer1Runtime } from './../../Core/AbyssLayer1Runtime.js';
import { SulphurousSeaPreviewRuntime } from './../../Core/SulphurousSeaPreviewRuntime.js';

function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}

export class AbyssVanillaSpawnSuppressionSystem extends ModSystem {
    constructor(){super();this.Tick=0;this.Logged=false;}
    OnWorldLoad(){this.Tick=0;this.Logged=false;}
    OnWorldUnload(){this.Tick=0;this.Logged=false;}
    InStrictBiome(player){
        if(!player||!player.active||player.dead)return false;
        try{if(AbyssLayer1Runtime.ContainsAbyssPlayer(player))return true;}catch(_){}
        try{if(SulphurousSeaPreviewRuntime.IsCoastalArea()&&SulphurousSeaPreviewRuntime.ContainsPlayer(player))return true;}catch(_){}
        return false;
    }
    Update(){
        if(Terraria.Main.gameMenu===true)return;
        if(++this.Tick<120)return;
        this.Tick=0;
        const player=Terraria.Main.LocalPlayer;
        // All four Abyss ModBiomes already set vanilla spawn-pool weight 0, and the runtime
        // log confirms that path is active. Avoid a redundant 200-slot native NPC sweep while
        // the player is in the Abyss. Keep this slow fallback only for Sulphurous Sea edge cases.
        try{if(AbyssLayer1Runtime.ContainsAbyssPlayer(player))return;}catch(_){}
        if(!this.InStrictBiome(player))return;
        const vanillaCount=I(Terraria.ID.NPCID.Count,0);
        let removed=0;
        for(let i=0;i<200;i++){
            let npc=null;try{npc=Terraria.Main.npc.get_Item(i);}catch(_){}
            if(!npc||npc.active!==true)continue;
            const type=I(npc.type,-1);
            if(type<0||type>=vanillaCount)continue;
            if(npc.boss===true||npc.townNPC===true||npc.friendly===true)continue;
            if(npc.wet!==true||Number(npc.damage)<=0)continue;
            try{npc.active=false;removed++;}catch(_){}
        }
        if(removed>0&&!this.Logged){this.Logged=true;try{tl.log(`[CalamityPort NaturalSpawnGate] removed ${removed} hostile vanilla swimmer(s) inside Sulphur/Abyss; modded NPCs untouched.`);}catch(_){}}
    }
}
