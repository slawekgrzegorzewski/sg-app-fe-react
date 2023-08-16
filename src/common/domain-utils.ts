import {DomainSimple} from "../types";
import {CURRENT_DOMAIN_ID} from "./local-storage-keys";

export function getDomainId(domains: Array<DomainSimple> = [], defaultDomainId: number | null = null) {
    let domainId = localStorage.getItem(CURRENT_DOMAIN_ID) ? Number(localStorage.getItem(CURRENT_DOMAIN_ID)) : null;
    const domainPresentOnDomainsList = (domainId: number) => !domains.filter(d => d.id === domainId);
    if (!domainId || domainPresentOnDomainsList(domainId)) {
        domainId = defaultDomainId!;
    }
    return domainId;
}