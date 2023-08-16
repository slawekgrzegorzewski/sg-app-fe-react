import {CurrentUser} from "./CurrentUser";
import {Accounts} from "./accountant/Accounts";

export function Home() {
    return <>
        <CurrentUser/>
        <Accounts/>
    </>
}