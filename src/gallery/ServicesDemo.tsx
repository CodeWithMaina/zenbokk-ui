import { useState } from 'react'
import {
  Clock,
  ImageIcon,
  Scissors,
  SlidersHorizontal,
} from 'lucide-react'
import {
  BookingConfirmation,
  BookingSheet,
  BottomBar,
  Button,
  Chip,
  ChipGroup,
  Drawer,
  EmptyState,
  Field,
  FilterDrawer,
  FilterSummary,
  FormGrid,
  Input,
  PageHeader,
  QuickChoices,
  SearchField,
  SectionCard,
  SegmentedControl,
  ServiceCard,
  ServiceEditor,
  ServiceGallery,
  StatusPill,
  Toast,
} from '../components/ui'
import type {
  AppliedFilter,
  BookingSelection,
  ServiceEditorResult,
  ServiceSummary,
} from '../components/ui'
import { formatDuration, money } from '../lib/format'
import { clients, galleryByService, services } from './data'

type ServiceFilter = 'all' | 'active' | 'paused'
type SortOption = 'new' | 'az' | 'price-low' | 'price-high' | 'shortest'
type VisibilityFilter = 'all' | 'visible' | 'hidden'

const filters = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
] as const

const sortOptions = [
  { value: 'new', label: 'Newest' },
  { value: 'az', label: 'Name A–Z' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'shortest', label: 'Shortest first' },
] as const

const durationRanges = [
  { id: 'short', label: 'Up to 30 min', min: 0, max: 30 },
  { id: 'medium', label: '31–60 min', min: 31, max: 60 },
  { id: 'long', label: '61–90 min', min: 61, max: 90 },
  { id: 'extra', label: 'Over 90 min', min: 91, max: Number.MAX_SAFE_INTEGER },
] as const

type DurationRangeId = (typeof durationRanges)[number]['id']

const priceRanges = [
  { value: 'under', label: 'Under 2,500', min: '', max: '2500' },
  { value: 'mid', label: '2,500 – 5,000', min: '2500', max: '5000' },
  { value: 'over', label: '5,000 and over', min: '5000', max: '' },
] as const

export function ServicesDemo() {
  const [catalog, setCatalog] = useState<ServiceSummary[]>(services)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ServiceFilter>('all')
  const [selectedId, setSelectedId] = useState(services[0].id)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [durations, setDurations] = useState<DurationRangeId[]>([])
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [sort, setSort] = useState<SortOption>('new')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorService, setEditorService] = useState<ServiceSummary | null>(null)
  const [editorSaving, setEditorSaving] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [booking, setBooking] = useState<BookingSelection | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)

  const matches = catalog.filter((service) => {
    const storefrontVisible = service.visible ?? true
    const normalizedQuery = query.trim().toLowerCase()
    const minimum = priceMin === '' ? null : Number(priceMin)
    const maximum = priceMax === '' ? null : Number(priceMax)

    return (
      (filter === 'all' || service.status === filter) &&
      (!normalizedQuery ||
        service.name.toLowerCase().includes(normalizedQuery)) &&
      (minimum === null || service.price >= minimum) &&
      (maximum === null || service.price <= maximum) &&
      (durations.length === 0 ||
        durationRanges.some(
          (range) =>
            durations.includes(range.id) &&
            service.duration >= range.min &&
            service.duration <= range.max,
        )) &&
      (visibility === 'all' ||
        (visibility === 'visible' ? storefrontVisible : !storefrontVisible))
    )
  })

  const visible = [...matches]
  if (sort === 'az') visible.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === 'price-low') visible.sort((a, b) => a.price - b.price)
  else if (sort === 'price-high') visible.sort((a, b) => b.price - a.price)
  else if (sort === 'shortest') visible.sort((a, b) => a.duration - b.duration)

  const selected = catalog.find((service) => service.id === selectedId) ?? catalog[0]
  const gallery =
    galleryByService[selected.id] ??
    (selected.image ? [{ src: selected.image, alt: selected.name }] : [])
  const bookable = selected.status === 'active'

  const appliedFilters: AppliedFilter[] = []

  if (priceMin !== '' || priceMax !== '') {
    appliedFilters.push({
      id: 'price',
      label: `Price: ${
        priceMin === '' ? 'Any' : money(Number(priceMin))
      } – ${priceMax === '' ? 'Any' : money(Number(priceMax))}`,
      onRemove: () => {
        setPriceMin('')
        setPriceMax('')
      },
    })
  }

  for (const id of durations) {
    const range = durationRanges.find((item) => item.id === id)
    if (!range) continue
    appliedFilters.push({
      id,
      label: range.label,
      onRemove: () =>
        setDurations((current) => current.filter((value) => value !== id)),
    })
  }

  if (visibility !== 'all') {
    appliedFilters.push({
      id: 'visibility',
      label: `Storefront: ${visibility}`,
      onRemove: () => setVisibility('all'),
    })
  }

  const activePriceRange =
    priceRanges.find(
      (range) => range.min === priceMin && range.max === priceMax,
    )?.value ?? null

  const resetAdvancedFilters = () => {
    setPriceMin('')
    setPriceMax('')
    setDurations([])
    setVisibility('all')
    setSort('new')
  }

  const openCreate = () => {
    setEditorService(null)
    setEditorOpen(true)
  }

  const openEdit = () => {
    setEditorService(selected)
    setEditorOpen(true)
  }

  const handleEditorSubmit = (value: ServiceEditorResult) => {
    setEditorSaving(true)
    window.setTimeout(() => {
      if (editorService) {
        setCatalog((current) =>
          current.map((service) =>
            service.id === editorService.id
              ? {
                  ...service,
                  name: value.name,
                  duration: value.duration,
                  price: value.price,
                  image: value.images[0]?.src ?? service.image,
                  visible: value.visible,
                }
              : service,
          ),
        )
        setSelectedId(editorService.id)
      } else {
        const id = `local-${Date.now()}`
        setCatalog((current) => [
          {
            id,
            name: value.name,
            duration: value.duration,
            price: value.price,
            image: value.images[0]?.src,
            visible: value.visible,
            status: 'active',
            statusLabel: 'Active',
          },
          ...current,
        ])
        setSelectedId(id)
      }

      setEditorSaving(false)
      setEditorOpen(false)
      setToastOpen(true)
    }, 400)
  }

  const toggleStatus = () => {
    setCatalog((current) =>
      current.map((service) =>
        service.id === selected.id
          ? {
              ...service,
              status: service.status === 'active' ? 'paused' : 'active',
              statusLabel:
                service.status === 'active' ? 'Paused' : 'Active',
            }
          : service,
      ),
    )
  }

  const bookedServices = booking
    ? catalog.filter((service) => booking.serviceIds.includes(service.id))
    : []

  return (
    <>
      <PageHeader
        title="Services"
        description="The treatment menu, with photos, duration and pricing."
        actions={
          <>
            <SearchField
              label="Search services"
              placeholder="Search services"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-sm:w-full"
            />
            <Button onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters
              {appliedFilters.length > 0 ? (
                <span className="inline-flex h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-pill bg-inverse px-[0.3rem] text-caption text-on-inverse">
                  {appliedFilters.length}
                </span>
              ) : null}
            </Button>
            <Button variant="primary" onClick={openCreate}>
              New service
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-[0.8rem]">
        <SegmentedControl
          options={filters}
          value={filter}
          onValueChange={setFilter}
          label="Filter services"
        />
        <p className="text-meta text-muted">
          <b className="font-semibold text-fg tabular">{visible.length}</b> of{' '}
          {catalog.length} services
        </p>
      </div>

      <FilterSummary
        filters={appliedFilters}
        onClearAll={resetAdvancedFilters}
        summary={`${visible.length} of ${catalog.length} services match`}
        className="mt-[0.8rem]"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<Scissors className="size-5" />}
          title="No services match"
          description="Try a different search, or clear the filters to see the whole menu."
          action={
            <Button
              onClick={() => {
                setQuery('')
                setFilter('all')
                resetAdvancedFilters()
              }}
            >
              Clear search and filters
            </Button>
          }
          className="card mt-[1rem]"
        />
      ) : (
        <div className="mt-[1rem] grid grid-cols-2 gap-[0.7rem] sm:grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] sm:gap-[0.9rem]">
          {visible.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              muted={service.status === 'paused'}
              onOpen={(next) => setSelectedId(next.id)}
              className={nextClass(service.id === selected.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-[1.6rem] grid gap-[1rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ServiceGallery
          key={selected.id}
          images={gallery}
          label={`${selected.name} photos`}
        />

        <div className="flex flex-col gap-[0.8rem]">
          <SectionCard
            title={selected.name}
            description={`${formatDuration(selected.duration)} · ${money(selected.price)}`}
            action={<StatusPill status={selected.status}>{selected.statusLabel}</StatusPill>}
          >
            <p className="text-meta leading-relaxed text-muted">
              A studio favourite, finished with a scalp massage and a take-home
              care card. Photos update automatically when the team uploads a new
              set.
            </p>

            <div className="mt-[0.9rem] flex flex-wrap gap-[0.5rem]">
              <Button variant="primary" onClick={openEdit}>
                Edit service
              </Button>
              <Button onClick={toggleStatus}>
                {selected.status === 'paused' ? 'Resume' : 'Pause'}
              </Button>
              <Button
                disabled={!bookable}
                onClick={() => setBookingOpen(true)}
              >
                Book
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Details">
            <dl className="flex flex-col">
              <div className="row">
                <dt>Duration</dt>
                <dd className="flex items-center gap-[0.3rem]">
                  <Clock className="size-[0.9rem] text-muted" aria-hidden="true" />
                  {formatDuration(selected.duration)}
                </dd>
              </div>
              <div className="row">
                <dt>Price</dt>
                <dd className="font-semibold tabular">{money(selected.price)}</dd>
              </div>
              <div className="row">
                <dt>Storefront</dt>
                <dd className="font-semibold">
                  {(selected.visible ?? true) ? 'Visible' : 'Hidden'}
                </dd>
              </div>
              <div className="row">
                <dt>Photos</dt>
                <dd className="flex items-center gap-[0.3rem]">
                  <ImageIcon className="size-[0.9rem] text-muted" aria-hidden="true" />
                  {gallery.length}
                </dd>
              </div>
              <div className="row last:border-b-0">
                <dt>Booked this month</dt>
                <dd className="tabular">37</dd>
              </div>
            </dl>
          </SectionCard>

          <div className="card flex items-center gap-[0.6rem] text-meta text-muted">
            <Scissors className="size-4 shrink-0" aria-hidden="true" />
            Prices include studio products. Bridal work requires a deposit.
          </div>
        </div>
      </div>

      <BookingSheet
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={catalog
          .filter((service) => service.status === 'active')
          .map(({ id, name, duration, price }) => ({ id, name, duration, price }))}
        customers={clients.map(({ id, name, phone, tint }) => ({
          id,
          name,
          detail: phone,
          tint,
        }))}
        initialSelection={
          bookable ? { serviceIds: [selected.id] } : undefined
        }
        title="Book appointment"
        description={`For ${selected.name}`}
        onSubmit={(selection) => {
          setBooking(selection)
          setConfirmationOpen(true)
        }}
      />

      {booking ? (
        <BookingConfirmation
          open={confirmationOpen}
          onClose={() => setConfirmationOpen(false)}
          date={formatBookingDate(booking.date)}
          time={booking.time}
          services={bookedServices}
          total={booking.total}
        />
      ) : null}

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        description="Narrow your services by price, duration and storefront visibility."
        onReset={resetAdvancedFilters}
        applyLabel={`Show ${visible.length} service${
          visible.length === 1 ? '' : 's'
        }`}
      >
        <div className="flex flex-col gap-[1.2rem]">
          <div>
            <p className="label">Price (KES)</p>
            <FormGrid>
              <Field label="Min" htmlFor="service-price-min">
                <Input
                  id="service-price-min"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  placeholder="0"
                  value={priceMin}
                  onChange={(event) => setPriceMin(event.target.value)}
                />
              </Field>
              <Field label="Max" htmlFor="service-price-max">
                <Input
                  id="service-price-max"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  placeholder="Any"
                  value={priceMax}
                  onChange={(event) => setPriceMax(event.target.value)}
                />
              </Field>
            </FormGrid>
            <QuickChoices
              options={priceRanges.map(({ value, label }) => ({
                value,
                label,
              }))}
              value={activePriceRange}
              onChange={(value) => {
                const range = priceRanges.find((item) => item.value === value)
                if (!range) return
                setPriceMin(range.min)
                setPriceMax(range.max)
              }}
              label="Price presets"
            />
          </div>

          <div>
            <p className="label">Duration</p>
            <ChipGroup label="Duration filters">
              {durationRanges.map((range) => (
                <Chip
                  key={range.id}
                  pressed={durations.includes(range.id)}
                  onPressedChange={() =>
                    setDurations((current) =>
                      current.includes(range.id)
                        ? current.filter((value) => value !== range.id)
                        : [...current, range.id],
                    )
                  }
                >
                  {range.label}
                </Chip>
              ))}
            </ChipGroup>
          </div>

          <div>
            <p className="label">Storefront</p>
            <SegmentedControl
              options={[
                { value: 'all', label: 'All' },
                { value: 'visible', label: 'Visible' },
                { value: 'hidden', label: 'Hidden' },
              ]}
              value={visibility}
              onValueChange={setVisibility}
              label="Storefront visibility"
            />
          </div>

          <div>
            <p className="label">Sort by</p>
            <ChipGroup label="Sort services">
              {sortOptions.map((option) => (
                <Chip
                  key={option.value}
                  pressed={sort === option.value}
                  onPressedChange={() => setSort(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </ChipGroup>
          </div>
        </div>
      </FilterDrawer>

      <Drawer
        open={editorOpen}
        onClose={() => {
          if (!editorSaving) setEditorOpen(false)
        }}
        title={editorService ? 'Edit service' : 'New service'}
        description="Photos, copy, duration and pricing."
      >
        <ServiceEditor
          key={editorService?.id ?? 'new'}
          showPreview={false}
          formClassName="border-0 bg-transparent p-0 shadow-none"
          initialValue={
            editorService
              ? {
                  name: editorService.name,
                  duration: editorService.duration,
                  price: editorService.price,
                  images: editorService.image
                    ? [{ src: editorService.image, alt: editorService.name }]
                    : [],
                  visible: editorService.visible ?? true,
                }
              : undefined
          }
          busy={editorSaving}
          submitLabel={editorService ? 'Save changes' : 'Create service'}
          onCancel={() => setEditorOpen(false)}
          onSubmit={handleEditorSubmit}
        />
      </Drawer>

      <BottomBar label="Service actions" className="mt-[1.2rem]">
        <Button className="flex-1" onClick={openEdit}>
          Edit
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          disabled={!bookable}
          onClick={() => setBookingOpen(true)}
        >
          Book appointment
        </Button>
      </BottomBar>

      <Toast
        open={toastOpen}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="text-on-inverse"
            onClick={() => setToastOpen(false)}
          >
            Dismiss
          </Button>
        }
      >
        Demo action — nothing was saved.
      </Toast>
    </>
  )
}

function nextClass(active: boolean): string {
  return active ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''
}

function formatBookingDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
