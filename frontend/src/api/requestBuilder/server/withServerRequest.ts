import { ICallableRequestBuilder } from '../types';
import { ServerRequestBuilder } from '@api/requestBuilder/server/serverRequestBuilder';

export const withServerRequest = <TArgs extends unknown[], T>(
  callback: (
    request: ICallableRequestBuilder<T>
  ) => (...args: TArgs) => Promise<T>
) => {
  return async (...args: TArgs): Promise<T> => {
    const request = new ServerRequestBuilder<T>();
    return callback(request)(...args);
  };
};
export const withAuthenticatedServerRequest = <TArgs extends unknown[], T>(
  callback: (
    request: ICallableRequestBuilder<T>
  ) => (...args: TArgs) => Promise<T>
): ((...args: TArgs) => Promise<T>) => {
  return async (...args: TArgs) => {
    const request = new ServerRequestBuilder<T>();
    request.authenticate();
    return callback(request)(...args);
  };
};
