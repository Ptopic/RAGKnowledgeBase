import { UseMutationOptions, useMutation } from '@tanstack/react-query';
import agentClientRequests from '../authClientRequests';
import { IAgentChatDto } from '../types';

const useChat = (
   options?: UseMutationOptions<any, Error, IAgentChatDto, unknown>
) => {
   return useMutation<any, Error, IAgentChatDto, unknown>({
      mutationFn: (data: IAgentChatDto) => agentClientRequests.chat(data),
      ...options,
   });
};

export default useChat;
