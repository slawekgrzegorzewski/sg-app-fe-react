import {Domain, DomainAccessLevel, DomainSimple, DomainUser} from "../../types";

export type GQLDomainSimple = { publicId: string; name: string }

export type GQLDomain = { publicId: string; name: string, users: GQLDomainUser[] }

export type GQLDomainUser = {
    login: string;
    domainAccessLevel: DomainAccessLevel;
}

export const mapDomainUser = (user: DomainUser) => {
    return {
        login: user.login,
        domainAccessLevel: user.domainAccessLevel,
    } as GQLDomainUser;
}

export const mapDomain = (domain: Domain) => {
    return {
        publicId: domain.publicId,
        name: domain.name,
        users: domain.users.map(mapDomainUser),
    } as GQLDomain;
}

export const mapDomainSimple = (domainSimple: DomainSimple) => {
    return {
        publicId: domainSimple.publicId,
        name: domainSimple.name,
    } as GQLDomainSimple;
}