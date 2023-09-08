export function validateUsername(uname: string): string | null {
    if(uname === "")
        return "username is required";

    if(uname.length < 3 || uname.length > 255)
        return "username must be between 3 and 255 characters long";

    if(!/^[a-zA-Z0-9-_]+$/.test(uname))
        return "username may only contain a-z, A-Z, 0-9, '-' and '_'";

    return null;
}

export function validatePassword(passwd: string): string | null {
    if(passwd === "")
        return "password is required";

    if(passwd.length < 12)
        return "password must be at least 12 characters long";

    return null;
}
