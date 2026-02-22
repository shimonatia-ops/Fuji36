import type { TaskResponse } from '../services/api'

// Common interface for all practice components
export interface PracticeComponentProps {
  task: TaskResponse
  planId: string
  onComplete?: (taskId: string, results: PracticeResults) => void
  onProgress?: (taskId: string, progress: number) => void
}

export interface PracticeResults {
  completed: boolean
  score?: number
  duration?: number
  repetitions?: number
  metadata?: Record<string, any>
}
