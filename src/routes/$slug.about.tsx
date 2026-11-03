import { createFileRoute } from '@tanstack/react-router'
import { AboutPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/about')({
  component: AboutPage,
})

/**
 * About the business, at its own address.
 *
 * The copy is the business's own description plus counts read from its real
 * records; nothing is written here on its behalf.
 */
