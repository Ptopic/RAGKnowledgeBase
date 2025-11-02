import { ICallableRequestBuilder } from '../types';
import { ClientRequestBuilder } from '@api/requestBuilder/client/clientRequestBuilder';

export const withClientRequest = <TArgs extends unknown[], T>(
  callback: (
    request: ICallableRequestBuilder<T>
  ) => (...args: TArgs) => Promise<T>
) => {
  return async (...args: TArgs): Promise<T> => {
    const request = new ClientRequestBuilder<T>();
    return callback(request)(...args);
  };
};

export const withAuthenticatedClientRequest = <TArgs extends unknown[], T>(
  callback: (
    request: ICallableRequestBuilder<T>
  ) => (...args: TArgs) => Promise<T>
): ((...args: TArgs) => Promise<T>) => {
  return async (...args: TArgs) => {
    const request = new ClientRequestBuilder<T>();
    request.authenticate();
    return await callback(request)(...args);
  };
};
