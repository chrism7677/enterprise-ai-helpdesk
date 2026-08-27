import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoAccessInstructions } from './DemoAccessInstructions'

describe('signed-out demo access instructions', () => {
  it('explains both demo roles and renders configured public credentials', () => {
    render(
      <DemoAccessInstructions
        employeeCredentials={{
          username: 'employee-demo@example.test',
          password: 'public-employee-password',
        }}
        itStaffCredentials={{
          username: 'it-demo@example.test',
          password: 'public-it-password',
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Live demo access' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Employee demo identity' })).toBeInTheDocument()
    expect(screen.getByText(/Creates support tickets and views its own tickets/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'IT Staff demo identity' })).toBeInTheDocument()
    expect(screen.getByText(/Views queues, claims tickets, adds work notes/)).toBeInTheDocument()
    expect(screen.getByText('employee-demo@example.test')).toBeInTheDocument()
    expect(screen.getByText('public-employee-password')).toBeInTheDocument()
    expect(screen.getByText('it-demo@example.test')).toBeInTheDocument()
    expect(screen.getByText('public-it-password')).toBeInTheDocument()
    expect(screen.getByText(/Sign out at the top/)).toBeInTheDocument()
    expect(
      screen.getByText(
        /Do not enter real personal, confidential, or sensitive information/,
      ),
    ).toBeInTheDocument()
  })

  it('remains usable when demo credentials are not configured', () => {
    render(
      <DemoAccessInstructions
        employeeCredentials={null}
        itStaffCredentials={null}
      />,
    )

    expect(
      screen.getAllByText(
        'Demo credentials are not configured in this build.',
      ),
    ).toHaveLength(2)
  })
})
