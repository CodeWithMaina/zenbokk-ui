import { createFileRoute } from '@tanstack/react-router'
import { ContactPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/contact')({
  component: ContactPage,
})

/**
 * How to reach the business, at its own address.
 *
 * The enquiry form posts to `POST /v1/businesses/{id}/enquiries`, which records
 * the enquiry against this business and delivers it to its owner — so the
 * success screen is shown only after the server accepted it.
 */
