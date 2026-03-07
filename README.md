# Todo Whiteboard

A todo application with Trello-style columns displayed side by side. Organize tasks across categories with drag and drop.

## Features

- **Horizontal Columns** – Categories displayed side by side, fixed layout
- **Categories (Columns)** – Create categories; new ones appear to the right
- **Tasks** – Add tasks to categories with Title, Description, Assigned To, Project
- **Projects** – Create projects with unique IDs and link tasks to them
- **Drag & Drop** – Reorder tasks within categories
- **Filtering** – Filter by Assigned To and Project
- **Search** – Search tasks by Title, Description, or Task ID

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS**
- **dnd-kit** – Drag and drop for task reordering (core + sortable)
- **Zustand** – State management
- **Supabase** – Database (required)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase (required)

Copy `.env.example` to `.env.local` and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Get your credentials from [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

### 3. Run database migrations

**Option A – Supabase Dashboard:** Run each migration file in `supabase/migrations/` in order (by filename) in the Supabase SQL Editor.

**Option B – Supabase CLI:**
```bash
npx supabase init   # if not already initialized
npx supabase db push
```

Or run the single migration file `20260306120000_initial_schema.sql` in the Supabase SQL Editor.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Note:** Supabase is required. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` before building or running.

## Project Structure

```
src/
├── app/           # Next.js app router
├── components/    # React components
│   ├── CategoryNode.tsx      # Category column with tasks
│   ├── CategoryNodeWithAdd.tsx
│   ├── TaskCard.tsx          # Draggable task card
│   ├── TaskFormModal.tsx
│   ├── ProjectModal.tsx
│   ├── CategoryModal.tsx
│   ├── Toolbar.tsx           # Filters, search, create buttons
│   └── TodoCanvas.tsx        # React Flow canvas
├── lib/           # Supabase client
└── store/         # Zustand store
```
