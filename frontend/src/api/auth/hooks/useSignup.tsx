import { UseMutationOptions, useMutation } from '@tanstack/react-query';
import authClientRequests from '../authClientRequests';
import { IAuthResponse, ISignUpData } from '../types';

const useSignup = (
  options?: UseMutationOptions<IAuthResponse, Error, ISignUpData, unknown>
) => {
  return useMutation<IAuthResponse, Error, ISignUpData, unknown>({
    mutationFn: (data: ISignUpData) =>
      authClientRequests.signUpWithPassword(data),
    ...options,
  });
};

export default useSignup;
