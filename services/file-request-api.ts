import { apiClient, ApiResponse } from "./api-client";

export interface CreateFileRequestDto {
  title: string;
  description?: string;
  budgetMinorUnits: number;
  currency: string;
  creativeEmail: string;
  deadline?: string;
}

export interface FileRequestDto {
  id: string;
  shortCode: string;
  title: string;
  description: string | null;
  budgetMinorUnits: number;
  currency: string;
  clientEmail: string;
  creativeEmail: string;
  status: string;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  deadline: string | null;
  autoApproveDays: number;
  maxRevisions: number;
  revisionCount: number;
  paidAt: string | null;
  deliveredAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deliveries?: Array<{
    id: string;
    deliveryNumber: number;
    message: string | null;
    status: string;
    revisionFeedback: string | null;
    createdAt: string;
  }>;
}

export interface PublicFileRequestDto {
  id: string;
  shortCode: string;
  title: string;
  description: string | null;
  budgetMinorUnits: number;
  currency: string;
  status: string;
  deadline: string | null;
  createdAt: string;
}

export interface InitializeEscrowPaymentDto {
  customerEmail: string;
  paymentMethod?: "card" | "mobile_money";
  mobileMoneyProvider?: string;
  phoneNumber?: string;
  countryCode?: string;
  callbackUrl?: string;
}

export interface EscrowPaymentResponse {
  reference: string;
  authorizationUrl?: string;
  status: string;
  requiresPolling?: boolean;
  isMobileMoney?: boolean;
}

class FileRequestApi {
  async createFileRequest(
    dto: CreateFileRequestDto
  ): Promise<ApiResponse<FileRequestDto>> {
    return apiClient.post<FileRequestDto>("/file-requests", dto);
  }

  async payFileRequest(
    id: string,
    dto: InitializeEscrowPaymentDto
  ): Promise<ApiResponse<EscrowPaymentResponse>> {
    return apiClient.post<EscrowPaymentResponse>(
      `/file-requests/${id}/pay`,
      dto
    );
  }

  async getMyRequests(
    page = 1,
    limit = 20
  ): Promise<
    ApiResponse<{
      data: FileRequestDto[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    return apiClient.get(
      `/file-requests/client/mine?page=${page}&limit=${limit}`
    );
  }

  async getMyDeliveries(
    page = 1,
    limit = 20
  ): Promise<
    ApiResponse<{
      data: FileRequestDto[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    return apiClient.get(
      `/file-requests/creative/mine?page=${page}&limit=${limit}`
    );
  }

  async getPublicRequest(
    shortCode: string
  ): Promise<ApiResponse<PublicFileRequestDto>> {
    return apiClient.get<PublicFileRequestDto>(
      `/file-requests/${shortCode}/public`
    );
  }

  async deliver(
    id: string,
    dto: { message?: string }
  ): Promise<ApiResponse<FileRequestDto>> {
    return apiClient.post<FileRequestDto>(
      `/file-requests/${id}/deliver`,
      dto
    );
  }

  async approve(id: string): Promise<ApiResponse<FileRequestDto>> {
    return apiClient.post<FileRequestDto>(
      `/file-requests/${id}/approve`,
      {}
    );
  }

  async requestRevision(
    id: string,
    dto: { feedback: string }
  ): Promise<ApiResponse<FileRequestDto>> {
    return apiClient.post<FileRequestDto>(
      `/file-requests/${id}/request-revision`,
      dto
    );
  }
}

export const fileRequestApi = new FileRequestApi();
