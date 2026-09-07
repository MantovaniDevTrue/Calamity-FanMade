import { ModSystem } from './../../TL/ModSystem.js';

// Recipes now live on their real items. Keeping this registered shell preserves
// import/registration compatibility without running a duplicate recipe pass.
export class PostSlimeGodRecipeSystem extends ModSystem {}
