import { toast } from 'sonner'
import {
  MessageComposerSheet,
} from '../ui/message-composer-sheet'
import type { MessagePayload, MessageRecipient, MessageTemplate } from '../ui/message-composer-sheet'

export type BulkMessageDrawerProps = {
  open: boolean
  onClose: () => void
  recipients: readonly MessageRecipient[]
}

/**
 * Editable starter copy for the composer.
 *
 * These are local writing prompts, not saved business templates: Punched's
 * template endpoints are platform-admin only, so nothing here is presented as
 * business configuration.
 */
const STARTER_TEXT: readonly MessageTemplate[] = [
  {
    id: 'reminder',
    label: 'Reminder',
    body: 'Hi {first_name}, a quick reminder of your upcoming appointment with us. Reply to reschedule.',
  },
  {
    id: 'reward',
    label: 'Reward ready',
    body: 'Hi {first_name}, your loyalty reward is ready to redeem on your next visit.',
  },
  {
    id: 'offer',
    label: 'Offer',
    body: 'Hi {first_name}, enjoy 15% off any service this week. Book now!',
  },
]

/**
 * Bulk messaging from the Clients design.
 *
 * Punched has no outbound bulk messaging endpoint: notification delivery is
 * transactional and driven by registered notification types, and the only
 * customer-facing send route is a rate-limited single-recipient template
 * preview. Nothing here can therefore transmit a message, so the drawer
 * composes and copies instead of pretending to send — the primary action says
 * exactly what it does.
 */
export function BulkMessageDrawer({ open, onClose, recipients }: BulkMessageDrawerProps) {
  const handleCopy = (message: MessagePayload) => {
    const lines = message.recipients.map((recipient) => {
      const first = recipient.name.trim().split(/\s+/)[0] ?? recipient.name
      const body = message.text.replaceAll('{first_name}', first)
      return recipient.detail ? `${recipient.detail} — ${body}` : `${recipient.name} — ${body}`
    })

    const payload = lines.join('\n')

    void navigator.clipboard
      ?.writeText(payload)
      .then(() =>
        toast.success(
          `Copied for ${message.recipients.length} client${message.recipients.length === 1 ? '' : 's'}.`,
          { description: 'Paste it into your SMS or WhatsApp tool — Punched cannot send bulk messages.' },
        ),
      )
      .catch(() =>
        toast.error('Could not copy to the clipboard.', {
          description: 'Select the text and copy it manually instead.',
        }),
      )
  }

  return (
    <MessageComposerSheet
      open={open}
      onClose={onClose}
      recipients={recipients}
      templates={[...STARTER_TEXT]}
      channels={['SMS', 'WhatsApp']}
      title="Send message"
      description="Compose once for everyone selected. Punched has no bulk SMS or WhatsApp endpoint yet, so this copies a personalised message per client for your own messaging tool."
      sendLabel="Copy message"
      maxLength={480}
      onSend={handleCopy}
    />
  )
}
