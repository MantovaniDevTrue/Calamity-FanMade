import { GlobalHooks } from './../../TL/GlobalHooks.js';

// O progresso da Acid Rain usa mensagens no chat. Mantive este GlobalHook registrado
// apenas para não deslocar a ordem dos hooks antigos, mas ele não desenha nem carrega nada.
export class AcidRainUIHooks extends GlobalHooks {
    LoadTextures() { }
    Draw() { }
    OnWorldUnload() { }
}
