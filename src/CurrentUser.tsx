import {User} from "./types";
import {getCurrentUser} from "./common/local-storage-keys";

interface Props {
    mapperFunction: (user: User) => string;
}

export function CurrentUser({mapperFunction}: Props) {
    const user: User = getCurrentUser();
    return <>
        {mapperFunction(user)}
    </>;
}

CurrentUser.defaultProps = {
    mapperFunction: (user: User) => user.name
}