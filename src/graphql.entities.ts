export type GraphqlDomain = {
    __typename?: 'DomainSimple',
    id: number,
    name: string
}

export type GraphqlMonetaryAmount = {
    __typename?: 'MonetaryAmount',
    amount: any,
    currency: any
}

export type GraphqlAccount = {
    __typename?: 'Account',
    publicId: any,
    order: number,
    name: string,
    balanceIndex?: number | null,
    visible: boolean,
    currentBalance: GraphqlMonetaryAmount,
    creditLimit: GraphqlMonetaryAmount,
    bankAccount?: {
        __typename?: 'BankAccount',
        id: number,
        iban: string,
        currency: any,
        owner: string,
        product?: string | null,
        bic?: string | null,
        externalId: string,
        domain: GraphqlDomain
    } | null,
    domain?: GraphqlDomain | null
}

export type GraphqlClient = {
    __typename?: "Client";
    publicId: any;
    name: string;
    domain: GraphqlDomain
};

export type GraphqlSupplier = {
    __typename?: "Supplier";
    publicId: any;
    name: string;
    domain: GraphqlDomain
};