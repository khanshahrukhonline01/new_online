/**
 * useFormState.ts
 *
 * useReducer-based typed form state hook.
 * Replaces 25-40 scattered useState declarations in CoachDashboardPage.tsx,
 * KhelChronicleSubmitPage.tsx, and similar monolith form pages.
 *
 * Usage:
 *   const { fields, errors, dirty, submitting, setField, setError, clearErrors, beginSubmit, endSubmit, reset } =
 *     useFormState({ name: '', email: '' })
 */
import { useReducer, useCallback } from 'react'

export type FieldValues = Record<string, unknown>
export type FieldErrors<S extends FieldValues> = Partial<Record<keyof S, string>>

export interface FormState<S extends FieldValues> {
  fields: S
  errors: FieldErrors<S>
  dirty: boolean
  submitting: boolean
}

export type FormAction<S extends FieldValues> =
  | { type: 'SET_FIELD'; key: keyof S; value: unknown }
  | { type: 'SET_ERROR'; key: keyof S; message: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_ERRORS'; errors: FieldErrors<S> }
  | { type: 'BEGIN_SUBMIT' }
  | { type: 'END_SUBMIT' }
  | { type: 'RESET'; initial: S }

export function formReducer<S extends FieldValues>(state: FormState<S>, action: FormAction<S>): FormState<S> {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, fields: { ...state.fields, [action.key]: action.value }, dirty: true }
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.key]: action.message } }
    case 'CLEAR_ERRORS':
      return { ...state, errors: {} }
    case 'SET_ERRORS':
      return { ...state, errors: action.errors }
    case 'BEGIN_SUBMIT':
      return { ...state, submitting: true }
    case 'END_SUBMIT':
      return { ...state, submitting: false }
    case 'RESET':
      return { fields: action.initial, errors: {}, dirty: false, submitting: false }
    default:
      return state
  }
}

export interface UseFormStateReturn<S extends FieldValues> {
  fields: S
  errors: FieldErrors<S>
  dirty: boolean
  submitting: boolean
  setField: <K extends keyof S>(key: K, value: S[K]) => void
  setError: (key: keyof S, message: string) => void
  clearErrors: () => void
  setErrors: (errors: FieldErrors<S>) => void
  beginSubmit: () => void
  endSubmit: () => void
  reset: (overrides?: Partial<S>) => void
}

export function useFormState<S extends FieldValues>(initial: S): UseFormStateReturn<S> {
  const [state, dispatch] = useReducer(formReducer<S>, {
    fields: initial,
    errors: {},
    dirty: false,
    submitting: false,
  })

  const setField = useCallback(<K extends keyof S>(key: K, value: S[K]) => {
    dispatch({ type: 'SET_FIELD', key, value })
  }, [])

  const setError = useCallback((key: keyof S, message: string) => {
    dispatch({ type: 'SET_ERROR', key, message })
  }, [])

  const clearErrors = useCallback(() => dispatch({ type: 'CLEAR_ERRORS' }), [])

  const setErrors = useCallback((errors: FieldErrors<S>) => {
    dispatch({ type: 'SET_ERRORS', errors })
  }, [])

  const beginSubmit = useCallback(() => dispatch({ type: 'BEGIN_SUBMIT' }), [])
  const endSubmit = useCallback(() => dispatch({ type: 'END_SUBMIT' }), [])

  const reset = useCallback((overrides?: Partial<S>) => {
    dispatch({ type: 'RESET', initial: overrides ? { ...initial, ...overrides } : initial })
  }, [initial])

  return {
    fields: state.fields,
    errors: state.errors,
    dirty: state.dirty,
    submitting: state.submitting,
    setField,
    setError,
    clearErrors,
    setErrors,
    beginSubmit,
    endSubmit,
    reset,
  }
}
