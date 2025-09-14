# UUAIS - Uppsala University AI Society
xD xD
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
│   ├── EventsSection.tsx         # Events display component
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

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/docs/) - TypeScript documentation
- [Firebase](https://firebase.google.com/docs) - Firebase documentation
- [Radix UI](https://www.radix-ui.com/) - Accessible component library
