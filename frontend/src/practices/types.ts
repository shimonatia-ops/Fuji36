import type { TaskResponse } from '../services/api'

// Common interface for all practice components
export interface PracticeComponentProps {
  task: TaskResponse
  planId: string
  planName?: string | null
  taskName?: string | null
  onComplete?: (taskId: string, results: PracticeResults) => void
  onProgress?: (taskId: string, progress: number) => void
  /** 'real' = save results to API; 'draft' = preview/try mode, no saving */
  practiceMode?: 'real' | 'draft'
  /** Called when user wants to go back to plan view */
  onBackToPlan?: () => void
}

export interface PracticeResults {
  completed: boolean
  score?: number
  duration?: number
  repetitions?: number
  metadata?: Record<string, any>
}
