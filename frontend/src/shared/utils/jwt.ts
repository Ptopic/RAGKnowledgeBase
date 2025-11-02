import { jwtDecode } from 'jwt-decode';

interface IJwt {
  sub: string;
  exp: number;
  type: string;
}

export const decodeJwt = (jwt: string) => {
  return jwtDecode(jwt) as IJwt;
};
