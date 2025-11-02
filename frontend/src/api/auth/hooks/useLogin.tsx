import { UseMutationOptions, useMutation } from '@tanstack/react-query';
import authClientRequests from '../authClientRequests';
import { IAuthResponse, ILoginData } from '../types';

const useLogin = (
  options?: UseMutationOptions<IAuthResponse, Error, ILoginData, unknown>
) => {
  return useMutation<IAuthResponse, Error, ILoginData, unknown>({
    mutationFn: (data: ILoginData) =>
      authClientRequests.loginWithPassword(data),
    ...options,
  });
};

export default useLogin;
