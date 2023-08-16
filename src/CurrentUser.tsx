import {User} from "./types";
import {LOGGED_IN_USER} from "./common/local-storage-keys";

export function CurrentUser() {
    const user: User = JSON.parse(localStorage.getItem(LOGGED_IN_USER)!);
    return <div>
        {user.name}
    </div>;
}