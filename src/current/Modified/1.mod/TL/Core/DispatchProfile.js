export function CreateDispatchProfile(type, basePrototype, instance = null) {
    const methods = Object.create(null);
    let prototype = type?.prototype;

    while (prototype && prototype !== basePrototype) {
        for (const name of Object.getOwnPropertyNames(prototype)) {
            if (name === 'constructor') continue;
            const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
            if (typeof descriptor?.value === 'function') methods[name] = true;
        }
        prototype = Object.getPrototypeOf(prototype);
    }

    if (instance) {
        for (const name of Object.getOwnPropertyNames(instance)) {
            if (typeof instance[name] === 'function') methods[name] = true;
        }
    }

    return methods;
}
