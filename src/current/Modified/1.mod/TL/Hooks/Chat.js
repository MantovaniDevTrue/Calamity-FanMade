import { Terraria } from './../ModImports.js';
import { CombinedLoader } from './../Loaders/CombinedLoader.js';

export class ChatHooks {
    static initialized = false;
    
    static HookList = {
        All: (info) => true,
        ProcessIncomingMessage: (info) => true
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;
        
        if (this.HookList.ProcessIncomingMessage(info)) {
            Terraria.Chat.ChatCommandProcessor['void ProcessIncomingMessage(ChatMessage message, int clientId)'
            ].hook((original, self, message, client_id) => {
                if (CombinedLoader.SendMessage(Terraria.Main.player[Terraria.Main.myPlayer], message.Text)) {
                    original(self, message, client_id);
                }
            });
        }
        
        this.initialized = true;
    }
}