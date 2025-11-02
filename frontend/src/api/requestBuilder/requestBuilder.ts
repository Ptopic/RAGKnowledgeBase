import { ICallableRequestBuilder } from './types';
import { fetchApi } from './fetchApi';

export abstract class RequestBuilder<T> implements ICallableRequestBuilder<T> {
  protected constructor(
    url?: string,
    requestInit?: RequestInit,
    callback?: (requestInit: RequestInit) => Promise<T>
  ) {
    this.url = url;
    this.callback = callback;
    this.requestInit = {
      cache: 'no-store',
      ...requestInit,
    };
  }

  public url?: string;
  public requestInit: RequestInit;
  public callback?: (requestInit: RequestInit) => Promise<T>;

  public async call(
    url?: string,
    updateRequestInit?: (init: RequestInit) => RequestInit
  ): Promise<T> {
    const updatedRequestInit = updateRequestInit
      ? updateRequestInit(this.requestInit)
      : this.requestInit;

    const calculatedUrl = url ? url : this.url;
    if (this.callback) {
      return await this.callback(updatedRequestInit);
    } else if (calculatedUrl) {
      try {
        return await this.getResponse(calculatedUrl, updatedRequestInit);
      } catch (error) {
        return await this.handleErrors(
          error,
          calculatedUrl,
          updatedRequestInit
        );
      }
    } else {
      throw Error('Wrong ServerRequestBuilder call');
    }
  }

  protected async getResponse(
    calculatedUrl: string,
    updatedRequestInit: RequestInit
  ) {
    const response = await fetchApi(calculatedUrl, updatedRequestInit);
    const contentType = response.headers.get('Content-Type');

    if (contentType?.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  }

  abstract handleErrors(
    error: any,
    url: string,
    requestInit: RequestInit
  ): Promise<T>;
}
