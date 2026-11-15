import type { BusinessRule } from './parseBusinessRules'

/**
 * The rules panel: the premium dark slab with a serif heading and the rules read
 * from the business's own copy, each a gold headline over its original sentence.
 *
 * It is only rendered when at least one rule parsed, so it never invents a
 * policy; when it is absent the page grid simply collapses to one column.
 */
export function AboutRules({ rules }: { rules: BusinessRule[] }) {
  if (rules.length === 0) return null

  return (
    <section className="ab-rules" aria-labelledby="ab-rules-h">
      <h2 id="ab-rules-h" className="ab-rules-title">
        How we keep your time
      </h2>
      <ul className="ab-rule-list">
        {rules.map((rule) => (
          <li className="ab-rule" key={rule.headline}>
            <b className="ab-rule-head">{rule.headline}</b>
            <p className="ab-rule-body">{rule.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
