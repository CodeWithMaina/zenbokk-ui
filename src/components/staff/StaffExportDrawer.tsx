import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { StaffMember } from '../../lib/api/types'
import { staffActivityLabel, staffMembershipLabel } from '../../lib/staff'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'

export type StaffExportDrawerProps = {
  open: boolean
  onClose: () => void
  rows: readonly StaffMember[]
  /** Attendance state per member, when the module is entitled. */
  attendanceByStaff?: ReadonlyMap<string, string>
}

const HEADERS = [
  'Name',
  'Job title',
  'Email',
  'Status',
  'Attendance today',
  'Engagement',
  'Bookings today',
  'Stamps this week',
] as const

function cell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/**
 * CSV export of the current selection.
 *
 * Built in the browser from rows the page already holds — there is no staff
 * export endpoint — and offered as copyable text, which is what the design
 * does and what works without a download permission.
 */
export function StaffExportDrawer({
  open,
  onClose,
  rows,
  attendanceByStaff,
}: StaffExportDrawerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState(false)

  const csv = useMemo(() => {
    const body = rows.map((member) =>
      [
        member.fullName,
        member.positionName ?? '',
        member.email,
        staffMembershipLabel(member.membershipStatus),
        attendanceByStaff?.get(member.userId) ?? '',
        staffActivityLabel(member),
        member.appointmentsToday,
        member.stampsLast7d ?? 0,
      ]
        .map(cell)
        .join(','),
    )

    return [HEADERS.map(cell).join(','), ...body].join('\n')
  }, [rows, attendanceByStaff])

  const copy = async () => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.select()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(csv)
      } else {
        document.execCommand('copy')
      }
      setCopied(true)
      toast.success('CSV copied.')
    } catch {
      toast.error('Select the text and copy it manually.')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Export ${rows.length === 1 ? '1 teammate' : `${rows.length} teammates`}`}
      description="Copy this into Excel, Numbers or Google Sheets."
      footer={
        <div className="flex w-full justify-end gap-[0.5rem]">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy CSV'}
          </Button>
        </div>
      }
    >
      <textarea
        ref={textareaRef}
        readOnly
        value={csv}
        aria-label="CSV preview"
        className="min-h-[12rem] w-full rounded-md border border-line bg-sunken p-[0.75rem] font-mono text-[0.75rem] leading-relaxed text-fg"
      />
    </Drawer>
  )
}
