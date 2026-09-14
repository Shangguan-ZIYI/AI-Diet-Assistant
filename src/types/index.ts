export * from "./meal";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface UserSession {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface OnboardingStateData {
  currentStep: string;
  completedSteps: string[];
  privacyConsented: boolean;
  surveyCompleted: boolean;
}
