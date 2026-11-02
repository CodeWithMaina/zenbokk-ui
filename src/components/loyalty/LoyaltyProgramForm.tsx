import type { ReactNode } from 'react'
import type { LoyaltyProgramDraft } from '../../lib/loyalty/types'
import { PROGRAM_TYPE_OPTIONS } from '../../lib/loyalty/mappers'
import { Field, FormGrid, FormGridFull, Input, Textarea } from '../ui/field'
import { LoyaltyDatePicker } from './LoyaltyDatePicker'

export type LoyaltyProgramFormErrors = Partial<Record<keyof LoyaltyProgramDraft, string>>

export type LoyaltyProgramFormProps = {
  value: LoyaltyProgramDraft
  onChange: (patch: Partial<LoyaltyProgramDraft>) => void
  errors?: LoyaltyProgramFormErrors
  /** The card-design section body (gallery + preview), supplied by the drawer. */
  designSlot?: ReactNode
  disabled?: boolean
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-[1.6rem] last:mb-0">
      <h3 className="mb-[0.8rem] text-heading font-bold">{title}</h3>
      {children}
    </section>
  )
}

/**
 * The creation form's fields.
 *
 * Every input maps to a field the create/update endpoint accepts, and the
 * program-type options are exactly the earning models the backend validates
 * (`ProgramTypes`) — no option is offered that the API would reject.
 */
export function LoyaltyProgramForm({
  value,
  onChange,
  errors = {},
  designSlot,
  disabled = false,
}: LoyaltyProgramFormProps) {
  return (
    <div>
      <Section title="Basics">
        <Field label="Program name" htmlFor="lp-name" error={errors.name} className="mb-[0.9rem]">
          <Input
            id="lp-name"
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
            maxLength={100}
            placeholder="e.g. Free Fresh Cut"
            autoComplete="off"
            disabled={disabled}
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="lp-description"
          error={errors.description}
          className="mb-[0.9rem]"
        >
          <Textarea
            id="lp-description"
            value={value.description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={2}
            maxLength={500}
            placeholder="e.g. Get 5 cuts, get 1 free"
            disabled={disabled}
          />
        </Field>

        <div>
          <span className="label">Program type</span>
          <div
            className="grid grid-cols-2 gap-[0.5rem] max-sm:grid-cols-1"
            role="radiogroup"
            aria-label="Program type"
          >
            {PROGRAM_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="relative block cursor-pointer rounded-lg border border-line bg-surface px-[0.9rem] py-[0.7rem] transition-colors hover:bg-hover has-[:checked]:border-accent has-[:checked]:bg-selected has-[:focus-visible]:shadow-ring"
              >
                <input
                  type="radio"
                  name="lp-program-type"
                  value={option.value}
                  checked={value.programType === option.value}
                  onChange={() => onChange({ programType: option.value })}
                  disabled={disabled}
                  className="sr-only"
                />
                <b className="block text-label font-semibold">{option.label}</b>
                <span className="mt-[0.1rem] block text-meta text-muted">{option.description}</span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Schedule">
        <FormGrid>
          <LoyaltyDatePicker
            id="lp-start"
            label="Start date"
            value={value.startDate}
            onChange={(startDate) => onChange({ startDate })}
            presets="start"
            invalid={Boolean(errors.startDate)}
          />
          <LoyaltyDatePicker
            id="lp-end"
            label="End date"
            value={value.endDate}
            onChange={(endDate) => onChange({ endDate })}
            disableOnOrBefore={value.startDate || undefined}
            presets="end"
            invalid={Boolean(errors.endDate)}
          />
          {errors.startDate || errors.endDate ? (
            <FormGridFull>
              {errors.startDate ? <p className="field-error">{errors.startDate}</p> : null}
              {errors.endDate ? <p className="field-error">{errors.endDate}</p> : null}
            </FormGridFull>
          ) : null}
        </FormGrid>
      </Section>

      <Section title="Stamps">
        <FormGrid>
          <Field label="Stamps required" htmlFor="lp-stamps" error={errors.stampsRequired}>
            <Input
              id="lp-stamps"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={value.stampsRequired}
              onChange={(event) => onChange({ stampsRequired: Number(event.target.value) })}
              disabled={disabled}
              invalid={Boolean(errors.stampsRequired)}
            />
          </Field>
          <Field
            label="Welcome stamps"
            htmlFor="lp-welcome"
            error={errors.defaultEnrollmentStamps}
            hint="Stamps a new customer starts with."
          >
            <Input
              id="lp-welcome"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={value.defaultEnrollmentStamps}
              onChange={(event) =>
                onChange({ defaultEnrollmentStamps: Number(event.target.value) })
              }
              disabled={disabled}
              invalid={Boolean(errors.defaultEnrollmentStamps)}
            />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Reward">
        <FormGrid>
          <Field
            label="Reward name or description"
            htmlFor="lp-reward"
            error={errors.rewardDescription}
          >
            <Input
              id="lp-reward"
              value={value.rewardDescription}
              onChange={(event) => onChange({ rewardDescription: event.target.value })}
              maxLength={200}
              placeholder="e.g. Fresh Free Cut"
              autoComplete="off"
              disabled={disabled}
              invalid={Boolean(errors.rewardDescription)}
            />
          </Field>
          <Field label="Reward value (KES)" htmlFor="lp-value" error={errors.rewardValue}>
            <Input
              id="lp-value"
              type="number"
              inputMode="numeric"
              min={0}
              value={value.rewardValue}
              onChange={(event) => onChange({ rewardValue: Number(event.target.value) })}
              disabled={disabled}
              invalid={Boolean(errors.rewardValue)}
            />
          </Field>
        </FormGrid>
      </Section>

      {designSlot ? <Section title="Card design">{designSlot}</Section> : null}
    </div>
  )
}
