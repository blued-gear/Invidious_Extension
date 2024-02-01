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
    const links = document.querySelectorAll('html body div#app div.reset.flex.flex-col footer a');
    for(let i = 0; i < links.length; i++) {
        const elm = links.item(i);
        if(!(elm instanceof HTMLAnchorElement))
            continue;
        if(elm.href === 'https://docs.piped.video/')
            return true;
    }

    return false;
}
