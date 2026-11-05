import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderDashboard } from '../../test/render'

describe('probe', () => {
  it('renders the dashboard wrapper', () => {
    renderDashboard(<div>hi</div>)
    expect(screen.getByText('hi')).toBeInTheDocument()
  })
})
