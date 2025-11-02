  export interface ICallableRequestBuilder<T> {
  call: (
    url?: string,
    updateRequestInit?: (init: RequestInit) => RequestInit
  ) => Promise<T>;
}
