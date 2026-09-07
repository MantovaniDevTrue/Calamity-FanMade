import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { WorldDB } from './../../TL/WorldDB.js';

const Main = new NativeClass('Terraria', 'Main');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DRAW='void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function B(v){if(v===true)return true;if(v===false||v==null)return false;try{return Number(v)!==0;}catch(e){return false;}}
function V(x,y){const v=Vector2.new();v.X=Number(x);v.Y=Number(y);return v;}function R(x,y,w,h){const r=Rectangle.new();r.X=I(x);r.Y=I(y);r.Width=I(w);r.Height=I(h);return r;}
function ScreenRect(wx,wy,w,h){const sx=Number(Main.screenPosition?.X||0),sy=Number(Main.screenPosition?.Y||0),off=Main.drawToScreen===true?0:Number(Main.offScreenRange||0);return{x:wx*16-sx+off,y:wy*16-sy+off,w:w*16,h:h*16};}
function Visible(r){return !(r.x>Main.screenWidth+64||r.y>Main.screenHeight+64||r.x+r.w<-64||r.y+r.h<-64);}
export class SulphurousSeaDetailDrawHooks extends GlobalHooks{
 constructor(){super();this.Scrap=[];this.Glow=[];this.Column=null;this.RetryAt=0;this.LoadFailLogged=false;this.Installed=false;}
 Load(){
  if(this.Column&&this.Scrap.length===7&&this.Scrap.every(x=>!!x))return true;
  const now=I(Main.GameUpdateCount,0);if(now<this.RetryAt)return false;
  try{for(let i=1;i<=7;i++){this.Scrap[i-1]=tl.texture.load(`Textures/Structures/SulphurousScrapOverlays/SulphurousScrap${i}.png`);this.Glow[i-1]=tl.texture.load(`Textures/Structures/SulphurousScrapOverlays/SulphurousScrap${i}Glow.png`);}this.Column=tl.texture.load('Textures/Tiles/Abyss/SulphurousColumn.png');if(!this.Column||this.Scrap.some(x=>!x))throw new Error('missing detail texture');this.LoadFailLogged=false;return true;}
  catch(e){this.RetryAt=now+120;if(!this.LoadFailLogged){this.LoadFailLogged=true;try{tl.log(`[CalamityPort SulphDetails] texture load delayed; retrying: ${e}`);}catch(_){}}return false;}
 }
 DrawScraps(draw){const count=I(WorldDB.get('calamity:sulphursea:details:scrapCount'),0);for(let i=0;i<count;i++){const k=`calamity:sulphursea:details:scrap:${i}:`,left=I(WorldDB.get(k+'left'),-1),top=I(WorldDB.get(k+'top'),-1),w=I(WorldDB.get(k+'width')),h=I(WorldDB.get(k+'height')),v=Math.max(1,Math.min(7,I(WorldDB.get(k+'variant'),1)));if(left<0||top<0||w<=0||h<=0)continue;const q=ScreenRect(left,top,w,h);if(!Visible(q))continue;let light=Color.White;try{light=Terraria.Lighting['Color GetColor(int x, int y)'](left+Math.floor(w/2),top+Math.floor(h/2));}catch(e){}draw(this.Scrap[v-1],V(q.x,q.y),null,light,0,V(0,0),1,SpriteEffects.None,0);const g=this.Glow[v-1];if(g)draw(g,V(q.x,q.y),null,Color.White,0,V(0,0),1,SpriteEffects.None,0);}}
 DrawColumns(draw){if(!this.Column)return;const count=I(WorldDB.get('calamity:sulphursea:details:columnCount'),0);const sx=Number(Main.screenPosition?.X||0),sy=Number(Main.screenPosition?.Y||0),off=Main.drawToScreen===true?0:Number(Main.offScreenRange||0);for(let i=0;i<count;i++){const k=`calamity:sulphursea:details:column:${i}:`,left=I(WorldDB.get(k+'left'),-1),top=I(WorldDB.get(k+'top'),-1),bottom=I(WorldDB.get(k+'bottom'),-1),variant=Math.max(0,Math.min(2,I(WorldDB.get(k+'variant'),0)));if(left<0||top<0||bottom<top)continue;const rr=ScreenRect(left,top,2,bottom-top+1);if(!Visible(rr))continue;for(let y=top;y<=bottom;y++){const fy=y===top?0:(y===bottom?36:18);for(let dx=0;dx<2;dx++){const fx=variant*36+dx*18;let light=Color.White;try{light=Terraria.Lighting['Color GetColor(int x, int y)'](left+dx,y);}catch(e){}draw(this.Column,V((left+dx)*16-sx+off,y*16-sy+off),R(fx,fy,16,16),light,0,V(0,0),1,SpriteEffects.None,0);}}}}
 Draw(){
  if(!WorldDB.Instance)return;
  const scraps=I(WorldDB.get('calamity:sulphursea:details:scrapCount'),0),columns=I(WorldDB.get('calamity:sulphursea:details:columnCount'),0);
  if(!B(WorldDB.get('calamity:sulphursea:details:generated'))&&scraps<=0&&columns<=0)return;
  if(!this.Load())return;const sb=Main.spriteBatch,draw=sb&&sb[DRAW];if(!draw)return;this.DrawScraps(draw);this.DrawColumns(draw);
 }
 Initialize(){
  let f=null;try{f=Main['void DrawNPCs(bool behindTiles)'];}catch(e){}try{if(!f)f=Main.DrawNPCs;}catch(e){}
  if(!f?.hook){try{tl.log('[CalamityPort SulphDetails] DrawNPCs hook unavailable.');}catch(_){}return;}
  // Match the already-proven Sunken Sea ecology draw path: Terraria draws the NPC layer first,
  // then the world-detail overlay is submitted while the world SpriteBatch is still valid.
  f.hook((original,self,behindTiles)=>{const result=original(self,behindTiles);if(!B(behindTiles))try{this.Draw();}catch(e){try{tl.log(`[CalamityPort SulphDetails] draw failed: ${e}`);}catch(_){}}return result;});
  this.Installed=true;try{tl.log('[CalamityPort SulphDetails] world overlay hook installed.');}catch(_){}
 }
 OnWorldUnload(){this.RetryAt=0;this.LoadFailLogged=false;}
}
