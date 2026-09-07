import { DustLoader } from './../TL/Loaders/DustLoader.js';

export function RegisterDusts() {
    DustLoader.register('RageDust', {
        type: 235
    });

    DustLoader.register('AdrenalineDust', {
        type: 107
    });
}
