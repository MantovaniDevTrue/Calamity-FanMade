import { Terraria } from './../TL/ModImports.js';
import { ModLocalization } from './../TL/ModLocalization.js';

const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const LogPages = new Map();
const LastUse = new Map();
const COOLDOWN_MS = 450;

const EN = Object.freeze({
    logTitle: 'Draedon Log — Planetoid',
    schematicTitle: 'Encrypted Schematic — Planetoid',
    log: [
        `High above even the sky islands upheaved long ago lies a fascinating geological phenomenon. Though, unlike the islands, their airborne nature appears to have formed more naturally. I speculate that they formed long ago when the world was in its infancy judging by soil samples I have taken while testing high atmosphere plant growth. Perhaps these "planetoids", as many refer to them as, formed via meteor strikes tossing matter high into the atmosphere. This would simultaneously explain many geological oddities I have found on the world's surface.`,
        `Travel between worlds is a fascination of mine. The planets within reasonable distance to this provide no use to me in terms of materials or study opportunities they could provide. And so, I wish to go further beyond this mere cluster of planets some day. It will likely take many more decades of technological progress, however, as travel between worlds would take years even at the maximum speed physical matter can currently go. Perhaps I will find a way to shatter this limit once this world holds my interest no longer.`,
        `A request from Yharim has been delivered. An inquiry to create a suit of armor for the serpent that has joined his forces recently, the "Devourer of Gods" as the serpent calls himself. He is a bothersome yet fascinating being. And so, I have taken the opportunity so that I may learn more of his home dimension. Using materials from his place of origin, I have forged armor of immense size and durability yet extreme flexibility. It is certainly one of the most unique materials I have worked with and has advanced my knowledge greatly. Though, I have learned more than I expected to about the cosmic beast from this. Perhaps more than he wished for me to.`
    ],
    schematic: `Within an army, as weapons do, the soldiers serve different purposes. That distinction is crucial, as the wrong tool in the wrong hands—no matter how potent—may as well be a wooden club. Addendum: Seek out my base of operations closest to the Lihzahrd's home. I wish you the best of luck with all sincerity, for it has been a long time since I have had a worthy test subject.`
});

const PT = Object.freeze({
    logTitle: 'Registro de Draedon — Planetoide',
    schematicTitle: 'Esquema Criptografado — Planetoide',
    log: [
        `Bem acima até mesmo das ilhas flutuantes erguidas há muito tempo existe um fenômeno geológico fascinante. Diferentemente das ilhas, porém, sua natureza suspensa parece ter se formado de maneira mais natural. Suspeito que tenham surgido há muito tempo, quando o mundo ainda estava em sua infância, a julgar pelas amostras de solo que recolhi durante testes de cultivo em alta atmosfera. Talvez esses “planetoides”, como muitos os chamam, tenham sido formados por impactos de meteoros que lançaram matéria para as camadas superiores da atmosfera. Isso também explicaria várias anomalias geológicas que encontrei na superfície do mundo.`,
        `Viajar entre mundos é uma fascinação minha. Os planetas a uma distância razoável daqui não oferecem utilidade em termos de materiais ou oportunidades de estudo. Portanto, algum dia pretendo ir muito além deste simples grupo de planetas. Provavelmente serão necessárias muitas décadas de avanço tecnológico, pois viajar entre mundos levaria anos mesmo na maior velocidade que a matéria física atualmente pode alcançar. Talvez eu encontre uma forma de romper esse limite quando este mundo já não for capaz de manter meu interesse.`,
        `Uma solicitação de Yharim foi entregue. Ele deseja que eu crie uma armadura para a serpente que recentemente se juntou às suas forças, o “Devorador de Deuses”, como ela própria se denomina. É uma criatura incômoda, porém fascinante. Aproveitei a oportunidade para aprender mais sobre sua dimensão de origem. Usando materiais provenientes daquele lugar, forjei uma armadura de tamanho e durabilidade imensos, mas de flexibilidade extrema. Certamente é um dos materiais mais singulares com que já trabalhei e ampliou consideravelmente meu conhecimento. Contudo, aprendi mais do que esperava sobre a besta cósmica. Talvez mais do que ela gostaria que eu soubesse.`
    ],
    schematic: `Em um exército, assim como as armas, os soldados desempenham funções diferentes. Essa distinção é fundamental: a ferramenta errada nas mãos erradas — por mais poderosa que seja — pouco difere de um simples porrete de madeira. Adendo: procure minha base de operações mais próxima do lar dos Lihzahrd. Desejo-lhe boa sorte com toda sinceridade, pois faz muito tempo desde que tive um sujeito de testes verdadeiramente digno.`
});

function Owner(player){
    try{return Terraria.PlayerIndex(player);}catch(e){return -1;}
}
function Local(owner){
    try{return owner>=0 && owner===Number(Terraria.Main.myPlayer);}catch(e){return owner>=0;}
}
function Copy(){
    try{return String(ModLocalization.ActiveCultureName||'en-US').toLowerCase().startsWith('pt')?PT:EN;}catch(e){return EN;}
}
function Ready(owner,key){
    const now=Date.now(), id=`${owner}:${key}`, last=Number(LastUse.get(id)||0);
    if(now-last<COOLDOWN_MS)return false;
    LastUse.set(id,now);
    return true;
}
function Chunks(text,max=220){
    const words=String(text||'').trim().split(/\s+/);const out=[];let line='';
    for(const word of words){
        if(!line){line=word;continue;}
        if(line.length+1+word.length<=max)line+=' '+word;
        else{out.push(line);line=word;}
    }
    if(line)out.push(line);
    return out;
}
function Tell(text,r,g,b){
    try{NewText(String(text),r,g,b);}catch(e){}
}
function Show(title,text,page,total){
    const suffix=total>1?` ${page}/${total}`:'';
    Tell(`[${title}${suffix}]`,95,215,255);
    for(const chunk of Chunks(text))Tell(chunk,205,220,230);
}

export function ShowPlanetoidLog(player){
    const owner=Owner(player);if(!Local(owner)||!Ready(owner,'planetoid-log'))return true;
    const copy=Copy();let page=Number(LogPages.get(owner)||0);if(page<0||page>=copy.log.length)page=0;
    Show(copy.logTitle,copy.log[page],page+1,copy.log.length);
    LogPages.set(owner,(page+1)%copy.log.length);
    return true;
}

export function ShowPlanetoidSchematic(player){
    const owner=Owner(player);if(!Local(owner)||!Ready(owner,'planetoid-schematic'))return true;
    const copy=Copy();Show(copy.schematicTitle,copy.schematic,1,1);return true;
}
