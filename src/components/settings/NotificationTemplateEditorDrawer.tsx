import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Field, Input, Textarea } from '../ui/field'
import { Note } from '../ui/note'
import { Skeleton } from '../ui/skeleton'
import { businessNotificationsApi } from '../../lib/notifications/business-api'
import type { BusinessNotificationTemplate } from '../../lib/notifications/business-api'
import {
  useBusinessNotificationVariables,
  usePreviewBusinessNotification,
  useTestSendBusinessNotification,
} from '../../lib/notifications/use-business-notifications'
import { errorMessage } from '../../lib/api/client'
import { channelLabel } from '../../lib/settings'

/**
 * Template editor.
 *
 * The draft is rendered by the same server-side renderer the delivery pipeline
 * uses, so a preview is evidence of what will be sent. Saving writes a versioned
 * override that the pipeline resolves on the next send.
 */
export function TemplateEditorDrawer({
  businessId,
  template,
  onClose,
  onSaved,
}: {
  businessId: string
  template: BusinessNotificationTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEmail = template?.channel === 'email'
  const variables = useBusinessNotificationVariables(businessId, template?.type ?? null)
  const preview = usePreviewBusinessNotification(businessId)
  const testSend = useTestSendBusinessNotification(businessId)

  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [recipient, setRecipient] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!template) return

    setSubject('')
    setBodyText('')
    setBodyHtml('')
    setError(null)

    void businessNotificationsApi
      .effectiveTemplate(businessId, template.type, template.channel)
      .then((effective) => {
        if (cancelled) return
        setSubject(effective.subject ?? '')
        setBodyText(effective.body ?? '')
        setBodyHtml(effective.bodyHtml ?? effective.body ?? '')
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorMessage(cause, 'The current template could not be loaded.'))
      })

    return () => {
      cancelled = true
    }
  }, [businessId, template])

  const tokens = variables.data ?? []

  const draft = useMemo(
    () => ({
      type: template?.type ?? '',
      channel: template?.channel ?? '',
      subjectTemplate: isEmail ? subject : null,
      bodyTemplateHtml: bodyHtml,
      bodyTemplateText: bodyText,
    }),
    [template, isEmail, subject, bodyHtml, bodyText],
  )

  const runPreview = async () => {
    setError(null)
    try {
      const result = await preview.mutateAsync(draft)
      if (result.hasUnknownTokens) {
        toast.error(`Unknown variable(s): ${result.unknownTokens.join(', ')}`)
        return
      }
      toast.success('Preview rendered.')
    } catch (cause) {
      setError(errorMessage(cause, 'The preview could not be rendered.'))
    }
  }

  const runTestSend = async () => {
    if (!template) return
    setError(null)
    try {
      const result = await testSend.mutateAsync({
        channel: template.channel,
        type: template.type,
        recipient: recipient.trim(),
      })
      if (result.accepted) toast.success(result.message)
      else toast.error(result.message)
    } catch (cause) {
      setError(errorMessage(cause, 'The test message could not be sent.'))
    }
  }

  const save = async () => {
    if (!template) return
    setSaving(true)
    setError(null)
    try {
      const payload = { ...draft, updatedBy: 'business-console' }
      if (template.overrideId) {
        await businessNotificationsApi.updateTemplateOverride(businessId, template.overrideId, payload)
      } else {
        await businessNotificationsApi.createTemplateOverride(businessId, payload)
      }
      toast.success('Template saved. New notifications will use it immediately.')
      onSaved()
    } catch (cause) {
      setError(errorMessage(cause, 'The template could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async () => {
    if (!template?.overrideId) return
    setSaving(true)
    setError(null)
    try {
      await businessNotificationsApi.deleteTemplateOverride(businessId, template.overrideId)
      toast.success('Template reset to the platform default.')
      onSaved()
    } catch (cause) {
      setError(errorMessage(cause, 'The template could not be reset.'))
    } finally {
      setSaving(false)
    }
  }

  const insertToken = (token: string, target: 'subject' | 'body' | 'html') => {
    const snippet = `{{${token}}}`
    if (target === 'subject') setSubject((current) => current + snippet)
    else if (target === 'html') setBodyHtml((current) => current + snippet)
    else setBodyText((current) => current + snippet)
  }

  return (
    <Drawer
      open={template !== null}
      onClose={onClose}
      title={template ? template.title || template.type : 'Template'}
      description={template ? `${channelLabel(template.channel)} · ${template.type}` : undefined}
      footer={
        <div className="flex justify-between gap-[0.6rem]">
          <Button
            variant="ghost"
            size="sm"
            disabled={!template?.overrideId || saving}
            onClick={() => void resetToDefault()}
          >
            Reset to default
          </Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      }
    >
      {!template ? null : (
        <div className="flex flex-col gap-[1rem]">
          {error ? (
            <Alert tone="danger" title="Something went wrong">
              {error}
            </Alert>
          ) : null}

          {isEmail ? (
            <Field label="Subject" htmlFor="template-subject">
              <Input
                id="template-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </Field>
          ) : null}

          <Field
            label={isEmail ? 'Plain-text body' : 'Message body'}
            htmlFor="template-body"
            hint={
              template.channel === 'sms'
                ? `${bodyText.length} characters · ${Math.max(1, Math.ceil(bodyText.length / 160))} SMS segment(s)`
                : undefined
            }
          >
            <Textarea
              id="template-body"
              rows={isEmail ? 5 : 4}
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
            />
          </Field>

          {isEmail ? (
            <Field label="HTML body" htmlFor="template-html" hint="Used inside the branded email layout.">
              <Textarea
                id="template-html"
                rows={7}
                value={bodyHtml}
                onChange={(event) => setBodyHtml(event.target.value)}
              />
            </Field>
          ) : null}

          <div>
            <h3 className="mb-[0.4rem] text-meta font-semibold">Available variables</h3>
            {variables.isPending ? (
              <Skeleton className="h-12 rounded-card" />
            ) : tokens.length === 0 ? (
              <p className="text-meta text-muted">This event has no variables.</p>
            ) : (
              <div className="flex flex-wrap gap-[0.35rem]">
                {tokens.map((token) => (
                  <button
                    key={token.token}
                    type="button"
                    title={`${token.label} — e.g. ${token.sampleValue}`}
                    onClick={() => insertToken(token.token, isEmail ? 'html' : 'body')}
                    className="rounded-pill bg-neutral-soft px-[0.6rem] py-[0.2rem] text-pill"
                  >
                    {`{{${token.token}}}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-[0.6rem]">
            <Button
              variant="ghost"
              size="sm"
              disabled={preview.isPending}
              onClick={() => void runPreview()}
            >
              {preview.isPending ? 'Rendering…' : 'Preview with sample data'}
            </Button>
            <Input
              aria-label="Test recipient"
              placeholder={template.channel === 'email' ? 'test@example.com' : '+254712345678'}
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className="max-w-[16rem]"
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={testSend.isPending || recipient.trim().length === 0}
              onClick={() => void runTestSend()}
            >
              {testSend.isPending ? 'Sending…' : 'Send test'}
            </Button>
          </div>

          {preview.data ? (
            <div className="rounded-md border border-line p-[0.8rem]">
              <div className="mb-[0.4rem] flex items-center gap-2">
                <Badge tone={preview.data.hasUnknownTokens ? 'danger' : 'success'}>
                  {preview.data.hasUnknownTokens ? 'Unresolved variables' : 'Preview'}
                </Badge>
              </div>
              {preview.data.subject ? (
                <p className="text-meta font-semibold">{preview.data.subject}</p>
              ) : null}
              <p className="mt-[0.3rem] whitespace-pre-wrap text-meta">{preview.data.body}</p>
            </div>
          ) : null}

          <Note>
            Test messages are marked as tests, never trigger a booking, payment or loyalty workflow, and
            are excluded from your delivery statistics.
          </Note>
        </div>
      )}
    </Drawer>
  )
}
