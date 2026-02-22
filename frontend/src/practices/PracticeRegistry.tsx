import type { ComponentType } from 'react'
import type { TaskResponse } from '../services/api'
import type { PracticeComponentProps } from './types'

// Import practice components
import ConesPractice from './shaping/ConesPractice'
import PlacingBlocksPractice from './shaping/PlacingBlocksPractice'
import PegboardPractice from './shaping/PegboardPractice'
import DefaultPractice from './DefaultPractice'

// Registry type
type PracticeRegistry = {
  [key: string]: ComponentType<PracticeComponentProps>
}

// Registry mapping - maps template names to practice components
const practiceRegistry: PracticeRegistry = {
  'ShapingTask32': ConesPractice,           // Cones
  'ShapingTask2': PlacingBlocksPractice,   // Placing Blocks Onto Box
  'ShapingTask3': PegboardPractice,         // Pegboard
  // Add more mappings as you create practice components
  'Default': DefaultPractice,
}

/**
 * Get the practice component for a given task
 * Tries multiple matching strategies:
 * 1. Match by templateName in properties
 * 2. Match by task name keywords
 * 3. Fallback to default practice
 */
export function getPracticeComponent(task: TaskResponse): ComponentType<PracticeComponentProps> {
  // Strategy 1: Match by templateName in properties
  if (task.properties?.templateName) {
    const templateName = String(task.properties.templateName)
    const component = practiceRegistry[templateName]
    if (component) return component
  }

  // Strategy 2: Match by task name keywords
  const taskName = task.name.toLowerCase()
  const nameKeywords: Record<string, string> = {
    'cone': 'ShapingTask32',
    'cones': 'ShapingTask32',
    'placing blocks': 'ShapingTask2',
    'blocks onto box': 'ShapingTask2',
    'pegboard': 'ShapingTask3',
    'peg board': 'ShapingTask3',
  }

  for (const [keyword, templateKey] of Object.entries(nameKeywords)) {
    if (taskName.includes(keyword)) {
      const component = practiceRegistry[templateKey]
      if (component) return component
    }
  }

  // Strategy 3: Fallback to default
  return practiceRegistry['Default'] || DefaultPractice
}

/**
 * Check if a practice component exists for a task
 */
export function hasPracticeComponent(task: TaskResponse): boolean {
  const component = getPracticeComponent(task)
  return component !== DefaultPractice || practiceRegistry['Default'] === DefaultPractice
}
