/**
 * Contacts API Service
 * Handles all contact-related API calls
 */

import { apiClient, ApiResponse } from './api-client';

export interface Contact {
  id: string;
  email: string;
  name?: string;
  organization?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateContactDto {
  user: string;
  email: string;
  name?: string;
  organization?: string;
}

export interface UpdateContactDto {
  id: string;
  email?: string;
  name?: string;
  organization?: string;
}

export class ContactsApi {
  /**
   * Get all contacts for a user
   */
  async getContactsByUserId(userId: string): Promise<ApiResponse<Contact[]>> {
    return apiClient.get<Contact[]>(`/contacts/user/${userId}`);
  }

  /**
   * Search contacts by email for autocomplete
   */
  async searchContacts(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<ApiResponse<Contact[]>> {
    return apiClient.get<Contact[]>(
      `/contacts/search/${userId}?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  /**
   * Get a single contact by ID
   */
  async getContactById(id: string): Promise<ApiResponse<Contact>> {
    return apiClient.get<Contact>(`/contacts/${id}`);
  }

  /**
   * Create a new contact
   */
  async createContact(data: CreateContactDto): Promise<ApiResponse<Contact>> {
    return apiClient.post<Contact>('/contacts', data);
  }

  /**
   * Update a contact
   */
  async updateContact(
    id: string,
    data: UpdateContactDto
  ): Promise<ApiResponse<Contact>> {
    return apiClient.patch<Contact>(`/contacts/${id}`, data);
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/contacts/${id}`);
  }
}

export const contactsApi = new ContactsApi();
