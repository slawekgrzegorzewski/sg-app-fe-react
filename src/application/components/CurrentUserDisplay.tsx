import {CurrentUser, useCurrentUser} from "../../utils/users/use-current-user";

interface Props {
    mapperFunction: (user: CurrentUser) => string;
}

export function CurrentUserDisplay({mapperFunction}: Props) {
    const {user} = useCurrentUser();
    return <>
        {mapperFunction(user!)}
    </>;
}

CurrentUserDisplay.defaultProps = {
    mapperFunction: (currentUser: CurrentUser) => currentUser.user.name
}