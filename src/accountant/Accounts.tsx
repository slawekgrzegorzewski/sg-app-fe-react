import {useQuery} from "@apollo/client";
import {Accounts as GraphqlAccounts, AccountsQuery} from "../types";
import {Decimal} from "decimal.js";

export function Accounts() {

    const {loading, error, data} = useQuery<AccountsQuery>(GraphqlAccounts);

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return <ul>{(
            data.accounts
                .map(account =>
                    (
                        <li key={account.id}>
                            {account.name}
                        </li>
                    ))
        )}</ul>;
    } else {
        return <></>;
    }
}