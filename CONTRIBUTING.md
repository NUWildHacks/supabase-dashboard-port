# Contributing to WildHacks Dashboard 2026

Thank you for your interest in contributing to the WildHacks Dashboard! This guide will help you understand our project structure, coding conventions, and development workflow.

**Before you begin**: Please read the [README.md](README.md) for an overview of the project, its features, and setup instructions.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Code Style and Conventions](#code-style-and-conventions)
4. [File Organization Patterns](#file-organization-patterns)
5. [Component Development](#component-development)
6. [Hooks Development](#hooks-development)
7. [Server Actions](#server-actions)
8. [Type Definitions](#type-definitions)
9. [Constants and Schemas](#constants-and-schemas)
10. [Git Workflow](#git-workflow)
11. [Testing and Quality](#testing-and-quality)
12. [Common Patterns and Examples](#common-patterns-and-examples)
13. [Additional Resources](#additional-resources)

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **pnpm**: Version 10.12.1 (specified in `package.json`)
- **Git**: For version control

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd dashboard-2026
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   Copy `.env.example` to create a `.env.local` file in the root directory with the following variables:

   ```env
   # Supabase (`pnpm exec supabase status` prints the local values)
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   SUPABASE_SECRET_KEY=your_secret_key

   # Application Environment
   APP_ENV=development
   ```

   **Note**: Contact the project maintainers for access to the hosted Supabase project. Never commit `.env.local` to version control. `SUPABASE_SECRET_KEY` bypasses row level security: use it only in server code.

### Supabase Setup

1. Start the local Supabase stack (requires Docker). This applies every file in `supabase/migrations/` and then `supabase/seed.sql`:

   ```bash
   pnpm exec supabase start
   ```

2. Reset the local database after you change a migration:

   ```bash
   pnpm exec supabase db reset
   ```

3. Make schema changes as new migration files, never by editing an applied migration:

   ```bash
   pnpm exec supabase migration new <short_name>
   ```

   CI applies new migrations with `supabase db push` (development on feature branches, production on `main`).

4. Stop the stack when you are done:

   ```bash
   pnpm exec supabase stop
   ```

### Development Server

Start the development server:

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

## Project Structure

### Root-Level Folders

```
dashboard-2026/
├── app/                    # Next.js App Router directory
├── components/             # Shared React components
│   ├── form/              # Form-specific components
│   ├── ui/                # ShadCN UI components (do not edit directly)
├── config/                # Supabase clients (browser, server, admin)
├── constants/            # Application-wide constants
│   └── index.ts          # Barrel export for all constants
├── hooks/                # Shared React hooks
│   └── index.ts          # Barrel export for all hooks
├── lib/                  # Utility functions and libraries
│   └── index.ts          # Barrel export for all lib functions
├── types/                # Shared TypeScript type definitions
│   └── index.ts          # Barrel export for all types
└── data/                 # Static data files (JSON)
```

### App Directory Structure

The `app/` directory follows Next.js App Router conventions with feature-based organization:

```
app/
├── _components/          # Root-level components (Navbar, Footer, etc.)
├── dashboard/           # Dashboard route segment
│   ├── _components/     # Dashboard-specific components
│   ├── _hooks/          # Dashboard-specific hooks
│   ├── constants.ts     # Dashboard-specific constants
│   ├── lib.ts           # Dashboard-specific utilities
│   ├── types.ts         # Dashboard-specific types
│   ├── schedule/        # Schedule feature
│   │   ├── _actions/
│   │   ├── _components/
│   │   ├── _hooks/
│   │   ├── _lib/        # All library files (calendar utilities, table columns, etc.)
│   │   ├── _schemas/
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── manage-users/    # Manage users feature
│   │   ├── _actions/
│   │   ├── _components/
│   │   ├── _hooks/
│   │   ├── _lib/        # Table column definitions and complex utilities
│   │   ├── _schemas/
│   │   ├── types.ts
│   │   ├── page.tsx
│   │   └── loading.tsx
│   └── ...
├── login/               # Login route
├── registration/        # Registration route
└── ...
```

### Feature Organization Pattern

Each feature (route segment) follows this structure:

- `_actions/` - Server actions for database operations (if applicable)
- `_components/` - React components specific to this feature
- `_hooks/` - Custom React hooks for this feature
- `_lib/` - Feature-specific library files (table columns, complex utilities, etc.) (optional)
- `_schemas/` - Zod validation schemas (if applicable)
- `constants.ts` - Constants specific to this feature (optional)
- `lib.ts` or `lib.tsx` - Simple utility functions for this feature (optional, use `_lib/` if you have multiple library files)
- `types.ts` - TypeScript type definitions for this feature (optional)
- `page.tsx` - Next.js page component
- `loading.tsx` - Loading UI (optional)
- `error.tsx` - Error UI (optional)

**Note**:

- Folders prefixed with `_` are private and not part of the URL routing
- `constants.ts`, `types.ts`, and `lib.ts` are single files (not folders) and are optional
- Use `lib.tsx` instead of `lib.ts` if the file contains JSX/TSX code
- Use `_lib/` folder when you have multiple library files (e.g., table column definitions, calendar utilities, multiple related functions)
- You can use `_lib/` exclusively for all library files in a feature, even if you don't have a top-level `lib.ts` or `lib.tsx`
- Use top-level `lib.ts` or `lib.tsx` for simple, single-file utility functions when you only have one or two utility functions

### Dashboard-Level Organization

The `dashboard/` route segment also has its own shared resources:

- `_components/` - Components shared across dashboard features
- `_hooks/` - Hooks shared across dashboard features
- `constants.ts` - Constants shared across dashboard features
- `lib.ts` - Utilities shared across dashboard features
- `types.ts` - Types shared across dashboard features

## Code Style and Conventions

### TypeScript Standards

- **Strict Mode**: TypeScript strict mode is enabled
- **Type Safety**: Always provide explicit types; avoid `any` (warns in ESLint)
- **Unused Variables**: Prefix unused variables with `_` (e.g., `_unusedParam`)

### Import Organization

Imports are automatically sorted by ESLint's `perfectionist/sort-imports` rule:

1. **Built-in modules** (Node.js, e.g., `fs`, `path`)
2. **External packages** (npm packages, e.g., `react`, `next`)
3. **Internal imports** (using `@/` alias)
4. **Parent imports** (`../`)
5. **Sibling imports** (`./`)
6. **Index imports** (barrel imports)

Within each group, imports are sorted alphabetically. Type imports should use `import type` syntax.

**Example:**

```typescript
import { Loader2 } from "lucide-react";
import { Controller } from "react-hook-form";

import { useMyFeatureForm } from "@/app/dashboard/my-feature/_hooks";
import type { MyFeature } from "@/app/dashboard/my-feature/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
```

**Type-only imports:**

```typescript
import type { NextConfig } from "next";

import type { MyFeature } from "@/app/dashboard/my-feature/types";
import type { User } from "@/types";
```

### Naming Conventions

#### Files

- **Components**: `kebab-case.tsx` (e.g., `edit-feature-form.tsx`)
- **Hooks**: `use-kebab-case.ts` (e.g., `use-edit-feature-form.ts`)
- **Types**: `types.ts` (single file per feature, e.g., `app/dashboard/my-feature/types.ts`)
- **Constants**: `constants.ts` (single file per feature, e.g., `app/dashboard/my-feature/constants.ts`)
- **Schemas**: `kebab-case.schemas.ts` (e.g., `create-feature-form.schemas.ts`)
- **Utilities**: `lib.ts` or `lib.tsx` (single file per feature, e.g., `app/dashboard/my-feature/lib.ts`)

#### Code

- **Components**: `PascalCase` (e.g., `EditFeatureForm`)
- **Hooks**: `camelCase` with `use` prefix (e.g., `useEditFeatureForm`)
- **Types**: `PascalCase` (e.g., `MyFeature`, `UseEditFeatureFormReturn`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MY_FEATURE_FIELDS`)
- **Functions**: `camelCase` (e.g., `getFeatureDocSnapshot`)
- **Variables**: `camelCase` (e.g., `featureId`)

### Prettier Configuration

The project uses Prettier with the following settings (configured in `.prettierrc` or `package.json`):

- **Print Width**: 120 characters
- **Tab Width**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Double quotes
- **Trailing Commas**: ES5 style
- **Arrow Parens**: Always (e.g., `(x) => x`)

Always run `pnpm run format` before committing to ensure consistent formatting.

### ESLint Rules

Key ESLint rules enforced:

- **Import Sorting**: Alphabetical with grouping (enforced by `perfectionist`)
- **React Hooks**: Must follow rules of hooks
- **TypeScript**: Strict type checking
- **Accessibility**: JSX a11y rules enabled

The project uses ESLint's flat config format (newer configuration style).

Always run `pnpm run format && pnpm run lint:fix` before committing.

## File Organization Patterns

### Barrel Imports

**All feature folders must use barrel imports** via `index.ts` files. This provides:

- Cleaner import statements
- Better code organization
- Easier refactoring

#### Barrel Import Structure

Each feature folder should have an `index.ts` that exports all public APIs:

**Example: `app/dashboard/my-feature/_hooks/index.ts`**

```typescript
export { useMyFeatureDialog } from "./use-my-feature-dialog";
export { useEditFeatureForm } from "./use-edit-feature-form";
export { useCreateFeatureDialog } from "./use-create-feature-dialog";
export { useDeleteFeatureDialog } from "./use-delete-feature-dialog";
export { useFeatureList } from "./use-feature-list";
export type { UseMyFeatureDialogReturn } from "./use-my-feature-dialog";
export type { UseEditFeatureFormReturn } from "./use-edit-feature-form";
// ... more type exports
```

#### When to Use Barrel Imports

✅ **Use barrel imports for:**

- Feature-level folders (`_components`, `_hooks`, `_schemas`, `_actions`, `_lib`)
- Root-level shared folders (`components`, `hooks`, `lib`, `types`, `constants`)

❌ **Do NOT use barrel imports for:**

- `components/ui/` - ShadCN UI components (import directly)
- Single files (`constants.ts`, `types.ts`, `lib.ts`) - import directly
- `page.tsx`, `loading.tsx`, `error.tsx` - import directly

#### Import Examples

✅ **Good:**

```typescript
import { useEditFeatureForm } from "@/app/dashboard/my-feature/_hooks";
import type { MyFeature } from "@/app/dashboard/my-feature/types";
import { MY_FEATURE_FIELDS } from "@/app/dashboard/my-feature/constants";
import { getFeature } from "@/app/dashboard/my-feature/lib";
```

❌ **Bad:**

```typescript
import { useEditFeatureForm } from "@/app/dashboard/my-feature/_hooks/use-edit-feature-form";
import type { MyFeature } from "@/app/dashboard/my-feature/_types/my-feature.types";
import { MY_FEATURE_FIELDS } from "@/app/dashboard/my-feature/_constants/my-feature.constants";
```

### Component Organization

Components within a feature are organized by purpose:

```
_components/
├── _dialogs/             # Grouped related components
│   ├── create-feature-dialog.tsx
│   ├── edit-feature-dialog.tsx
│   └── delete-feature-dialog.tsx
├── _lists/               # Another group
│   ├── feature-item.tsx
│   └── feature-list.tsx
├── edit-feature-form.tsx # Standalone component
└── index.ts              # Barrel export
```

## Component Development

### Server Components vs Client Components

**Server Components** (default in Next.js App Router):

- No `"use client"` directive
- Can directly access server resources (databases, APIs)
- Cannot use React hooks or browser APIs
- Better performance (rendered on server)

**Client Components**:

- Must include `"use client"` directive at the top
- Can use React hooks (`useState`, `useEffect`, etc.)
- Can access browser APIs
- Required for interactivity

### Component Structure

**Example Server Component:**

```typescript
import { redirect } from "next/navigation";

import { verifySession } from "@/lib";
import { DASHBOARD_PATH, LOGIN_PATH } from "@/constants";

const MyPage = async () => {
  const userId = await verifySession();
  if (!userId) redirect(LOGIN_PATH);

  return <div>Content</div>;
};

export default MyPage;
```

**Example Client Component:**

```typescript
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const MyComponent = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </div>
  );
};

export default MyComponent;
```

### Props Typing

Always define explicit prop types:

```typescript
type EditFeatureFormProps = {
  feature: MyFeature;
  userId: User["id"];
  onSuccess?: () => void;
};

const EditFeatureForm = ({ feature, userId, onSuccess }: EditFeatureFormProps) => {
  // Component implementation
};
```

### ShadCN UI Components

The project uses [ShadCN UI](https://ui.shadcn.com) components. These are located in `components/ui/` and should be imported directly:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

**Important**: Do not modify files in `components/ui/` directly. If you need to customize a component, create a wrapper component.

## Hooks Development

### Hook Patterns

Custom hooks should:

1. Start with `use` prefix
2. Be exported as named exports
3. Export their return type
4. Include `"use client"` directive if they use React hooks

**Example:**

```typescript
"use client";

import { useState, useEffect } from "react";

export type UseMyHookReturn = {
  data: string | null;
  isLoading: boolean;
  error: Error | null;
};

export const useMyHook = (param: string): UseMyHookReturn => {
  const [data, setData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Hook implementation
  }, [param]);

  return { data, isLoading, error };
};
```

### Hook Barrel Exports

Always export hooks and their types from the `_hooks/index.ts` file:

```typescript
export { useMyHook } from "./use-my-hook";
export type { UseMyHookReturn } from "./use-my-hook";
```

## Server Actions

### Overview

Server actions are Next.js functions that run on the server and handle database operations securely using the Supabase admin client (`@/config/supabase-admin`). They provide a secure way to perform write operations that bypass row level security (RLS).

### When to Use Server Actions

✅ **Use server actions for:**

- All database write operations (create, update, delete)
- Operations that require admin (secret key) privileges
- Form submissions that have server-side logic
- Operations that should bypass row level security

❌ **Do NOT use server actions for:**

- Read-only operations that need real-time updates (use a Supabase Realtime channel with the browser client)
- Operations that don't require database access
- Client-side only operations

### Hybrid Approach: React Hook Form + Server Actions

The project uses a **hybrid approach** for forms:

1. **React Hook Form** handles client-side validation and form state
2. **Server Actions** handle database operations using the Supabase admin client
3. **Toast notifications** display server-side errors

This provides:

- Better UX with real-time client-side validation
- Security with server-side database operations
- Clear error handling with field-specific and general errors

### File Organization

Server actions are located in `_actions` folders within feature directories:

```
app/dashboard/my-feature/
├── _actions/
│   ├── create-feature.actions.ts
│   ├── edit-feature.actions.ts
│   ├── delete-feature.actions.ts
│   └── index.ts
```

**Naming Convention**: `kebab-case.actions.ts` (e.g., `create-feature.actions.ts`)

### Server Action Structure

**Basic Template:**

```typescript
"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { LOGIN_PATH, DASHBOARD_PATH, MY_TABLE } from "@/constants";
import { getAuthenticatedUser } from "@/lib";
import type { ActionResult } from "@/types";

import { type MyFormSchema } from "../_schemas/my-form.schemas";

export type MyActionResult = ActionResult<MyFormSchema>;

export const myAction = async (data: MyFormSchema): Promise<MyActionResult> => {
  const now = Date.now();

  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    // User is guaranteed to be authenticated and exist in database at this point

    // Perform database operations; always check the returned error
    const { error } = await supabaseAdmin
      .from(MY_TABLE)
      .update({ ...data, updated_at: now })
      .eq("id", user.id);
    if (error) throw error;

    // Revalidate the path to refresh server components
    revalidatePath(DASHBOARD_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("My action error:", detailedError);

    // In production, return a generic error message to avoid exposing sensitive details
    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return {
      success: false,
      error: errorMessage,
    };
  }
};
```

### Using ActionResult Type

The project uses a generic `ActionResult<T>` type for consistent error handling:

```typescript
import type { ActionResult } from "@/types";

// For forms with field validation
export type MyFormResult = ActionResult<MyFormSchema>;

// For non-form operations (no field property)
export type MyActionResult = ActionResult;
```

**Result Structure:**

- **Success**: `{ success: true }`
- **Error with field**: `{ success: false; error: string; field?: keyof FormSchema }`
- **Error without field**: `{ success: false; error: string }`

### Error Handling Patterns

**In Server Actions:**

```typescript
// Field-specific error (for form validation)
if (!isValid) {
  return {
    success: false,
    error: "Invalid input",
    field: "fieldName", // Only available when ActionResult<FormSchema>
  };
}

// General error
if (!exists) {
  return {
    success: false,
    error: "Resource not found",
  };
}

// Catch block error handling (see Server Action Structure template for full example)
// Always sanitize error messages in production:
const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
console.error("Action error:", detailedError);

const isProduction = process.env.APP_ENV === "production";
const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

return { success: false, error: errorMessage };
```

**In Hooks (Client-Side):**

```typescript
import { toast } from "sonner";

const onSubmit = async (data: FormSchema) => {
  try {
    const result = await myAction(data);
    const { success } = result;

    if (!success) {
      const { field, error } = result;

      if (field) {
        // Field-specific error - set on form field
        setError(field, {
          type: "server",
          message: error,
        });
      } else {
        // General error - show toast
        toast.error("Operation failed", { description: error });
      }
      return;
    }

    // Success - server action handles revalidation via revalidatePath
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    toast.error("Operation failed", { description: errorMessage });
  }
};
```

### Authentication and Authorization

**Always use `getAuthenticatedUser` in server actions:**

The `getAuthenticatedUser` function handles session verification, user document retrieval, and redirects automatically:

```typescript
import { getAuthenticatedUser, requireRole } from "@/lib";
import { LOGIN_PATH, DASHBOARD_PATH, PARTICIPANT } from "@/constants";

export const myAction = async (data: MyFormSchema): Promise<MyActionResult> => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
  const user = await getAuthenticatedUser(redirectPath);

  // User is guaranteed to be authenticated and exist in database at this point
  // ...
};
```

**Check user roles:**

Use `requireRole` to validate user permissions:

```typescript
import { getAuthenticatedUser, requireRole } from "@/lib";
import { PARTICIPANT } from "@/constants";

export const myAction = async (data: MyFormSchema): Promise<MyActionResult> => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
  const user = await getAuthenticatedUser(redirectPath);

  const roleError = requireRole(user, PARTICIPANT, "You are not authorized to perform this action");
  if (roleError) return roleError;

  // User has required role, proceed with action
  // ...
};
```

**Check ownership or custom permissions:**

```typescript
const user = await getAuthenticatedUser(redirectPath);

// Check ownership
if (userId !== ownerId) {
  return { success: false, error: "Permission denied" };
}

// Custom permission checks
if (!hasPermission) {
  return { success: false, error: "You don't have permission to perform this action" };
}
```

### Integration with React Hook Form

**Hook Pattern:**

```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { myAction } from "../_actions/my-action.actions";
import { myFormSchema, type MyFormSchema } from "../_schemas/my-form.schemas";

export type UseMyFormReturn = {
  onSubmit: SubmitHandler<MyFormSchema>;
  isSubmitting: boolean;
} & Pick<UseFormReturn<MyFormSchema>, "control" | "handleSubmit">;

export const useMyForm = (): UseMyFormReturn => {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<MyFormSchema>({
    resolver: zodResolver(myFormSchema),
    defaultValues: {
      // ...
    },
  });

  const onSubmit: SubmitHandler<MyFormSchema> = async (data) => {
    try {
      const result = await myAction(data);
      const { success } = result;

      if (!success) {
        const { field, error } = result;

        if (!field) {
          throw new Error(error);
        }

        setError(field, {
          type: "server",
          message: error,
        });
        return;
      }

      // Success - server action handles revalidation via revalidatePath
      // Use router.replace() or router.push() only if you need to navigate to a different route
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Action error:", errorMessage);

      toast.error("Operation failed", { description: errorMessage });
    }
  };

  return { control, handleSubmit, onSubmit, isSubmitting };
};
```

**Key points:**

- **Field-specific errors**: If `field` exists in the result, use `setError` and return early
- **General errors**: If `field` doesn't exist, throw an error which gets caught and displayed as a toast
- **Revalidation**: Server actions should use `revalidatePath()` from `next/cache` to invalidate the cache for the affected route.
- **Navigation**: Use `router.replace()` or `router.push()` only if you need to navigate to a different route
- **Error logging**: Always log errors to console for debugging

### Best Practices

1. **Always use Admin SDK** in server actions (never client SDK)
2. **Verify session** at the start of every server action
3. **Return structured errors** using `ActionResult` type
4. **Handle redirects** for unauthenticated users
5. **Use try-catch** for error handling
6. **Log errors** to console for debugging with descriptive context (e.g., `console.error("Edit feature error:", detailedError)`)
7. **Sanitize error messages in production**: Always check `process.env.APP_ENV === "production"` and return generic error messages to users in production while logging detailed errors for debugging. This prevents exposing sensitive information.
8. **Validate permissions** before performing operations
9. **Use timestamps** (`Date.now()`) for `created_at` and `updated_at`
10. **Keep actions focused** - one action per operation
11. **Export result types** for type safety
12. **Revalidate paths** after successful database operations using `revalidatePath()` from `next/cache` to ensure server components reflect the latest data

## Type Definitions

### Type vs Interface

Prefer `type` over `interface` for consistency:

```typescript
// Good
export type MyFeature = BaseModel & {
  name: string;
  description: string;
};

// Also acceptable, but prefer type
export interface MyFeature extends BaseModel {
  name: string;
  description: string;
}
```

### Export Patterns

**Always use named exports** for types:

```typescript
// Good
export type { MyFeature, FeatureItem } from "./types";

// Bad
export type { default as MyFeature } from "./types";
```

### Type Organization

Types should be organized in a single `types.ts` file per feature:

```
app/dashboard/my-feature/
├── types.ts
└── ...
```

**Example type file:**

```typescript
import type { BaseModel, User } from "@/types";

export type MyFeature = BaseModel & {
  name: string;
  description: string;
  owner_id: User["id"];
};

export type FeatureItem = BaseModel & {
  user_id: User["id"];
  feature_id: MyFeature["id"];
  role: "owner" | "member";
};
```

**Importing types:**

```typescript
import type { MyFeature } from "@/app/dashboard/my-feature/types";
```

## Constants and Schemas

### Constants Organization

Constants are organized in a single `constants.ts` file per feature:

```typescript
import type { MyFeature } from "./types";

export const MY_FEATURE_FIELDS = {
  name: "name",
  description: "description",
  // ...
} as const satisfies Record<keyof Omit<MyFeature, "id">, string>;
```

**Naming**: Use `UPPER_SNAKE_CASE` for constants.

**Importing constants:**

```typescript
import { MY_FEATURE_FIELDS } from "@/app/dashboard/my-feature/constants";
```

### Zod Schemas

Validation schemas use Zod and are located in `_schemas` folders:

```typescript
import { z } from "zod";

import { githubUsernameSchema, plainTextMultiLineSchema, plainTextSingleLineSchema, secureUrlSchema } from "@/lib";

export const sampleFormSchema = z.object({
  single_line: plainTextSingleLineSchema.min(1, "Single line field is required"),
  multi_line: plainTextMultiLineSchema.min(1, "Multi line field is required"),
  url: secureUrlSchema.optional().or(z.literal("")),
  github_username: githubUsernameSchema.optional(),
});

export type SampleFormSchema = z.infer<typeof sampleFormSchema>;
```

**Pattern**: Export both the schema and the inferred type.

### Validation Utilities

The project provides reusable validation schemas in `lib/validation.lib.ts` for common security and validation needs:

- **`secureUrlSchema`**: Validates URLs and only allows `http://` and `https://` protocols. Prevents XSS attacks from dangerous protocols like `javascript:`, `data:`, `file:`, etc.

  ```typescript
  import { secureUrlSchema } from "@/lib";

  const schema = z.object({
    url: secureUrlSchema,
  });
  ```

- **`plainTextSingleLineSchema`**: Validates plain text for single-line fields (no newlines). Rejects HTML tags and control characters. Use for names, titles, and other single-line text fields.

  ```typescript
  import { plainTextSingleLineSchema } from "@/lib";

  const schema = z.object({
    title: plainTextSingleLineSchema.min(1, "Title is required"),
  });
  ```

- **`plainTextMultiLineSchema`**: Validates plain text for multi-line fields (allows newlines). Rejects HTML tags and control characters. Use for descriptions, bodies, and other multi-line content.

  ```typescript
  import { plainTextMultiLineSchema } from "@/lib";

  const schema = z.object({
    description: plainTextMultiLineSchema.min(1, "Description is required"),
  });
  ```

- **`githubUsernameSchema`**: Validates GitHub usernames according to GitHub's rules:
  - Alphanumeric characters (a-z, 0-9) and hyphens (-)
  - 1-39 characters in length
  - Cannot begin or end with a hyphen
  - Cannot have consecutive hyphens

  ```typescript
  import { githubUsernameSchema } from "@/lib";

  const schema = z.object({
    github_username: githubUsernameSchema,
  });
  ```

**Security Note**: Always use these validation utilities for user input to prevent XSS attacks and ensure data integrity. Prefer `secureUrlSchema` over `z.url()` for URL validation, and use `plainTextSingleLineSchema` or `plainTextMultiLineSchema` instead of plain `z.string()` for text fields.

**Barrel exports**: Schemas should be exported from `_schemas/index.ts`:

```typescript
export { createFeatureFormSchema } from "./create-feature-form.schemas";
export type { CreateFeatureFormSchema } from "./create-feature-form.schemas";
```

## Git Workflow

### Branch Naming

Use descriptive branch names with your Github username:

- `feature/<github-username>/add-user-profile` - New features
- `fix/<github-username>/login-redirect-issue` - Bug fixes
- `refactor/<github-username>/improve-schedule-hooks` - Refactoring
- `docs/<github-username>/update-contributing-guide` - Documentation

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(schedule): add event creation dialog

fix(auth): resolve session expiration issue

docs: update contributing guide with barrel import examples
```

### Pull Request Process

1. **Create a branch** from `main`:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-username/feature-name
   ```

2. **Make your changes** following this guide and coding standards

3. **Run quality checks** before committing:

   ```bash
   pnpm run format        # Format code
   pnpm run lint:fix      # Fix linting issues
   pnpm run lint          # Verify no remaining issues
   pnpm run format:check  # Verify formatting
   pnpm run build         # Ensure build succeeds
   ```

4. **Commit your changes** with descriptive conventional commit messages:

   ```bash
   git add .
   git commit -m "feat(scope): add new feature"
   ```

5. **Push to your branch** and create a Pull Request:

   ```bash
   git push origin feature/your-username/feature-name
   ```

6. **Ensure CI passes** - All linting, formatting, and build checks must pass

7. **Address review feedback** - Make requested changes and push updates to your branch

8. **Keep your branch up to date** - Rebase or merge `main` into your branch if needed:
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/your-username/feature-name
   git rebase main  # or git merge main
   ```

### Code Review Expectations

When submitting a Pull Request, ensure:

- ✅ All code passes linting and formatting checks
- ✅ Follow the project's code style and conventions
- ✅ Include appropriate type definitions (no `any` types)
- ✅ Update barrel imports (`index.ts`) if adding new exports
- ✅ Add comments for complex logic or non-obvious code
- ✅ Ensure components are accessible (ARIA labels, keyboard navigation)
- ✅ Test your changes locally before submitting
- ✅ Update documentation if adding new features or changing behavior
- ✅ Keep commits focused and atomic (one logical change per commit)
- ✅ Write clear commit messages following conventional commit format

## Testing and Quality

### Pre-Commit Checklist

Before committing, ensure:

- [ ] Code passes `pnpm run lint` (no errors or warnings)
- [ ] Code is formatted (`pnpm run format:check` passes)
- [ ] Application builds successfully (`pnpm run build`)
- [ ] No TypeScript errors or warnings
- [ ] Barrel imports are updated if adding new exports
- [ ] New components/hooks/types are exported from appropriate `index.ts` files
- [ ] Server actions follow the authentication and error handling patterns
- [ ] Forms use React Hook Form with Zod validation
- [ ] Client components have `"use client"` directive
- [ ] Server components don't have `"use client"` directive
- [ ] All imports are properly organized and sorted
- [ ] No console.log statements left in production code (use console.error for errors)

### Linting

Run the linter:

```bash
pnpm run lint
```

Fix issues automatically:

```bash
pnpm run lint:fix
```

### Formatting

Check formatting:

```bash
pnpm run format:check
```

Format code:

```bash
pnpm run format
```

### Build Verification

Always verify the build before committing:

```bash
pnpm run build
```

## Common Patterns and Examples

### Creating a New Feature

1. **Create the route segment**:

   ```
   app/dashboard/my-feature/
   ```

2. **Set up folder structure**:

   ```
   app/dashboard/my-feature/
   ├── _actions/          # Server actions (if needed)
   │   ├── my-action.actions.ts
   │   └── index.ts
   ├── _components/
   │   └── index.ts
   ├── _hooks/
   │   └── index.ts
   ├── _lib/              # Library files (optional)
   │   ├── my-table-columns.lib.tsx
   │   ├── my-utilities.lib.tsx
   │   └── index.ts       # Optional barrel export
   ├── _schemas/          # Zod schemas (if needed)
   │   └── index.ts
   ├── constants.ts       # Optional
   ├── lib.ts            # Optional (use lib.tsx if contains JSX, or use _lib/ exclusively)
   ├── types.ts          # Optional
   ├── page.tsx
   ├── loading.tsx        # Optional
   └── error.tsx          # Optional
   ```

   **Note**: You can use `_lib/` exclusively for all library files (like the schedule feature), or use a top-level `lib.ts/lib.tsx` for simple cases. Files in `_lib/` should be named `kebab-case.lib.ts` or `kebab-case.lib.tsx`.

3. **Create barrel exports** in each `index.ts` file

4. **Implement your feature** following the patterns above

### Adding a New Component

1. **Create the component file**:

   ```typescript
   "use client"; // If needed

   import { Button } from "@/components/ui/button";

   type MyComponentProps = {
     // props
   };

   const MyComponent = ({ ...props }: MyComponentProps) => {
     // implementation
   };

   export default MyComponent;
   ```

2. **Export from barrel file**:

   ```typescript
   // _components/index.ts
   export { default as MyComponent } from "./my-component";
   ```

3. **Use the component**:
   ```typescript
   import { MyComponent } from "@/app/dashboard/my-feature/_components";
   ```

### Adding a New Hook

1. **Create the hook file**:

   ```typescript
   "use client";

   export type UseMyHookReturn = {
     // return type
   };

   export const useMyHook = (): UseMyHookReturn => {
     // implementation
   };
   ```

2. **Export from barrel file**:
   ```typescript
   // _hooks/index.ts
   export { useMyHook } from "./use-my-hook";
   export type { UseMyHookReturn } from "./use-my-hook";
   ```

### Adding Types

1. **Add to `types.ts` file**:

   ```typescript
   import type { BaseModel } from "@/types";

   export type MyType = BaseModel & {
     // fields
   };
   ```

2. **Import where needed**:
   ```typescript
   import type { MyType } from "@/app/dashboard/my-feature/types";
   ```

### Adding Constants

1. **Add to `constants.ts` file**:

   ```typescript
   export const MY_CONSTANT = "value" as const;
   ```

2. **Import where needed**:
   ```typescript
   import { MY_CONSTANT } from "@/app/dashboard/my-feature/constants";
   ```

### Adding Utility Functions

**For simple utility functions**, add to `lib.ts` or `lib.tsx` file:

1. **Add to `lib.ts` or `lib.tsx` file**:

   ```typescript
   "use server"; // If using server-side code

   export const myUtility = () => {
     // implementation
   };
   ```

2. **Import where needed**:
   ```typescript
   import { myUtility } from "@/app/dashboard/my-feature/lib";
   ```

**For complex library files** (table columns, multiple related utilities), use `_lib/` folder:

1. **Create files in `_lib/` folder**:

   ```typescript
   // _lib/my-table-columns.lib.tsx (client-side)
   "use client";

   import { ColumnDef } from "@tanstack/react-table";
   import type { MyType } from "../types";

   export const getMyTableColumns = (): ColumnDef<MyType>[] => {
     // column definitions
   };
   ```

   ```typescript
   // _lib/lib.ts (server-side)
   "use server";

   import supabaseAdmin from "@/config/supabase-admin";

   export const getMyData = async () => {
     // server-side data fetching
   };
   ```

2. **Export from `_lib/` folder** (if using barrel exports):

   ```typescript
   // _lib/index.ts
   export { getMyTableColumns } from "./my-table-columns.lib";
   export { getMyData } from "./lib";
   ```

3. **Import where needed**:
   ```typescript
   import { getMyTableColumns } from "@/app/dashboard/my-feature/_lib";
   import { getMyData } from "@/app/dashboard/my-feature/_lib";
   // or directly:
   import { getMyTableColumns } from "@/app/dashboard/my-feature/_lib/my-table-columns.lib";
   ```

**When to use `_lib/` vs `lib.ts`:**

- Use `_lib/` folder when you have multiple related library files (e.g., table column definitions, calendar utilities, multiple server functions)
- You can use `_lib/` exclusively for all library files in a feature, even if you don't have a top-level `lib.ts` or `lib.tsx` (see schedule feature as an example)
- Use `lib.ts` or `lib.tsx` for simple, single-file utility functions when you only have one or two utility functions
- Use `lib.tsx` instead of `lib.ts` if the file contains JSX/TSX code
- `_lib/` can contain both client-side (`.tsx` with `"use client"`) and server-side (`.ts` with `"use server"`) files
- Files in `_lib/` should follow the naming pattern: `kebab-case.lib.ts` or `kebab-case.lib.tsx` (e.g., `calendar.lib.tsx`, `events-columns.lib.tsx`)

**Example: Schedule feature using `_lib/` exclusively:**

The schedule feature uses `_lib/` for all library files:

```
app/dashboard/schedule/
├── _lib/
│   ├── calendar.lib.tsx      # Calendar-related utilities (client-side)
│   ├── events-columns.lib.tsx  # Table column definitions (client-side)
│   └── index.ts             # Barrel export
├── constants.ts
├── types.ts
└── ...
```

All library functions are imported from `_lib/`:

```typescript
import { getCalendarItems, getVisibleCalendarRows } from "@/app/dashboard/schedule/_lib";
import { getEventsColumns } from "@/app/dashboard/schedule/_lib";
```

### Updating Barrel Imports

When adding new exports:

1. **Add the export** to the appropriate `index.ts`:

   ```typescript
   export { newComponent } from "./new-component";
   export type { NewComponentProps } from "./new-component";
   ```

2. **Ensure alphabetical ordering** (ESLint will enforce this)

3. **Update imports** in files that use the new export to use the barrel import

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors:**

- Run `pnpm run lint` to see specific errors
- Ensure all types are properly imported
- Check that barrel exports are updated

**Supabase connection issues:**

- Verify `.env.local` file exists and has correct credentials
- Check that the local stack is running (`pnpm exec supabase status`) or the hosted project is not paused
- Ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` belong to the same project

**Import errors:**

- Verify barrel exports in `index.ts` files
- Check import paths use `@/` alias correctly
- Ensure file names match import paths (case-sensitive)

**Linting/formatting issues:**

- Run `pnpm run format && pnpm run lint:fix` to auto-fix most issues
- Check ESLint configuration in `eslint.config.mjs`
- Verify Prettier configuration

**Server action errors:**

- Ensure `"use server"` directive is at the top of the file
- Verify authentication using `getAuthenticatedUser`
- Check the `error` returned by each Supabase query (`if (error) throw error;`)

## Additional Resources

### Documentation

- [Next.js Documentation](https://nextjs.org/docs) - App Router, Server Actions, and more
- [React Documentation](https://react.dev) - React 19 features and hooks
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - TypeScript best practices
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Utility classes and configuration
- [ShadCN UI Documentation](https://ui.shadcn.com) - Component library and customization
- [Supabase Documentation](https://supabase.com/docs) - Auth, Postgres, Storage, Realtime
- [Zod Documentation](https://zod.dev) - Schema validation and type inference
- [React Hook Form Documentation](https://react-hook-form.com) - Form state management

### Internal Resources

- Review existing code in similar features for patterns
- Check `lib/` folder for utility functions
- Look at `types/` folder for type definitions
- Examine `constants/` folder for shared constants

## Getting Help

If you need help or have questions:

1. Check this contributing guide and the README
2. Review existing code for similar patterns
3. Search existing issues and pull requests
4. Ask questions in your pull request
5. Contact the project maintainers

---

Thank you for contributing to WildHacks Dashboard 2026! 🚀

Your contributions help make the hackathon experience better for everyone.
