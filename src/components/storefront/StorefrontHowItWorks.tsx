/**
 * How booking works, in three steps.
 *
 * This is the only storefront block whose copy is the platform's rather than the
 * business's, and it is deliberately a description of what actually happens:
 * choose services, choose a specialist, confirm. It states no price, no timing
 * and no policy — those belong to the business and are read from its own data
 * everywhere else on the page.
 */
export function StorefrontHowItWorks() {
  const steps = [
    {
      title: 'Pick what you need',
      body: 'Choose one service or several. The time and price add up as you go, so there are no surprises at the end.',
    },
    {
      title: 'Choose your specialist',
      body: 'Book with a particular person, or leave it open and the studio assigns whoever is free first.',
    },
    {
      title: 'Confirm your slot',
      body: 'Only real, open times are offered — the studio’s own calendar decides what you can pick.',
    },
  ]

  return (
    <section className="mt-[clamp(2rem,5vw,3.5rem)]">
      <p className="sf-eyebrow">How it works</p>
      <h2 className="sf-heading">Three steps, about a minute</h2>
      <p className="sf-lead">
        No account needed to look around, and nothing is charged until the studio confirms.
      </p>

      <ol className="sf-steps mt-[1.2rem]">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="sf-rise"
            style={{ '--sf-i': index } as React.CSSProperties}
          >
            <p className="sf-step-n">{String(index + 1).padStart(2, '0')}</p>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
