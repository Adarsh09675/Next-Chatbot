# Next-Chatbot 🤖

A modern, high-performance AI-powered chatbot built with Next.js, Supabase, Pinecone, and Google's Gemini API. This project features Retrieval-Augmented Generation (RAG) for intelligent document processing and real-time chat interactions.

## ✨ Features

- **🚀 Real-time Chat**: Seamlessly interact with Gemini-powered AI.
- **📚 RAG Integration**: Upload and query documents (PDFs) with Pinecone vector database.
- **🔐 Secure Auth**: Built-in authentication with Supabase SSR.
- **🎨 Premium UI**: Sleek, responsive design using Tailwind CSS and Radix UI components.
- **⚡ Performance**: Optimized with Next.js 15+ and server actions.

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Supabase (Database & Auth)
- **Vector DB**: Pinecone
- **AI Model**: Google Gemini Pro (via `@ai-sdk/google`)
- **State Management**: React Hook Form, Zod

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase Account
- Pinecone Account
- Google AI (Gemini) API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Adarsh09675/Next-Chatbot.git
   cd Next-Chatbot
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env.local` (or `.env`) file in the root directory and copy the contents from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your API keys and credentials.

4. **Database Setup**:
   - Run the SQL scripts found in the `database/` folder in your Supabase SQL Editor to set up the necessary tables and functions.

5. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the app in action!

## 📁 Project Structure

- `app/`: Next.js App Router (pages and server actions)
- `components/`: Reusable UI components (Radix UI + Tailwind)
- `lib/`: Shared utilities and database clients
- `database/`: SQL setup scripts for Supabase
- `public/`: Static assets

## 📄 License

This project is licensed under the MIT License.
