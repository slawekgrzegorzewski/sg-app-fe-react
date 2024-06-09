import {useQuery} from "@apollo/client";
import {GetAccounts, GetAccountsQuery} from "../types";

export function Accounts() {

    const {
        loading,
        error,
        data
    } = useQuery<GetAccountsQuery>(
        GetAccounts
    );

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return <>
            <ul>{(
                data.accounts
                    .map(account =>
                        (
                            <li key={account.id}>
                                {account.name}
                            </li>
                        ))
            )}</ul>
        </>;
    } else {
        return <></>;
    }
}