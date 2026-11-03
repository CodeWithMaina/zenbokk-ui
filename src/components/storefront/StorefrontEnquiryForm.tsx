import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Loader2, Phone } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../lib/api/client'
import { useStorefront } from '../../lib/storefront'
import { storefrontApi } from '../../lib/storefront/api'
import {
  normaliseKenyanPhone,
  storefrontEnquirySchema,
} from '../../lib/validation/contact'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'

/**
 * The storefront enquiry form.
 *
 * Four steps, matching the design's flow: what it is about, the detail, how to
 * reply, and who to reply to. The answers are sent to
 * `POST /v1/businesses/{id}/enquiries`, which records the enquiry against the
 * business and notifies its owner — so the success screen is shown only after the
 * server has accepted it. A failure shows the server's own message and keeps the
 * visitor's answers.
 *
 * Nothing here decides whether the business will answer, how fast, or by which
 * channel beyond the preference the visitor states; the confirmation says only
 * what actually happened, which is that the request was received.
 */

const TOPICS = [
  { key: 'services', label: 'Ask about our services', hint: 'Prices, timing or who does what' },
  { key: 'event', label: 'Plan a group or event', hint: 'Bridal, birthdays, team days' },
  { key: 'booking', label: 'Change a booking', hint: 'Reschedule, cancel or add a service' },
  { key: 'other', label: 'Something else', hint: 'Feedback, partnerships or anything' },
] as const

type TopicKey = (typeof TOPICS)[number]['key']

const DETAILS: Record<TopicKey, { question: string; options: string[] }> = {
  services: {
    question: 'What would you like to know?',
    options: ['Prices', 'How long it takes', 'Who to book with', 'Products and aftercare'],
  },
  event: {
    question: 'What’s the occasion?',
    options: ['Wedding or bridal', 'Birthday or party', 'Corporate or team day', 'Something else'],
  },
  booking: {
    question: 'What would you like to do?',
    options: ['Reschedule', 'Cancel', 'Add a service', 'Something else'],
  },
  other: {
    question: 'What’s it about?',
    options: ['Feedback', 'A partnership', 'Working with us', 'Something else'],
  },
}

const REPLY_METHODS = ['Call me', 'WhatsApp', 'Text message'] as const

const STEP_PROMPTS = [
  'Pick one. It takes about 30 seconds.',
  'Tell us a little more.',
  'Choose what suits you best.',
  'Last step. Just so we know who to contact.',
]

export function StorefrontEnquiryForm() {
  const { business, businessId } = useStorefront()

  const [step, setStep] = useState(0)
  const [topic, setTopic] = useState<TopicKey | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [replyMethod, setReplyMethod] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [reference, setReference] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: (answers: string[]) =>
      storefrontApi.sendEnquiry(businessId, {
        topic: topic ?? 'other',
        answers,
        name: name.trim(),
        phoneNumber: normaliseKenyanPhone(phone) ?? phone.trim(),
        message: message.trim() || null,
      }),
    onSuccess: (response) => setReference(response.reference),
  })

  function choose(next: number) {
    setStep(next)
    setFieldErrors({})
  }

  function submit() {
    const parsed = storefrontEnquirySchema.safeParse({ name, phoneNumber: phone, message })

    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        errors[key] ??= issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    send.mutate(
      [
        TOPICS.find((entry) => entry.key === topic)?.label ?? '',
        detail ?? '',
        replyMethod ?? '',
      ].filter(Boolean),
    )
  }

  if (reference) {
    return (
      <div className="sf-done">
        <svg className="sf-ring" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="34" />
          <path d="M27 41l9 9 17-19" />
        </svg>
        <h3 className="sf-heading">Thank you{name ? `, ${name.trim().split(' ')[0]}` : ''}.</h3>
        <p className="sf-lead mx-auto">
          {business.name} has your request. Quote <b>{reference}</b> if you follow up.
        </p>
        <div className="mt-[1rem] flex flex-wrap justify-center gap-[0.5rem]">
          {[TOPICS.find((entry) => entry.key === topic)?.label, detail, replyMethod]
            .filter((answer): answer is string => Boolean(answer))
            .map((answer) => (
              <span key={answer} className="sf-chip">
                {answer}
              </span>
            ))}
        </div>
        <div className="mt-[1.4rem] flex justify-center">
          <Button
            variant="ghost"
            onClick={() => {
              setReference(null)
              setStep(0)
              setTopic(null)
              setDetail(null)
              setReplyMethod(null)
              setMessage('')
            }}
          >
            Send another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[40rem]">
      <div className="mb-[1.2rem] flex items-center gap-[0.8rem] text-meta text-muted">
        <span>Step {step + 1} of 4</span>
        <span className="h-[0.14rem] flex-1 overflow-hidden rounded-pill bg-line">
          <span
            className="block h-full bg-accent transition-[width] duration-500 ease-[var(--ease-standard)]"
            style={{ width: `${(step + 1) * 25}%` }}
          />
        </span>
      </div>

      {step > 0 ? (
        <button
          type="button"
          className="mb-[0.8rem] inline-flex items-center gap-[0.4rem] text-meta text-muted transition-colors hover:text-fg"
          onClick={() => choose(step - 1)}
        >
          <ArrowLeft className="size-[0.9rem]" aria-hidden="true" />
          Back
        </button>
      ) : null}

      {send.isError ? (
        <Alert tone="danger" className="mb-[1rem]">
          {errorMessage(send.error, 'We could not send that. Please try again.')}
        </Alert>
      ) : null}

      {step === 0 ? (
        <Step
          question="What can we help you with?"
          prompt={STEP_PROMPTS[0]}
          options={TOPICS.map((entry) => ({ label: entry.label, hint: entry.hint }))}
          onChoose={(index) => {
            setTopic(TOPICS[index].key)
            setDetail(null)
            choose(1)
          }}
        />
      ) : null}

      {step === 1 && topic ? (
        <Step
          question={DETAILS[topic].question}
          prompt={STEP_PROMPTS[1]}
          options={DETAILS[topic].options.map((label) => ({ label }))}
          onChoose={(index) => {
            setDetail(DETAILS[topic].options[index])
            choose(2)
          }}
        />
      ) : null}

      {step === 2 ? (
        <Step
          question="How should we reply?"
          prompt={STEP_PROMPTS[2]}
          options={REPLY_METHODS.map((label) => ({ label }))}
          onChoose={(index) => {
            setReplyMethod(REPLY_METHODS[index])
            choose(3)
          }}
        />
      ) : null}

      {step === 3 ? (
        <div className="sf-enter">
          <h3 className="sf-heading">Where can we reach you?</h3>
          <p className="sf-lead">{STEP_PROMPTS[3]}</p>

          <label className="label mt-[1rem]" htmlFor="sf-enquiry-name">
            Your name
          </label>
          <input
            id="sf-enquiry-name"
            className="input"
            type="text"
            autoComplete="name"
            value={name}
            placeholder="e.g. Peter Chege"
            aria-invalid={Boolean(fieldErrors.name)}
            onChange={(event) => setName(event.target.value)}
          />
          {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}

          <label className="label mt-[0.8rem]" htmlFor="sf-enquiry-phone">
            Phone number
          </label>
          <input
            id="sf-enquiry-phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            placeholder="07XX XXX XXX"
            aria-invalid={Boolean(fieldErrors.phoneNumber)}
            onChange={(event) => setPhone(event.target.value)}
          />
          {fieldErrors.phoneNumber ? (
            <p className="field-error">{fieldErrors.phoneNumber}</p>
          ) : (
            <p className="mt-[0.3rem] text-caption text-subtle">
              {business.name} replies on this number. We never share it.
            </p>
          )}

          <label className="label mt-[0.8rem]" htmlFor="sf-enquiry-message">
            Anything to add? <span className="text-subtle">(optional)</span>
          </label>
          <textarea
            id="sf-enquiry-message"
            className="textarea"
            rows={3}
            value={message}
            placeholder="A date, a name, a detail that helps"
            onChange={(event) => setMessage(event.target.value)}
          />

          <Button
            variant="primary"
            className="mt-[1.2rem] w-full"
            onClick={submit}
            disabled={send.isPending}
          >
            {send.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              <>
                <Phone className="size-4" aria-hidden="true" />
                Send request
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function Step({
  question,
  prompt,
  options,
  onChoose,
}: {
  question: string
  prompt: string
  options: { label: string; hint?: string }[]
  onChoose: (index: number) => void
}) {
  return (
    <div className="sf-enter">
      <h3 className="sf-heading">{question}</h3>
      <p className="sf-lead">{prompt}</p>

      <div className="mt-[1.2rem]">
        {options.map((option, index) => (
          <button
            key={option.label}
            type="button"
            className="sf-option"
            onClick={() => onChoose(index)}
          >
            <span className="sf-option-body">
              <b>{option.label}</b>
              {option.hint ? <span>{option.hint}</span> : null}
            </span>
            <span className="sf-option-price">
              <ArrowRight className="size-[1.1rem]" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

