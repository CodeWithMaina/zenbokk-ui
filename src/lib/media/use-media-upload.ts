import { useCallback, useEffect, useRef, useState } from 'react'
import { newIdempotencyKey } from './api'
import type { MediaPurpose, MediaRecord } from './api'
import { uploadMedia } from './upload'
import type { UploadPhase, UploadResult } from './upload'

/** One in-flight (or finished) upload, keyed by whatever the caller chose. */
export type MediaUploadState = {
  status: UploadPhase | 'error' | 'cancelled'
  /** 0–100 while the bytes are going up. */
  progress: number
  media?: MediaRecord
  /** True once the row exists but the worker has not produced variants yet. */
  ready: boolean
  error?: string
}

export type MediaUploads = {
  /** Progress per key; a key with no entry has never been uploaded. */
  states: Record<string, MediaUploadState>
  /** How many uploads are still running (drives a form's "saving" affordance). */
  pending: number
  upload: (
    key: string,
    file: File,
    options?: { targetId?: string | null; idempotencyKey?: string },
  ) => Promise<UploadResult>
  /** Re-runs the last file chosen for a key, reusing its idempotency key. */
  retry: (key: string) => Promise<UploadResult | null>
  /** Aborts an in-flight upload and marks the slot cancelled. */
  cancel: (key: string) => void
  clear: (key: string) => void
  clearAll: () => void
}

/**
 * Progress-aware image uploads for a fixed set of slots.
 *
 * The caller owns the slots and the keys; this hook owns the per-key progress,
 * the retry bookkeeping and the abort controllers, so a component can reorder or
 * remove slots without losing another one's upload. Failures are captured into
 * state rather than thrown, because a slot renders its own error and retry.
 *
 * Cleanup is part of the contract: leaving the screen (or unmounting the hook)
 * aborts every in-flight transfer, so a closed drawer cannot keep a large upload
 * alive on a phone's data connection.
 */
export function useMediaUpload(purpose: MediaPurpose): MediaUploads {
  const [states, setStates] = useState<Record<string, MediaUploadState>>({})
  const controllers = useRef(new Map<string, AbortController>())
  const files = useRef(new Map<string, File>())
  const keys = useRef(new Map<string, string>())
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const inFlight = controllers.current
    return () => {
      mounted.current = false
      for (const controller of inFlight.values()) controller.abort()
      inFlight.clear()
    }
  }, [])

  const patch = useCallback((key: string, next: MediaUploadState) => {
    if (!mounted.current) return
    setStates((current) => ({ ...current, [key]: next }))
  }, [])

  const run = useCallback(
    async (key: string, file: File, options?: { targetId?: string | null; idempotencyKey?: string }) => {
      // One controller per slot: starting a new upload for a key supersedes the
      // previous one instead of racing it.
      controllers.current.get(key)?.abort()
      const controller = new AbortController()
      controllers.current.set(key, controller)
      files.current.set(key, file)

      const idempotencyKey = options?.idempotencyKey ?? keys.current.get(key) ?? newIdempotencyKey()
      keys.current.set(key, idempotencyKey)

      patch(key, { status: 'uploading', progress: 0, ready: false })

      const result = await uploadMedia({
        file,
        purpose,
        targetId: options?.targetId ?? null,
        idempotencyKey,
        signal: controller.signal,
        onProgress: (progress) =>
          setStates((current) => {
            const entry = current[key]
            // Skip no-op updates: progress events fire far more often than the
            // rounded percentage actually changes.
            if (!entry || entry.status !== 'uploading' || entry.progress === progress) return current
            return { ...current, [key]: { ...entry, progress } }
          }),
        onPhase: (phase) => {
          if (phase === 'ready') return
          patch(key, { status: phase, progress: phase === 'processing' ? 100 : 0, ready: false })
        },
      })

      controllers.current.delete(key)

      if (result.ok) {
        patch(key, { status: 'ready', progress: 100, media: result.media, ready: result.ready })
      } else if (result.cancelled) {
        patch(key, { status: 'cancelled', progress: 0, ready: false, error: undefined })
      } else {
        patch(key, { status: 'error', progress: 0, ready: false, error: result.message })
      }

      return result
    },
    [patch, purpose],
  )

  const retry = useCallback(
    async (key: string) => {
      const file = files.current.get(key)
      if (!file) return null
      // Reuse the slot's key so a retry cannot mint a second media row.
      return run(key, file, { idempotencyKey: keys.current.get(key) })
    },
    [run],
  )

  const cancel = useCallback(
    (key: string) => {
      controllers.current.get(key)?.abort()
      controllers.current.delete(key)
      patch(key, { status: 'cancelled', progress: 0, ready: false })
    },
    [patch],
  )

  const clear = useCallback(
    (key: string) => {
      controllers.current.get(key)?.abort()
      controllers.current.delete(key)
      files.current.delete(key)
      keys.current.delete(key)
      if (!mounted.current) return
      setStates((current) => {
        if (!(key in current)) return current
        const next = { ...current }
        delete next[key]
        return next
      })
    },
    [],
  )

  const clearAll = useCallback(() => {
    for (const controller of controllers.current.values()) controller.abort()
    controllers.current.clear()
    files.current.clear()
    keys.current.clear()
    if (mounted.current) setStates({})
  }, [])

  const pending = Object.values(states).filter(
    (state) => state.status === 'uploading' || state.status === 'processing',
  ).length

  return { states, pending, upload: run, retry, cancel, clear, clearAll }
}
