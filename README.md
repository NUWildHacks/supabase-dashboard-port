# WildHacks Dashboard 2026

The WildHacks Dashboard is the comprehensive management system for WildHacks 2026. It provides participants, administrators, and organizers with a platform to make the most of their hackathon experience, including project collaboration, event scheduling, user management, and more.

**Live Site**: https://dashboard.wildhacks.net

## 🚀 Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router and Server Actions
- **React 19** - UI library
- **TypeScript 5** - Type-safe JavaScript with strict mode
- **TailwindCSS 4** - Utility-first CSS framework
- **ShadCN UI** - Component library built on Radix UI primitives

### Backend & Database

- **Supabase Auth** - Google and GitHub sign-in with cookie sessions (`@supabase/ssr`)
- **Supabase Postgres** - Relational database with row level security (schema in `supabase/migrations/`)
- **Supabase Storage** - Resume file storage
- **Supabase Realtime** - Live updates for the schedule and team matching release
- **Vercel** - Deployment and hosting platform

### Validation & Forms

- **Zod 4** - Schema validation and type inference
- **React Hook Form** - Performant form state management
- **@hookform/resolvers** - Zod integration for React Hook Form
- **validator** - Additional validation utilities

### UI & Utilities

- **Radix UI** - Accessible component primitives
- **@tanstack/react-table** - Powerful table and data grid component
- **lucide-react** - Icon library
- **recharts** - Chart and data visualization library
- **next-themes** - Theme management (light/dark mode)
- **date-fns** - Date manipulation and formatting
- **react-day-picker** - Date picker component
- **sonner** - Toast notification system
- **cmdk** - Command menu component
- **react-qr-code** - QR code generation component
- **class-variance-authority** - Component variant management
- **clsx** - Utility for constructing className strings conditionally
- **tailwind-merge** - Merge Tailwind CSS classes without conflicts
- **json-2-csv** - Convert JSON data to CSV format

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **pnpm**: Version 10.12.1 (specified in `package.json`)
- **Docker**: For the local Supabase stack (the Supabase CLI is installed as a dev dependency)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/NUWildHacks/dashboard-2026.git
   cd dashboard-2026
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the local Supabase stack (applies `supabase/migrations/` and `supabase/seed.sql`):

   ```bash
   pnpm exec supabase start
   pnpm exec supabase db reset   # re-run migrations and seed at any time
   ```

   For Google/GitHub sign-in locally, export `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`,
   `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID`, and
   `SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET` before `supabase start`. The OAuth apps must allow the
   callback `http://127.0.0.1:54321/auth/v1/callback`.

4. Set up environment variables:

   Create a `.env.local` file in the root directory (see `.env.example`). `pnpm exec supabase status` prints the local values:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   SUPABASE_SECRET_KEY=your_secret_key

   # Application Environment
   APP_ENV=development
   ```

   **Note**: Contact the project maintainers for access to the hosted Supabase project.

   For a hosted project, enable the Google and GitHub providers under Authentication → Providers, and add
   `https://<your-domain>/auth/callback` to Authentication → URL Configuration → Redirect URLs.

5. Start the development server:

   ```bash
   pnpm run dev
   ```

   The application will be available at `http://localhost:3000`.

### Available Scripts

- `pnpm run dev` - Start the development server
- `pnpm run build` - Build the application for production
- `pnpm run start` - Start the production server
- `pnpm run lint` - Run ESLint to check for code issues
- `pnpm run lint:fix` - Automatically fix ESLint issues
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check if code is formatted correctly
- `pnpm run clean` - Remove build artifacts and cache

For detailed setup instructions, code style guidelines, and contribution workflow, see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📋 Project Structure

```
dashboard-2026/
├── app/                    # Next.js App Router directory
│   ├── _components/        # Root-level shared components
│   ├── dashboard/          # Dashboard routes and features
│   ├── login/             # Login page
│   ├── registration/      # Registration page
│   └── page.tsx           # Root landing page
├── components/            # Shared React components
│   ├── form/              # Form-specific components
│   └── ui/                # ShadCN UI components
├── config/                # Supabase clients (browser, server, admin)
├── constants/             # Application-wide constants
├── hooks/                 # Shared React hooks
├── lib/                   # Utility functions and libraries
├── types/                 # Shared TypeScript type definitions
├── data/                  # Static data files (JSON)
└── supabase/              # Supabase config, SQL migrations, and seed data
```

For detailed information about the project structure and development guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## 🔮 Future Developments

The following features are planned for future implementation:

### Support Page Enhancements

- **FAQ Section**: Answers to commonly asked questions (WiFi connections, logistics, etc.)
- **Issue Reporting**: Interface for users to report issues or bugs
- **Contact Information**: Direct contact information for support requests

### Project Features

- **Team Matching**: Allow users to search through and matching with teams of interest
- **Project Submission**: Allow users to submit their final project versions
- **Project Gallery**: Display all submitted projects after the event concludes

### Judge & Mentors

- **Assignments**: Allow judges and mentors to see their assigned projects and locations

## 🤝 Contributing

We welcome contributions to the WildHacks Dashboard! Please read our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- Project structure and organization
- Code style and conventions
- Development workflow and best practices
- Git workflow and commit message format
- Server actions and database operations
- Component and hook development patterns
- Validation utilities and security best practices

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-username/feature-name`
3. Make your changes following our coding standards
4. Run quality checks: `pnpm run lint && pnpm run format:check && pnpm run build`
5. Commit your changes with conventional commit messages
6. Push to your branch and create a Pull Request

## 📝 License

This project is proprietary and maintained by NU WildHacks. All rights reserved.

## 🙏 Acknowledgments

Built with ❤️ for the WildHacks 2026 hackathon community.
