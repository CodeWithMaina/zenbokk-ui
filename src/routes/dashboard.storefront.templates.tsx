import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { TemplateGallery } from '../components/storefront-builder'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { useApplyStorefrontTemplate, useStorefrontBuilder } from '../lib/storefront-builder'

export const Route = createFileRoute('/dashboard/storefront/templates')({
  component: StorefrontTemplatesPage,
})

function StorefrontTemplatesPage() {
  const { business, hasModule } = useDashboardContext()
  const enabled = hasModule(MODULE.storefront)
  const builder = useStorefrontBuilder(enabled)
  const apply = useApplyStorefrontTemplate(business.id)
  const navigate = useNavigate()

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Template library" description="Choose a design direction for your storefront." />
        <Card className="p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Storefront module not enabled</h2>
          <p className="mt-[0.25rem] text-meta text-muted">
            Templates are part of the Storefront module. Upgrade to browse and apply them.
          </p>
          <Link to="/dashboard/settings" className="btn btn-primary mt-[0.8rem] no-underline">
            View plans
          </Link>
        </Card>
      </div>
    )
  }

  if (builder.isLoading) {
    return (
      <div>
        <PageHeader title="Template library" description="Choose a design direction for your storefront." />
        <div className="grid gap-[1rem] sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="h-[16rem] animate-pulse p-[1rem]" />
          ))}
        </div>
      </div>
    )
  }

  if (builder.isError || !builder.data) {
    return (
      <div>
        <PageHeader title="Template library" description="Choose a design direction for your storefront." />
        <Card className="p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Could not load your storefront</h2>
          <p className="mt-[0.25rem] text-meta text-muted">
            Something went wrong loading your configuration. Please retry.
          </p>
          <button type="button" className="btn btn-primary mt-[0.8rem]" onClick={() => void builder.refetch()}>
            Retry
          </button>
        </Card>
      </div>
    )
  }

  return (
    <TemplateGallery
      activeTemplateId={builder.data.templateId}
      applying={apply.isPending}
      onApply={(templateId) => apply.mutate(templateId)}
      onCustomize={(templateId) => {
        apply.mutate(templateId, {
          onSuccess: () => void navigate({ to: '/dashboard/storefront/builder' }),
        })
      }}
    />
  )
}
