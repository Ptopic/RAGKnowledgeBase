export const fetchApi = async (
  input: RequestInfo | URL,
  init?: RequestInit | undefined
) => {
  const res = await fetch(input, { ...init, cache: 'no-cache' });

  if (isClientErrorResponse(res.status)) {
    let error;

    try {
      error = await res.json();
    } catch (e) {
      throw Error('An error occurred', { cause: res });
    }

    throw Error(
      error.detail ||
      (!!error.errors && Object.values(error.errors)[0]) ||
      error.message ||
      'Bad request', { cause: res }
    );
  }

  if (isServerErrorResponse(res.status)) {
    throw Error(
      'An error occurred while processing your request. Please try again later.', { cause: res }
    );
  }

  return res;
};


const isClientErrorResponse = (status: number) => {
  return status >= 400 && status < 500;
};
const isServerErrorResponse = (status: number) => {
  return status >= 500;
};
