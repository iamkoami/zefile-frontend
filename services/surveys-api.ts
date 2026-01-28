import apiClient, { ApiResponse } from "./api-client";

/**
 * NPS Survey Status Response
 */
export interface NpsSurveyStatus {
  shouldShow: boolean;
  paymentCount: number;
  hasCompleted: boolean;
  isDismissed: boolean;
  deferredUntil?: string;
}

/**
 * NPS Submission Request
 */
export interface NpsSubmission {
  score: number;
  comment?: string;
}

/**
 * NPS Submission Response
 */
export interface NpsSubmissionResponse {
  success: boolean;
  message: string;
}

/**
 * Churn reasons enum
 */
export enum ChurnReason {
  TOO_EXPENSIVE = "too_expensive",
  NOT_USING = "not_using",
  FOUND_ALTERNATIVE = "found_alternative",
  MISSING_FEATURES = "missing_features",
  TECHNICAL_ISSUES = "technical_issues",
  OTHER = "other",
}

/**
 * Churn reason option
 */
export interface ChurnReasonOption {
  value: ChurnReason;
  label: string;
  requiresDetails: boolean;
}

/**
 * Churn survey options response
 */
export interface ChurnSurveyOptions {
  reasons: ChurnReasonOption[];
}

/**
 * Churn survey submission request
 */
export interface ChurnSurveySubmission {
  reason: ChurnReason;
  details?: string;
  previousTier: string;
}

/**
 * Churn survey response
 */
export interface ChurnSurveyResponse {
  success: boolean;
  message: string;
}

/**
 * Surveys API client
 */
export const surveysApi = {
  /**
   * Get NPS survey status for current user
   */
  async getNpsSurveyStatus(): Promise<ApiResponse<NpsSurveyStatus>> {
    return apiClient.get<NpsSurveyStatus>("/surveys/nps/status");
  },

  /**
   * Submit NPS survey response
   */
  async submitNpsSurvey(
    data: NpsSubmission
  ): Promise<ApiResponse<NpsSubmissionResponse>> {
    return apiClient.post<NpsSubmissionResponse>("/surveys/nps", data);
  },

  /**
   * Defer NPS survey for 7 days
   */
  async deferNpsSurvey(): Promise<ApiResponse<NpsSubmissionResponse>> {
    return apiClient.post<NpsSubmissionResponse>("/surveys/nps/defer", {});
  },

  /**
   * Permanently dismiss NPS survey
   */
  async dismissNpsSurvey(): Promise<ApiResponse<NpsSubmissionResponse>> {
    return apiClient.post<NpsSubmissionResponse>("/surveys/nps/dismiss", {});
  },

  // ========================================
  // Churn Survey Methods
  // ========================================

  /**
   * Get churn survey options
   */
  async getChurnSurveyOptions(): Promise<ApiResponse<ChurnSurveyOptions>> {
    return apiClient.get<ChurnSurveyOptions>("/surveys/churn/options");
  },

  /**
   * Submit churn survey response
   */
  async submitChurnSurvey(
    data: ChurnSurveySubmission
  ): Promise<ApiResponse<ChurnSurveyResponse>> {
    return apiClient.post<ChurnSurveyResponse>("/surveys/churn", data);
  },

  /**
   * Skip churn survey
   */
  async skipChurnSurvey(
    previousTier: string
  ): Promise<ApiResponse<ChurnSurveyResponse>> {
    return apiClient.post<ChurnSurveyResponse>("/surveys/churn/skip", {
      previousTier,
    });
  },
};

export default surveysApi;
