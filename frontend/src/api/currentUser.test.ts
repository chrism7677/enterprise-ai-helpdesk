import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticatedFetch = vi.hoisted(() => vi.fn())

vi.mock('./client', () => ({ authenticatedFetch }))

import {
  CurrentUserNotRegisteredError,
  CurrentUserRequestError,
  getCurrentUser,
} from './currentUser'

describe('getCurrentUser', () => {
  beforeEach(() => {
    authenticatedFetch.mockReset()
  })

  it('returns the mapped application user', async () => {
    const currentUser = {
      id: 1,
      name: 'Demo Employee',
      email: 'employee@example.com',
      role: 'employee',
    }
    authenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify(currentUser), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(getCurrentUser()).resolves.toEqual(currentUser)
    expect(authenticatedFetch).toHaveBeenCalledWith('/users/me')
  })

  it('classifies only the backend not-registered response as unmapped', async () => {
    authenticatedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ detail: 'Authenticated user is not registered' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(getCurrentUser()).rejects.toBeInstanceOf(
      CurrentUserNotRegisteredError,
    )
  })

  it('uses a generic error for other failures', async () => {
    authenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Internal detail' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(getCurrentUser()).rejects.toEqual(
      new CurrentUserRequestError(500),
    )
  })
})
