import { authenticatedFetch } from './client'

export type ApplicationRole = 'employee' | 'it_staff'

export interface CurrentUser {
  id: number
  name: string
  email: string
  role: ApplicationRole
}

interface ApiErrorBody {
  detail?: string
}

export class CurrentUserNotRegisteredError extends Error {
  constructor() {
    super('The signed-in Microsoft account is not registered for this application.')
    this.name = 'CurrentUserNotRegisteredError'
  }
}

export class CurrentUserRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super('We could not verify your helpdesk access. Please try again later.')
    this.name = 'CurrentUserRequestError'
    this.status = status
  }
}

async function getErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as ApiErrorBody
    return typeof body.detail === 'string' ? body.detail : null
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await authenticatedFetch('/users/me')

  if (!response.ok) {
    const detail = await getErrorDetail(response)
    if (
      response.status === 403 &&
      detail === 'Authenticated user is not registered'
    ) {
      throw new CurrentUserNotRegisteredError()
    }
    throw new CurrentUserRequestError(response.status)
  }

  return (await response.json()) as CurrentUser
}
