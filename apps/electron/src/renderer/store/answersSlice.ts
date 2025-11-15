import type { StateCreator } from 'zustand'
import type { AnswersState, Answer } from '../types'

const ANSWER_TIMEOUT_MS = 90000 // 90 seconds

export interface AnswersSlice extends AnswersState {
  addAnswer: (answer: Answer) => void
  setAnswerStatus: (answerId: string, status: Answer['status']) => void
  moveAnswerToHistory: (answerId: string) => void
  promoteFromQueue: () => void
  checkStaleAnswers: () => void
}

export const createAnswersSlice: StateCreator<AnswersSlice> = (set, get) => ({
  // Initial state
  current: null,
  queue: [],
  history: [],

  // Actions
  addAnswer: (answer) => {
    const expiresAt = answer.ts + ANSWER_TIMEOUT_MS

    set((state) => {
      // If there's no current answer, set it
      if (!state.current) {
        return {
          current: { ...answer, expiresAt },
        }
      }

      // Otherwise add to queue
      return {
        queue: [...state.queue, { ...answer, expiresAt }],
      }
    })

    // Start timeout check
    setTimeout(() => {
      const state = get()
      const answerToCheck = state.current?.answerId === answer.answerId ? state.current : state.queue.find((a) => a.answerId === answer.answerId)

      if (answerToCheck && answerToCheck.status === 'ready') {
        get().setAnswerStatus(answer.answerId, 'stale')
      }
    }, ANSWER_TIMEOUT_MS)
  },

  setAnswerStatus: (answerId, status) => {
    set((state) => {
      // Update in current
      if (state.current?.answerId === answerId) {
        return {
          current: { ...state.current, status },
        }
      }

      // Update in queue
      return {
        queue: state.queue.map((a) => (a.answerId === answerId ? { ...a, status } : a)),
      }
    })
  },

  moveAnswerToHistory: (answerId) => {
    set((state) => {
      let movedAnswer: Answer | null = null

      // Check if it's the current answer
      if (state.current?.answerId === answerId) {
        movedAnswer = state.current
        return {
          current: null,
          history: [movedAnswer, ...state.history].slice(0, 50), // Keep last 50
        }
      }

      // Check if it's in the queue
      const queueIndex = state.queue.findIndex((a) => a.answerId === answerId)
      if (queueIndex >= 0) {
        movedAnswer = state.queue[queueIndex]
        const newQueue = [...state.queue]
        newQueue.splice(queueIndex, 1)

        return {
          queue: newQueue,
          history: [movedAnswer, ...state.history].slice(0, 50),
        }
      }

      return state
    })

    // Promote next from queue if current is now empty
    get().promoteFromQueue()
  },

  promoteFromQueue: () => {
    set((state) => {
      if (state.current || state.queue.length === 0) {
        return state
      }

      const [next, ...rest] = state.queue
      return {
        current: next,
        queue: rest,
      }
    })
  },

  checkStaleAnswers: () => {
    const now = Date.now()
    set((state) => {
      let updated = false
      let newCurrent = state.current
      const newQueue = [...state.queue]

      // Check current
      if (newCurrent && newCurrent.expiresAt && now > newCurrent.expiresAt && newCurrent.status === 'ready') {
        newCurrent = { ...newCurrent, status: 'stale' }
        updated = true
      }

      // Check queue
      for (let i = 0; i < newQueue.length; i++) {
        if (newQueue[i].expiresAt && now > newQueue[i].expiresAt && newQueue[i].status === 'ready') {
          newQueue[i] = { ...newQueue[i], status: 'stale' }
          updated = true
        }
      }

      return updated ? { current: newCurrent, queue: newQueue } : state
    })
  },
})
