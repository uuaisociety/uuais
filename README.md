# UUAIS - Uppsala University AI Society

This is a [Next.js](https://nextjs.org) project for the Uppsala University AI Society website, built with TypeScript, Tailwind CSS, and Firebase.

## How to Run Locally

### Prerequisites
- Node.js (version 18 or higher)
- npm, yarn, pnpm, or bun package manager

### Installation and Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd uuais
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

The page will automatically reload when you make changes to the code.

### Available Scripts

- `npm run dev` - Runs the development server with Turbopack
- `npm run build` - Builds the application for production
- `npm run start` - Starts the production server
- `npm run lint` - Runs ESLint to check for code issues

## Project Structure

```
uuais/
├── app/                          # Next.js App Router pages and layouts
│   ├── admin/                    # Admin dashboard pages
│   ├── api/                      # API routes
│   │   └── auth/                 # Authentication endpoints
│   ├── application/              # Application form page
│   ├── events/                   # Events listing page
│   ├── layout.tsx                # Root layout component
│   ├── page.tsx                  # Homepage
│   └── globals.css               # Global styles
├── components/                   # Reusable React components
│   ├── ui/                       # UI components (shadcn/ui)
│   ├── AboutSection.tsx          # About section component
│   ├── AdminEvents.tsx           # Admin events management
│   ├── FoundersSection.tsx       # Founders showcase component
│   ├── HeroSection.tsx           # Homepage hero section
│   └── Navbar.tsx                # Navigation component
├── hooks/                        # Custom React hooks
│   └── use-mobile.ts             # Mobile detection hook
├── lib/                          # Utility libraries and configurations
│   ├── firebase.ts               # Firebase configuration
│   └── utils.ts                  # Utility functions
├── public/                       # Static assets
│   └── images/                   # Image assets
├── instructions/                 # Project documentation
└── package.json                  # Project dependencies and scripts
```

### Key Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase** - Backend services and authentication
- **Radix UI** - Accessible UI components
- **shadcn/ui** - Pre-built UI component library

## Contributing Workflow

### Creating a New Branch and Pull Request

1. **Create and switch to a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/bug-description
   ```

2. **Make your changes:**
   - Edit the necessary files
   - Test your changes locally using `npm run dev`
   - Ensure your code follows the project's coding standards

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add descriptive commit message"
   ```

4. **Push your branch to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request:**
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Select your branch as the source and `main` as the target
   - Fill out the PR template with:
     - Clear description of changes
     - Screenshots (if applicable)
     - Testing steps
   - Request review from team members

6. **Wait for Review:**
   - Address any feedback from reviewers
   - Make additional commits if needed
   - Once approved, a maintainer will merge your PR

### Branch Naming Conventions

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/component-name` - Code refactoring

### Before Submitting a PR

- [ ] Test your changes locally
- [ ] Run `npm run lint` to check for code issues
- [ ] Ensure all new components are properly typed
- [ ] Update documentation if needed
- [ ] Add screenshots for UI changes

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/docs/) - TypeScript documentation
- [Firebase](https://firebase.google.com/docs) - Firebase documentation
- [Radix UI](https://www.radix-ui.com/) - Accessible component library

## Admin Authentication and Developer Override

All admin authentication is centralized in `app/admin/page.tsx` via `components/auth/AdminGate.tsx` and the `hooks/useAdmin.ts` hook.

- **Google Sign-In (Production)**
  - `AdminGate` prompts for Google sign-in using Firebase Auth and checks for the `admin` custom claim on the user.
  - If the user has the claim, the `AdminDashboard` is rendered.

- **Dev Admin Override (Local Development Only)**
  - Controlled by environment flags and intended for local development when Google sign-in is not configured.
  - Add to your `.env.local`:

    ```env
    NEXT_PUBLIC_ENABLE_DEV_ADMIN=true
    NEXT_PUBLIC_DEV_ADMIN_PASSWORD=change-this-strong-password
    ```

  - The Admin page will show a small "Dev Admin Override" section with a password field. Enter the password to elevate. A top-right amber badge "Dev Admin Override Active" appears when enabled.
  - Clear the override using the "Clear" button or by removing `devAdmin` from localStorage.

## Environment Variables

Create a `.env.local` file at the project root with at least the following keys (see `.env.example` for the full list):

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json


# Dev admin override (local only)
NEXT_PUBLIC_ENABLE_DEV_ADMIN=false
NEXT_PUBLIC_DEV_ADMIN_PASSWORD=

```

Restart the dev server after changing any `NEXT_PUBLIC_` variables.

### Adding a new admin
Before adding a new admin please make sure that the user is already in the Firebase Auth database (has tried to login to the admin page). You also need to download the service account key from the Firebase console and place it in the root of the project and add the path to your .env file.
You may need to install `ts-node` and `dotenv` if you haven't already.
```bash
npm i -D dotenv ts-node typescript @types/node
```

To add a new admin, run the following command:

```bash
npm run set:admin -- <email> true
```

To remove an admin, run the following command:

```bash
npm run set:admin -- <email> false
```


## Local Firebase Setup (Emulators)

You can run against Firebase emulators during development.

1. Install the Firebase CLI (if not already):

   ```bash
   npm install -g firebase-tools
   ```

2. Log in and initialize (if needed):

   ```bash
   firebase login
   firebase init emulators
   ```

3. Review `firebase.json` (ports can be adjusted as needed):

   ```json
   {
     "emulators": {
       "auth": { "port": 9099 },
       "database": { "port": 9000 },
       "ui": { "enabled": true },
       "singleProjectMode": true
     }
   }
   ```

4. Start the emulators:

   ```bash
   firebase emulators:start
   ```

5. Point your app to the emulators in `lib/firebase.ts` if desired (or rely on production services):
   - Example (pseudo):

     ```ts
     // import { connectAuthEmulator } from 'firebase/auth';
     // import { connectFirestoreEmulator } from 'firebase/firestore';
     // if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
     //   connectAuthEmulator(auth, 'http://localhost:9099');
     //   connectFirestoreEmulator(db, 'localhost', 8080);
     // }
     ```