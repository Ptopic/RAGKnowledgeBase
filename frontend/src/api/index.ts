export const fetchApi = async (
  input: RequestInfo | URL,
  init?: RequestInit | undefined
) => {
  const res = await fetch(input, { ...init, cache: 'no-cache' });
  if (res.status >= 400) {
    const { detail } = await res.json();

    throw Error(detail.message || detail, {
      cause: res,
    });
  }

  return res;
};
