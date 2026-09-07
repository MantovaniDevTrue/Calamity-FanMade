export class SceneEffectPriority {
    // Represents no priority
    static None = 0;
    // Will override vanilla SceneEffect for Hallow, Ocean, Desert, Overworld, Night
    static BiomeLow = 1;
    // Will override vanilla SceneEffect for Meteor, Jungle, Graveyard, Snow
    static BiomeMedium = 2;
    // Will override vanilla SceneEffect for Temple, Dungeon, Mushrooms, Corruption, Crimson
    static BiomeHigh = 3;
}