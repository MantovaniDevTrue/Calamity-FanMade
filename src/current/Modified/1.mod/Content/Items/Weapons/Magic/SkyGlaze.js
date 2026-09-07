import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function P(i){const n=Math.floor(N(i,-1));if(n<0||n>=1000)return null;try{const a=Terraria.Main.projectile,g=a&&a['Projectile get_Item(int index)'];return typeof g==='function'?(g(n)||null):null;}catch(_){return null;}}
function Source(player,item){try{return player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(_){}try{return null;}catch(_){return null;}}

export class SkyGlaze extends ModItem {
    constructor(){super();this.Texture='Items/Weapons/Magic/SkyGlaze';this.ResearchUnlockCount=1;}
    SetStaticDefaults(){try{Terraria.Item.staff[this.Type]=true;}catch(_){} }
    SetDefaults(){
        const i=this.Item;i.width=52;i.height=74;i.damage=10;i.magic=true;i.mana=9;i.useAnimation=25;i.useTime=25;
        i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=3.5;i.value=Terraria.Item.buyPrice(0,1,0,0);
        i.rare=Terraria.ID.ItemRarityID.Green;i.UseSound=Terraria.ID.SoundID.Item102;i.autoReuse=true;
        i.shoot=ModProjectile.getTypeByName('StickyFeather');i.shootSpeed=15;this.MenuCategories.push('magic');
    }
    Shoot(item,player,position,velocity,type,damage,knockBack){
        const t=Number(ModProjectile.getTypeByName('StickyFeather')||type||0);if(!(t>0))return false;
        const owner=Terraria.PlayerIndex(player),src=Source(player,item);
        const spawnDamage=Math.max(1,Math.floor(N(damage,N(item.damage,10))));
        let mouseX=0,mouseY=0;try{mouseX=N(Terraria.Main.mouseX)+N(Terraria.Main.screenPosition.X);mouseY=N(Terraria.Main.mouseY)+N(Terraria.Main.screenPosition.Y);}catch(_){const c=Terraria.PlayerCenter(player);mouseX=N(c.X)+N(player.direction)*200;mouseY=N(c.Y);}
        const pc=Terraria.PlayerCenter(player);
        for(let k=0;k<3;k++){
            let sx=(N(player.position.X)+N(player.width)*0.5)+(Math.floor(Math.random()*201)*-N(player.direction,1))+(mouseX-N(player.position.X));
            sx=(sx+N(pc.X))*0.5+(-200+Math.random()*400);
            const sy=N(player.MountedCenter?player.MountedCenter.Y:pc.Y)-600-k*100;
            let dx=mouseX-sx,dy=mouseY-sy;if(dy<0)dy=-dy;if(dy<20)dy=20;
            const len=Math.sqrt(dx*dx+dy*dy)||1, scale=15/len;
            dx=dx*scale+(-30+Math.random()*60)*0.02;dy=dy*scale+(-30+Math.random()*60)*0.02;
            const id=NewProjectile(src,Vector2.new(sx,sy),Vector2.new(dx,dy),t,spawnDamage,N(knockBack,3.5),owner,0,Math.floor(Math.random()*15),0,null);
            // O TLPro às vezes normaliza o dano de projétil custom logo no spawn; eu restauro aqui.
            const p=P(Number(id));if(p){p.damage=spawnDamage;p.originalDamage=spawnDamage;p.netUpdate=true;}
        }
        return false;
    }
}
