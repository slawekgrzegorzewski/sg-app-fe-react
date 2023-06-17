import {useQuery} from "@apollo/client";
import {gql} from '../__generated__';
import {Navigate} from "react-router-dom";

export function Me() {

    const GET_ME = gql(`
  query Me {
    me {
      name
    }
  }
`);

    const {data, loading, error} = useQuery(GET_ME);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error : {error.message}</p>;
    if (!data?.me) return <p>No user in response</p>;

    localStorage.setItem('user', JSON.stringify(data.me));

    return <div>
        <Navigate to={{pathname: '/login'}} />
    </div>
}