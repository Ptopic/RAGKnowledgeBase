import { RequestBuilder } from '../requestBuilder';
import { getCookie } from '@shared/utils/cookie';
import { COOKIE_NAME } from '@shared/constants/cookies';

export class ServerRequestBuilder<T> extends RequestBuilder<T> {
  constructor(url?: string);
  constructor(
    url?: string,
    requestInit?: RequestInit,
    callback?: (requestInit: RequestInit) => Promise<T>
  ) {
    super(url, requestInit, callback);
  }

  public authenticate() {
    const accessToken = getCookie(COOKIE_NAME.ACCESS_TOKEN);

    this.requestInit = {
      ...this.requestInit,
      headers: {
        ...this.requestInit?.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    };

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleErrors(error: any, url: string, requestInit: RequestInit): Promise<T> {
    throw error;
  }
}
