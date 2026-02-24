// API Gateway runs on HTTP (5000) in local Docker development
// Use HTTP for development to avoid certificate issues
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
}

export interface MeResponse {
  userId: string
  email: string
  roles: string[]
  firstName?: string | null
  lastName?: string | null
  externalUserId?: string | null
  avatarUrl?: string | null
}

export interface TaskTemplateResponse {
  templateId: string
  templateName: string
  taskType: number // 1 = ShapingTask
  name: string
  description: string | null
  properties: Record<string, any> | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PatientResponse {
  patientId: string
  userId: string // UserEntity.Id (MongoDB _id)
  userExternalId: string | null // UserEntity.UserId property (external userId)
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  phoneNumber: string | null
  address: string | null
  medicalNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface TherapistResponse {
  therapistId: string
  userId: string
  licenseNumber: string | null
  specialization: string | null
  phoneNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskResponse {
  taskId: string
  taskType: number
  name: string
  description: string | null
  status: number // TaskStatus enum
  progressPercentage: number
  dueDate: string | null
  properties: Record<string, any> | null
}

export interface UpdateTaskStatusRequest {
  status: number // TaskStatus enum
  progressPercentage?: number
}

export interface PlanResponse {
  planId: string
  patientId: string
  therapistId: string | null
  planName: string | null
  status: number | string // PlanStatus enum (can be number or string depending on serialization)
  frequency: number | string // PlanFrequency enum
  goals: string[]
  progress: number | string // PlanProgress enum
  progressPercentage: number
  startDate: string | null
  dueDate: string | null
  completedDate: string | null
  description: string | null
  tasks: TaskResponse[]
  createdAt: string
  updatedAt: string
}

export interface CreatePlanRequest {
  patientId: string
  planName: string | null
  frequency: string | number // PlanFrequency enum - backend expects string enum name
  goals: string[]
  startDate: string | null
  dueDate: string | null
  description: string | null
  tasks: CreateTaskRequest[]
}

// Helper function to convert plan frequency number to enum string
// Backend uses JsonStringEnumConverter which expects exact enum names
export function planFrequencyToString(frequency: number): string {
  switch (frequency) {
    case 1:
      return 'Daily' // Exact enum name as defined in C#
    case 2:
      return 'Weekly'
    case 3:
      return 'Monthly'
    case 4:
      return 'Continuous'
    default:
      return 'Daily' // Default fallback
  }
}

export interface CreateTaskRequest {
  taskType: string | number // Backend expects string enum name, but we'll convert number to string
  name: string
  description: string | null
  dueDate: string | null
  properties: Record<string, any> | null
}

// Helper function to convert task type number to enum string
// Backend uses JsonStringEnumConverter which expects exact enum names
export function taskTypeToString(taskType: number): string {
  switch (taskType) {
    case 1:
      return 'ShapingTask' // Exact enum name as defined in C#
    default:
      return 'ShapingTask' // Default fallback
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()
    const userId = localStorage.getItem('user_id')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (userId) {
      headers['X-User-Id'] = userId
    }

    try {
      const url = `${this.baseUrl}${endpoint}`
      console.log(`[API] ${options.method || 'GET'} ${url}`)
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      return response.json()
    } catch (error) {
      // Handle network errors (CORS, connection refused, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Network error: Unable to connect to API. Please ensure the API Gateway is running at ${this.baseUrl}. ` +
          `Original error: ${error.message}`
        )
      }
      throw error
    }
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>('/api/auth/me', {
      method: 'GET',
    })
  }

  async getTaskTemplates(taskType?: number, isActive?: boolean): Promise<TaskTemplateResponse[]> {
    const params = new URLSearchParams()
    if (taskType !== undefined) {
      params.append('taskType', taskType.toString())
    }
    if (isActive !== undefined) {
      params.append('isActive', isActive.toString())
    }
    const queryString = params.toString()
    const endpoint = queryString ? `/api/task-templates?${queryString}` : '/api/task-templates'
    return this.request<TaskTemplateResponse[]>(endpoint, {
      method: 'GET',
    })
  }

  async getTaskTemplate(templateId: string): Promise<TaskTemplateResponse> {
    return this.request<TaskTemplateResponse>(`/api/task-templates/${templateId}`, {
      method: 'GET',
    })
  }

  async getTherapistByUserId(userId: string): Promise<TherapistResponse> {
    return this.request<TherapistResponse>(`/api/therapists/user/${userId}`, {
      method: 'GET',
    })
  }

  async getTherapistPatients(therapistId: string): Promise<PatientResponse[]> {
    return this.request<PatientResponse[]>(`/api/therapists/${therapistId}/patients`, {
      method: 'GET',
    })
  }

  async getPatientByUserId(userId: string): Promise<PatientResponse> {
    return this.request<PatientResponse>(`/api/patients/user/${userId}`, {
      method: 'GET',
    })
  }

  async getPatientPlans(patientId: string): Promise<PlanResponse[]> {
    return this.request<PlanResponse[]>(`/api/plans/patient/${patientId}`, {
      method: 'GET',
    })
  }

  async createPlan(plan: CreatePlanRequest): Promise<PlanResponse> {
    console.log('API Client - Sending plan request:', JSON.stringify(plan, null, 2))
    return this.request<PlanResponse>('/api/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    })
  }

  async getPlan(planId: string): Promise<PlanResponse> {
    return this.request<PlanResponse>(`/api/plans/${planId}`, {
      method: 'GET',
    })
  }

  async addTaskToPlan(planId: string, task: CreateTaskRequest): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/api/plans/${planId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    })
  }

  async deleteTaskFromPlan(planId: string, taskId: string): Promise<void> {
    return this.request<void>(`/api/plans/${planId}/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  async updateTaskStatus(
    planId: string,
    taskId: string,
    req: UpdateTaskStatusRequest
  ): Promise<void> {
    return this.request<void>(`/api/plans/${planId}/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
