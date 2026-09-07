import { ModMenu } from './../TL/ModMenu.js';
import { CalamityPortMenu } from './../Content/Menus/CalamityPortMenu.js';

export function RegisterMenus() {
    ModMenu.register(CalamityPortMenu);
}
