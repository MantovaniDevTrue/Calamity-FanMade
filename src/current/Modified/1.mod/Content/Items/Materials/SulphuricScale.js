import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class SulphuricScale extends ModItem{constructor(){super();this.Texture='Items/Materials/SulphuricScale';this.ResearchUnlockCount=25;}SetDefaults(){const i=this.Item;i.width=20;i.height=20;i.maxStack=ModItem.CommonMaxStack;i.value=Terraria.Item.sellPrice(0,0,0,60);i.rare=Terraria.ID.ItemRarityID.Green;i.material=true;this.MenuCategories.push('material');}}
