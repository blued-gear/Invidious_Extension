export function isInvidious(): boolean {
    const links = document.querySelectorAll('html body div div#contents footer div div span a');
    for(let i = 0; i < links.length; i++) {
        const elm = links.item(i);
        if(!(elm instanceof HTMLAnchorElement))
            continue;
        if(elm.href === 'https://github.com/iv-org/documentation')
            return true;
    }

    return false;
}

export function isPiped(): boolean {
    const meta = document.head.getElementsByTagName('link');
    for(let i = 0; i < meta.length; i++) {
        const elm = meta.item(i)!!;
        if(elm.type !== 'application/opensearchdescription+xml')
            continue;
        if(elm.title === 'Piped')
            return true;
    }

    return false;
}
