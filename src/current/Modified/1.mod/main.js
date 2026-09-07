import './TL/RecipeOverflowCompat.js';
import { RegisterAll } from './Register/RegisterAll.js';
import { SystemLoader } from './TL/Loaders/SystemLoader.js';

globalThis.__CalamityRecipeIndices = [];
globalThis.__CalamityRecipeMeta = {};

RegisterAll();
SystemLoader.OnModLoad();
