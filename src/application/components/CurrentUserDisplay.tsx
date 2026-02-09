import {CurrentUser, useCurrentUser} from "../../utils/users/use-current-user";

interface Props {
    mapperFunction?: (user: CurrentUser) => string;
}

export function CurrentUserDisplay({
                                       mapperFunction = (currentUser: CurrentUser) => currentUser.user.name
                                   }: Props) {
    const {user} = useCurrentUser();
    return <>
        {mapperFunction(user!)}
    </>;
}