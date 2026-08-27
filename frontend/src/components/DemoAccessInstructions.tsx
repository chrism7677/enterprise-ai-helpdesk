interface DemoCredentials {
  username: string
  password: string
}

interface DemoAccessInstructionsProps {
  employeeCredentials?: DemoCredentials | null
  itStaffCredentials?: DemoCredentials | null
}

function configuredCredentials(
  username: string | undefined,
  password: string | undefined,
): DemoCredentials | null {
  if (!username || !password) {
    return null
  }

  return { username, password }
}

function DemoIdentityCredentials({
  credentials,
}: {
  credentials: DemoCredentials | null
}) {
  if (credentials === null) {
    return (
      <p className="demo-credentials-unavailable">
        Demo credentials are not configured in this build.
      </p>
    )
  }

  return (
    <dl className="demo-credentials">
      <div>
        <dt>Username</dt>
        <dd><code>{credentials.username}</code></dd>
      </div>
      <div>
        <dt>Password</dt>
        <dd><code>{credentials.password}</code></dd>
      </div>
    </dl>
  )
}

export function DemoAccessInstructions({
  employeeCredentials = configuredCredentials(
    import.meta.env.VITE_DEMO_EMPLOYEE_USERNAME,
    import.meta.env.VITE_DEMO_EMPLOYEE_PASSWORD,
  ),
  itStaffCredentials = configuredCredentials(
    import.meta.env.VITE_DEMO_IT_STAFF_USERNAME,
    import.meta.env.VITE_DEMO_IT_STAFF_PASSWORD,
  ),
}: DemoAccessInstructionsProps) {
  return (
    <section className="demo-access" aria-labelledby="demo-access-heading">
      <h2 id="demo-access-heading">Live demo access</h2>
      <p>
        This is a shared portfolio demonstration environment. Choose the demo
        identity that matches the workflow you want to explore.
      </p>

      <div className="demo-role-grid">
        <section>
          <h3>Employee demo identity</h3>
          <p>Creates support tickets and views its own tickets and updates.</p>
          <DemoIdentityCredentials credentials={employeeCredentials} />
        </section>
        <section>
          <h3>IT Staff demo identity</h3>
          <p>
            Views queues, claims tickets, adds work notes, and resolves tickets.
          </p>
          <DemoIdentityCredentials credentials={itStaffCredentials} />
        </section>
      </div>

      <p>
        Sign out at the top of the page to return to these demo instructions.
      </p>
      <p className="demo-safety-notice">
        Do not enter real personal, confidential, or sensitive information.
      </p>
    </section>
  )
}
