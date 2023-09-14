/**
 * deletes a property from the object-tree
 * @param path path of property (example: <code>{a: {b: 0}}</code> -> a.b)
 * @param obj the object to modify
 */
export function deleteProp(path: string, obj: Record<string, any>) {
    const pathParts = path.split('.');
    let prop = obj;

    for(let i = 0; i < pathParts.length; i++) {
        if(i === pathParts.length - 1) {
            delete prop[pathParts[i]];
        } else {
            prop = prop[pathParts[i]];
            if(prop == null)
                return;
        }
    }
}
