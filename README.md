# UUAIS - Uppsala University AI Society

[![CI](https://github.com/uuaisociety/uuais/actions/workflows/ci.yml/badge.svg)](https://github.com/uuaisociety/uuais/actions/workflows/ci.yml)

This is a [Next.js](https://nextjs.org) project for the Uppsala University AI Society website, built with TypeScript, Tailwind CSS, and Firebase.

## How to Run Locally

### Prerequisites
- Node.js (version 20.9 or higher; `.nvmrc` pins Node 22 to match CI)
- npm, yarn, pnpm, or bun package manager

### Installation and Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/uuaisociety/uuais
   cd uuais
   ```

#### Setup Firebase (Database and Authentication)
(Based on https://www.scipress.io/post/OMsrfAaWdIgwNEF0P6za/Part-2---Firebase)

2. **Login and setup dev project**

   ```bash 
    npm install -g firebase-tools
    cd lib/
    firebase login # Use uuais account
    firebase use dev
    ```

3. **Create service account**
  - Go to https://console.firebase.google.com/u/2/project/uuais-dev/settings/general/web:OTg4MTQwOTYtNDI4NS00Zjk1LThkOWEtZTE2YmFkYmUwN2Yx
  - Go to Service Accounts
  - Click on "Create new private key"
  - **Save the file outside your project directory** (e.g., `~/.config/firebase/uuais-dev-service-account.json`). This prevents accidental commits to version control.

4. **Copy SDK setup and configuration**
  - Go to https://console.firebase.google.com/u/2/project/uuais-dev/settings/general/web:OTg4MTQwOTYtNDI4NS00Zjk1LThkOWEtZTE2YmFkYmUwN2Yx
  - Scroll down to uuais-dev web app
  - Copy over values from apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
  to .env file (see below).

5. **Environment Variables**
  - Create a .env file in the root of your project and add the Firebase config values from .env.example

  > **Security note:** The `.env` file and any Firebase service account JSON files are private. Never commit them to git. The `.gitignore` already excludes `.env` and `*firebase-adminsdk*.json`, but be careful not to rename or relocate them into tracked paths.

      ```bash
      NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
      NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
      NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

      # Path to service account key — use a location OUTSIDE the project directory
      # to avoid accidentally committing it. Example: ~/.config/firebase/...
      GOOGLE_APPLICATION_CREDENTIALS=/home/you/.config/firebase/uuais-dev-service-account.json
      ```

6. **Run the App in the development server**

   ```bash
   npm install
   ```
   ```bash
   npm run dev
   # or
   npx next dev --turbopack
   ```
   
Your app should now be running at [http://localhost:3000](http://localhost:3000)

The page will automatically reload when you make changes to the code.

7. **Set admin user**
  - Navigate to [http://localhost:3000/admin](http://localhost:3000/admin)
  - Sign in with Google
  - You will see that you are not authorized.
  - Install dev packages and set the email as an admin (replace <email> with your gmail):
   ```bash
   npm install -D @types/node @types/react @types/react-dom
   npm run set:admin -- <email> true
   ```

If updating firestore.rules, storage.rules or firestore.indexes.json, these need to be updated manually (development or prod)

```bash
cd lib/
firebase login # your uuais account
firebase use dev
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only firestore:indexes
```


### Available Scripts

- `npm run dev` - Runs the development server with Turbopack
- `npm run build` - Builds the application for production
- `npm run start` - Starts the production server
- `npm run lint` - Runs ESLint to check for code issues
- `npm test` - Runs Jest test suite (silent mode)
- `npm run test:watch` - Runs Jest in watch mode (auto-rerun on changes)
- `npm run test:coverage` - Runs Jest with coverage report
- `npm run test:integration` - Runs API route tests (Jest integration config)
- `npm run test:e2e` - Runs Playwright E2E smoke tests (starts dev server automatically)
- `npm run security` - Runs a Snyk dependency scan (requires `snyk auth`)
- `npm run set:admin -- <email> true` - Sets an admin user
- `npm run set:admin -- <email> false` - Removes an admin user

## Testing

The project uses **Jest** + **React Testing Library** for unit and integration tests, and **Playwright** for E2E smoke tests.

### Running Tests

```bash
npm test            # Run all unit tests (silent)
npm run test:watch  # Watch mode — re-runs on file changes
npm run test:coverage  # Run with coverage report
npm run test:integration  # API route tests (mocked Firebase)
npm run test:e2e    # Playwright E2E smoke tests (auto-starts dev server)
```

CI (`.github/workflows/ci.yml`) runs lint, type checking, and all three test suites on every push/PR.

### Writing Tests

Create test files in the `__tests__/` directory:

```tsx
import { render, screen } from '@testing-library/react'
import NotFound from '../app/not-found'

describe('NotFound', () => {
  it('renders the 404 heading', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404')
  })
})
```

### What's Pre-Configured

- **`next/jest` transformer** — handles JSX, TypeScript, CSS/font/image mocks, `.env` loading
- **Module aliases** — `@/` imports resolve correctly
- **Auto-mocked dependencies** — `next/navigation`, `next/image`, `@/contexts/AppContext`, `@/lib/firestore`, `@/utils/seo`
- **`@testing-library/jest-dom`** — custom matchers like `.toBeInTheDocument()`, `.toHaveTextContent()`

**Note:** `async` Server Components aren't supported by Jest. Test those with E2E tools (Playwright) later.

## Contributing Workflow

### Branch Naming Conventions

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/component-name` - Code refactoring

### Before Submitting a PR

- [ ] Run `npm test` to ensure existing tests pass
- [ ] Add or update tests for new/changed functionality
- [ ] Run `npm run lint` to check for code issues
- [ ] Ensure all new components are properly typed
- [ ] Update documentation if needed

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/docs/) - TypeScript documentation
- [Firebase](https://firebase.google.com/docs) - Firebase documentation
- [Radix UI](https://www.radix-ui.com/) - Accessible component library




## Local Firebase Setup (Emulators)

You can run the app fully against local Firebase emulators (Auth + Firestore) instead of the shared dev project. Emulator mode is **opt-in**: unless explicitly enabled, the app talks to the project configured in your `.env` as usual.

### 1. Start the emulators

```bash
npm run emulators
```

This starts Auth (port 9099), Firestore (port 8080), Storage (port 9199), and the Emulator UI at http://127.0.0.1:4000, using `lib/firebase.json`. The `demo-uuais` project id guarantees nothing touches real Firebase projects.

### 2. Point the app at the emulators

Add these to your `.env` (keep them commented out when you want to use the real dev project again):

```bash
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-uuais
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` connects the client SDK (Auth + Firestore) and redirects the Admin SDK in API routes to the emulators.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-uuais` must match the `--project` the emulators run under. Leave it pointing at the real project and Firestore reads come back empty (the emulator keeps data per project id) and sign-in fails at `/api/login` with `idToken has incorrect "iss" (issuer) claim` — the token is issued for `demo-uuais` and verified against the other project.
- The two host vars let the auth middleware and Admin SDK verify emulator-issued tokens server-side. They have to be in an env **file** (`.env` or `.env.local`) — the proxy/edge runtime does not see vars exported only in your shell.
- Then restart `npm run dev`.

### Notes

- The emulator suite requires Java (a JRE). Install e.g. `default-jre` or download from https://adoptium.net if `npm run emulators` fails with a Java error.
- The emulators start empty. Create test users via the Emulator UI (Authentication → Start adding users) or just sign up through the app's login page.
- Data is ephemeral by default: it disappears when you stop the emulators. To persist across restarts, start with `npx firebase emulators:start --config lib/firebase.json --project demo-uuais --import ./emulator-data --export-on-exit ./emulator-data`.
- Storage uploads via the Admin SDK still target the real bucket; only Auth and Firestore traffic is redirected.
