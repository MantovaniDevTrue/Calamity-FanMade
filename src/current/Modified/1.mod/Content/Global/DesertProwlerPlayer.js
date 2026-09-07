import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { IsRogueItem, IsRogueProjectile } from './../../Core/RogueRuntime.js';

const { Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function Local(p){try{return Math.floor(N(Terraria.PlayerIndex(p),-1))===Math.floor(N(Terraria.Main.myPlayer,-2));}catch(e){return false;}}
function Vel(p){try{return Terraria.PlayerVelocity(p);}catch(e){return Vector2.new(0,0);}}
function SetVel(p,x,y){try{p.velocity=Vector2.new(x,y);}catch(e){}}
function Burst(player,strong=false){if(typeof NewDust!=='function')return;const c=Terraria.PlayerCenter(player),v=Vel(player),count=strong?18:7;for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=(strong?2.6:1.5)*(0.35+Math.random());try{NewDust(Vector2.new(N(c.X)-4,N(c.Y)-4),8,8,(i%3===0?31:32),Math.cos(a)*s-N(v.X)*0.15,Math.sin(a)*s-N(v.Y)*0.08,120,null,0.8+Math.random()*0.55);}catch(e){}}}

export class DesertProwlerPlayer extends ModPlayer {
    constructor(){super();this.SetActive=false;this.WasSetActive=false;this.SmokeTicks=0;this.CooldownTicks=0;this.ComboLatch=false;this.LightsOutWindow=0;this.Logged=false;}
    ResetEffects(){this.SetActive=false;}
    UpdateDead(){this.SetActive=false;this.WasSetActive=false;this.SmokeTicks=0;this.ComboLatch=false;this.LightsOutWindow=0;}
    ActivateSet(player){if(!Local(player))return;this.SetActive=true;const s=ModPlayer.getByName('CalamityPlayerState');if(s&&s.IsLocalPlayer(player)){s.WearingRogueArmor=true;s.RogueStealthMax=N(s.RogueStealthMax)+0.5;}if(this.SmokeTicks>0){player.moveSpeed=N(player.moveSpeed,1)*1.5;player.invis=true;player.noKnockback=true;player.aggro=Math.floor(N(player.aggro)*0.5);player.statDefense=Math.max(0,Math.floor(N(player.statDefense)*0.25));}}
    StartSmoke(player){if(this.SmokeTicks>0||this.CooldownTicks>0)return false;this.SmokeTicks=300;this.LightsOutWindow=0;Burst(player,true);try{tl.log('[CalamityPort DesertProwler] Sandsmoke activated for 5s; mobile combo=Down+Jump.');}catch(e){}return true;}
    EndSmoke(player,attacked=false){if(this.SmokeTicks<=0)return;this.SmokeTicks=0;this.CooldownTicks=1500;if(attacked){this.LightsOutWindow=180;const v=Vel(player);SetVel(player,N(v.X),Math.min(-6,N(v.Y)-6));try{player.jump=Math.max(Math.floor(N(player.jump)),Math.floor(N(Terraria.Player.jumpHeight,15)/2));}catch(e){}Burst(player,true);}else Burst(player,false);}
    UseItem(player,item){if(!Local(player)||!this.SetActive||this.SmokeTicks<=0||!IsRogueItem(item))return true;this.EndSmoke(player,true);return true;}
    OnHitNPC(player,item,npc){if(!Local(player)||this.LightsOutWindow<=0||!IsRogueItem(item)||!npc)return;if(N(npc.life)<=0){this.CooldownTicks=Math.min(this.CooldownTicks||1500,120);this.LightsOutWindow=0;Burst(player,false);}}
    OnHitNPCWithProj(player,npc,projectile){if(!Local(player)||this.LightsOutWindow<=0||!IsRogueProjectile(projectile)||!npc)return;if(N(npc.life)<=0){this.CooldownTicks=Math.min(this.CooldownTicks||1500,120);this.LightsOutWindow=0;Burst(player,false);}}
    PostUpdate(player){if(!Local(player))return;if(this.CooldownTicks>0)this.CooldownTicks--;if(this.LightsOutWindow>0)this.LightsOutWindow--;const combo=this.SetActive&&player.controlDown===true&&player.controlJump===true;if(combo&&!this.ComboLatch)this.StartSmoke(player);this.ComboLatch=combo;if(this.SmokeTicks>0){this.SmokeTicks--;if(this.SmokeTicks%6===0)Burst(player,false);if(this.SmokeTicks<=0)this.CooldownTicks=Math.max(this.CooldownTicks,1500);}if(!this.SetActive&&this.SmokeTicks>0)this.EndSmoke(player,false);this.WasSetActive=this.SetActive;if(this.SetActive&&!this.Logged){this.Logged=true;try{tl.log('[CalamityPort DesertProwler] full set recognized; stealth=0.5, mobile sandsmoke runtime armed.');}catch(e){}}}
    IsSmokeActive(){return this.SmokeTicks>0;}
}
