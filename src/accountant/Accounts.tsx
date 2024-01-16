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
                .map(account => {
                    console.log(JSON.stringify(account.currentBalance));
                    console.log(JSON.stringify(new Decimal("4").abs()));
                    console.log(JSON.stringify(new Decimal("-4").abs()));
                    return account;
                })
                .map(account =>
                    (
                        <li key={account.id}>
                            <>{account.currentBalance.abs()} ++ {account.name}</>
                        </li>
                    ))
        )}</ul>;
    } else {
        return <></>;
    }
}