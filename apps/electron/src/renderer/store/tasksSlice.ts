import type { StateCreator } from 'zustand'
import type { TasksState, Task, TaskStatus } from '../types'

export interface TasksSlice extends TasksState {
  addTask: (task: Task) => void
  updateTaskStatus: (taskId: string, status: TaskStatus, detail?: string) => void
  removeTask: (taskId: string) => void
  clearCompletedTasks: () => void
  linkAnswerToTask: (taskId: string, answerId: string) => void
}

export const createTasksSlice: StateCreator<TasksSlice> = (set) => ({
  // Initial state
  tasks: [],

  // Actions
  addTask: (task) => {
    set((state) => ({
      tasks: [...state.tasks, task],
    }))
  },

  updateTaskStatus: (taskId, status, detail) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.taskId === taskId
          ? { ...task, status, ...(detail && { payload: { ...task.payload, detail } }) }
          : task
      ),
    }))

    // Auto-remove completed tasks after 5 seconds
    if (status === 'success' || status === 'failure') {
      setTimeout(() => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.taskId !== taskId),
        }))
      }, 5000)
    }
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.taskId !== taskId),
    }))
  },

  clearCompletedTasks: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== 'success' && task.status !== 'failure'),
    }))
  },

  linkAnswerToTask: (taskId, answerId) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.taskId === taskId ? { ...task, answerId, status: 'success' as TaskStatus } : task
      ),
    }))
  },
})
