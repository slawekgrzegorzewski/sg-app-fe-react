import {User} from "./__generated__/graphql";

export function CurrentUser() {
    const user: User = JSON.parse(localStorage.getItem('user')!);
    return <div>
        {user.name}
    </div>;
}