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

### Setup Firebase (Database and Authentication)
1. **Create a Firebase Project**

  - Go to the Firebase Console.
  - Click Add Project (or select an existing one).
  - Navigate to Project Overview → Project Settings → General.
  - Scroll down to Your apps → Web and create a new web app.
  - Copy the provided API keys and config values into your .env file (see Environment Setup).

2. **Generate Service Account Credentials**

  - In Project Settings, open the Service Accounts tab.
  - Click Generate new private key and save the downloaded file.
  - Place this file securely in your repo (or locally, outside version control if preferred).
  - Add an environment variable pointing to it.
```bash
GOOGLE_APPLICATION_CREDENTIALS=./path/to/serviceAccountKey.json
```
3. **Enable Authentication**

  - In the Firebase Console, go to Build → Authentication.
  - Click Get Started.
  - Add and enable Google as a sign-in method.

4. **Environment Variables**
  - Create a .env file in the root of your project and add the Firebase config values from .env.example
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

GOOGLE_APPLICATION_CREDENTIALS=./path/to/serviceAccountKey.json
```

5. **Run the App**
```bash
npm install
npm run dev
```
Your app should now be running at [http://localhost:3000](http://localhost:3000)

6. **Set admin user**
  - Navigate to [http://localhost:3000/admin](http://localhost:3000/admin)
  - Sign in with Google
  - You will see that you are not authorized.
  - Install dev packages and set the email as an admin (replace <email> with your gmail):
```bash
npm install -D @types/node @types/react @types/react-dom @types/jest
npm run set:admin -- <email> true
```


### Available Scripts

- `npm run dev` - Runs the development server with Turbopack
- `npm run build` - Builds the application for production
- `npm run start` - Starts the production server
- `npm run lint` - Runs ESLint to check for code issues
- `npm run set:admin -- <email> true` - Sets an admin user
- `npm run set:admin -- <email> false` - Removes an admin user

## Contributing Workflow

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

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/docs/) - TypeScript documentation
- [Firebase](https://firebase.google.com/docs) - Firebase documentation
- [Radix UI](https://www.radix-ui.com/) - Accessible component library




## Local Firebase Setup (Emulators)
BEWARE THIS IS NOT TESTED!

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