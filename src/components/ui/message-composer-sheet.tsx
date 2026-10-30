import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Send } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from './avatar'
import type { AvatarTint } from './avatar'
import { Button } from './button'
import { Chip } from './chip'
import { Drawer } from './drawer'
import { Field, Textarea } from './field'
import { SegmentedControl } from './segmented-control'

export type MessageRecipient = {
  id: string
  name: string
  tint?: AvatarTint
  /** Optional supporting text, e.g. a phone number. */
  detail?: string
}

export type MessageTemplate = {
  id: string
  label: string
  body: string
}

export type MessagePayload = {
  recipients: readonly MessageRecipient[]
  channel: string
  text: string
}

export type MessageComposerSheetProps = {
  open: boolean
  onClose: () => void
  recipients: readonly MessageRecipient[]
  /** Defaults to SMS and WhatsApp, the channels in the design. */
  channels?: readonly string[]
  defaultChannel?: string
  templates?: readonly MessageTemplate[]
  initialText?: string
  title?: ReactNode
  description?: ReactNode
  sendLabel?: string
  cancelLabel?: string
  maxLength?: number
  closeOnSend?: boolean
  onSend: (message: MessagePayload) => void
}

/** Recipient picker, channel toggle, templates and a counted message body. */
export function MessageComposerSheet(props: MessageComposerSheetProps) {
  if (!props.open) return null
  return <MessageComposerForm {...props} />
}

function MessageComposerForm({
  open,
  onClose,
  recipients,
  channels = ['SMS', 'WhatsApp'],
  defaultChannel,
  templates = [],
  initialText = '',
  title = 'Send message',
  description = 'Write once and send it to everyone selected.',
  sendLabel = 'Send',
  cancelLabel = 'Cancel',
  maxLength = 320,
  closeOnSend = true,
  onSend,
}: MessageComposerSheetProps) {
  const textId = useId()
  const [channel, setChannel] = useState(defaultChannel ?? channels[0] ?? 'SMS')
  const [text, setText] = useState(initialText)
  const [templateId, setTemplateId] = useState<string | null>(null)

  const channelOptions = channels.map((value) => ({ value, label: value }))
  const canSend = recipients.length > 0 && text.trim().length > 0
  const visibleRecipients = recipients.slice(0, 6)

  const handleSend = () => {
    if (!canSend) return
    onSend({ recipients, channel, text: text.trim() })
    if (closeOnSend) onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-[0.8rem] max-sm:flex-col max-sm:items-stretch">
          <div className="min-w-0 text-meta text-muted">
            <b className="font-semibold text-fg tabular">
              {recipients.length}
            </b>{' '}
            recipient{recipients.length === 1 ? '' : 's'} · {channel}
          </div>
          <div className="flex shrink-0 gap-[0.5rem] max-sm:w-full max-sm:[&>*]:flex-1">
            <Button onClick={onClose}>{cancelLabel}</Button>
            <Button variant="primary" disabled={!canSend} onClick={handleSend}>
              <Send className="size-4" aria-hidden="true" />
              {sendLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-[1.2rem]">
        <div>
          <p className="label">To</p>
          <div className="flex flex-wrap gap-[0.4rem]">
            {visibleRecipients.map((recipient) => (
              <span
                key={recipient.id}
                className="inline-flex items-center gap-[0.35rem] rounded-pill border border-line bg-surface py-[0.2rem] pr-[0.65rem] pl-[0.2rem] text-meta"
              >
                <Avatar
                  name={recipient.name}
                  tint={recipient.tint}
                  size="sm"
                  decorative
                  className="size-[1.65rem] text-[0.62rem]"
                />
                <span className="max-w-[8rem] truncate">
                  {recipient.name.trim().split(/\s+/)[0]}
                </span>
              </span>
            ))}
            {recipients.length > visibleRecipients.length ? (
              <span className="inline-flex items-center rounded-pill border border-line px-[0.65rem] text-meta text-muted">
                +{recipients.length - visibleRecipients.length} more
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="label">Channel</p>
          <SegmentedControl
            options={channelOptions}
            value={channel}
            onValueChange={setChannel}
            label="Message channel"
            className="w-max max-w-full"
          />
        </div>

        {templates.length > 0 ? (
          <div>
            <p className="label">Template</p>
            <div
              role="group"
              aria-label="Message templates"
              className="flex flex-wrap gap-[0.45rem]"
            >
              {templates.map((template) => (
                <Chip
                  key={template.id}
                  pressed={templateId === template.id}
                  onPressedChange={() => {
                    setTemplateId(template.id)
                    setText(template.body)
                  }}
                >
                  {template.label}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        <Field
          label="Message"
          htmlFor={textId}
          hint="Use {first_name} to personalise this message."
        >
          <Textarea
            id={textId}
            value={text}
            maxLength={maxLength}
            rows={5}
            placeholder="Write your message"
            onChange={(event) => {
              setText(event.target.value)
              setTemplateId(null)
            }}
          />
        </Field>

        <p
          className={cn(
            '-mt-[0.8rem] text-right text-caption text-muted tabular',
            text.length >= maxLength && 'text-warning-ink',
          )}
        >
          {text.length}/{maxLength}
        </p>
      </div>
    </Drawer>
  )
}

