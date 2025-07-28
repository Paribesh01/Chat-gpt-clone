# Chat Application

A modern chat application built with Next.js.

## Features

- **Match ChatGPT UI exactly** — Replicates layout, spacing, fonts, animations, scrolling behavior, modals, etc.
- **Full mobile responsiveness and accessibility** (ARIA-compliant)
- **Edit Message:** Users can edit previously submitted messages with seamless regeneration behavior
- **Integrates Vercel AI SDK** for handling chat responses
- **Context window handling logic:** Segments or trims historical messages for models with limited context size
- **Message streaming** with graceful UI updates
- **Memory capability** (using [mem0.ai](https://mem0.ai/))
- **Supports image uploads** (JPEG, PNG, etc.)
- **Supports file uploads** (PDF, DOCX, TXT, CSV, etc.)
- **Deployed on Vercel**

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## Environment Variables

Create a `.env.local` file in the root directory and include the following variables as needed:

```env
# Vercel AI SDK / OpenAI
OPENAI_API_KEY=your-openai-api-key

# MongoDB
MONGO_DB_URL=your-mongodb-url

# mem0.ai
MEM0_API_KEY=your-mem0-api-key

# (Optional) Cloudinary for image/file uploads
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_UPLOADS_FOLDER=your-cloudinary-uploads-folder

# Clerk for authentication
CLERK_SECRET_KEY=your-clerk-secret-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key

```

## Project Structure

- `src/app/` - Application routes and API endpoints
- `src/components/` - UI components
- `src/lib/` - Utility libraries
- `public/` - Static assets

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
