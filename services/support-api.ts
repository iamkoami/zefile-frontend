/**
 * Support API Service
 * Handles all support chat-related API requests
 */

import { apiClient, ApiResponse } from './api-client';

// Conversation category (matches backend enum)
export type ConversationCategory =
  | 'general'
  | 'download'
  | 'payment'
  | 'payout'
  | 'account'
  | 'technical';

// Message sender type (matches backend enum)
export type MessageSenderType = 'user' | 'ai' | 'agent' | 'system';

// Conversation status (matches backend enum)
export type ConversationStatus =
  | 'open'
  | 'waiting_on_user'
  | 'waiting_on_agent'
  | 'resolved'
  | 'closed';

export interface SupportMessage {
  id: string;
  senderType: MessageSenderType;
  senderId?: string;
  content: string;
  metadata?: Record<string, unknown>;
  isAction: boolean;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  userId?: string;
  visitorEmail?: string;
  visitorName?: string;
  shortCode?: string;
  accessToken?: string;
  subject: string;
  status: ConversationStatus;
  priority: string;
  category: ConversationCategory;
  isAiHandled: boolean;
  aiSummary?: string;
  metadata: Record<string, unknown>;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

export interface CreateConversationDto {
  category: ConversationCategory;
  message: string;
  visitorEmail?: string;
  visitorName?: string;
  shortCode?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageDto {
  content: string;
  visitorEmail?: string;
}

class SupportApiService {
  async createConversation(
    data: CreateConversationDto
  ): Promise<ApiResponse<SupportConversation>> {
    return apiClient.post('/support/conversations', data);
  }

  async getConversation(
    id: string,
    visitorEmail?: string
  ): Promise<ApiResponse<SupportConversation>> {
    const params = visitorEmail
      ? `?visitorEmail=${encodeURIComponent(visitorEmail)}`
      : '';
    return apiClient.get(`/support/conversations/${id}${params}`);
  }

  async sendMessage(
    conversationId: string,
    data: SendMessageDto
  ): Promise<ApiResponse<{ messages: SupportMessage[] }>> {
    return apiClient.post(
      `/support/conversations/${conversationId}/messages`,
      data
    );
  }

  async getActiveConversation(visitorEmail?: string): Promise<
    ApiResponse<SupportConversation | null>
  > {
    const params = visitorEmail
      ? `?visitorEmail=${encodeURIComponent(visitorEmail)}`
      : '';
    return apiClient.get(`/support/conversations/active${params}`);
  }

  async resolveConversation(
    id: string,
    visitorEmail?: string
  ): Promise<ApiResponse<SupportConversation>> {
    return apiClient.post(`/support/conversations/${id}/resolve`, {
      visitorEmail,
    });
  }

  async escalateConversation(
    id: string,
    visitorEmail?: string
  ): Promise<ApiResponse<SupportConversation>> {
    return apiClient.post(`/support/conversations/${id}/escalate`, {
      visitorEmail,
    });
  }

  async submitFeedback(
    conversationId: string,
    verdict: 'helpful' | 'not_helpful' | 'reopen',
    accessToken?: string | null,
  ): Promise<ApiResponse<{ success: boolean; verdict: string }>> {
    return apiClient.post(`/support/conversations/${conversationId}/feedback`, {
      verdict,
      ...(accessToken ? { accessToken } : {}),
    });
  }
}

export const supportApi = new SupportApiService();
