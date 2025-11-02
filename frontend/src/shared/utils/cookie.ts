'use server';

import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies } from 'next/headers';

import { COOKIE_NAME } from '@shared/constants';

export const getCookie = async (name: COOKIE_NAME) => {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
};
export const setCookie = async (options: ResponseCookie) => {
  const cookieStore = await cookies();
  cookieStore.set({
    secure: true,
    sameSite: 'lax',
    ...options,
  });
};

export const removeCookie = async (name: COOKIE_NAME) => {
  const cookieStore = await cookies();
  cookieStore.delete(name);
};
