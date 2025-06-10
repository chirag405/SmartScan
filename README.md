# SmartScan

SmartScan is a document scanning and AI-powered search application that allows users to upload documents, extract text using OCR, and perform semantic searches using vector embeddings.

## Features

- **Document Upload**: Upload PDF, images, and text files from your device or camera
- **OCR Processing**: Extract text from documents using Eden AI Document Parser and Image OCR
- **Vector Embeddings**: Create semantic embeddings using OpenAI's embedding model
- **Semantic Search**: Search documents by meaning, not just keywords
- **Multi-platform**: Works on iOS, Android, and Web with a single codebase

## Setup

### Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Eden AI API key
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/smartscan.git
cd smartscan
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables by creating a `.env` file:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_EDEN_AI_API_KEY=your_eden_ai_api_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
EXPO_PUBLIC_APP_URL=your_app_url
```

4. Initialize the database:

```bash
npm run db:init
```

5. Set up authentication:

```bash
npm run auth:setup
```

6. Start the development server:

```bash
npm start
```

## Database Setup

The application requires a Supabase project with the following:

1. **Database Tables**:

   - `users`: For user profiles
   - `documents`: For document metadata
   - `document_embeddings`: For vector embeddings

2. **Vector Extension**:

   - Make sure the `vector` extension is enabled in your Supabase project

3. **Storage Bucket**:

   - Create a `documents` bucket for file storage

4. **Authentication**:
   - Enable Google OAuth provider

The `db:init` script will help you set up most of this automatically.

## Document Processing Flow

1. **Upload**: User uploads a document via the DocumentUploader component
2. **Storage**: File is stored in Supabase Storage
3. **OCR**: Eden AI extracts text from the document using Document Parser (for PDFs) or Image OCR (for images)
4. **Embedding**: OpenAI creates vector embeddings for the extracted text
5. **Storage**: Embeddings are stored in the database with PostgreSQL's vector extension
6. **Search**: Users can search using natural language queries

## Component Structure

- `DocumentUploader.tsx`: UI for uploading documents
- `DocumentSearch.tsx`: UI for searching documents
- `DocumentList.tsx`: UI for viewing and managing documents

## Server Functions

- `documentQueries.uploadAndProcessDocument`: Handles document upload and processing
- `processDocumentWithOCR`: Extracts text from documents
- `createDocumentEmbeddings`: Creates vector embeddings for extracted text
- `searchDocumentsByEmbedding`: Performs semantic search

## Troubleshooting

### PDF Processing

If you encounter issues with PDF processing:

1. Make sure your Eden AI API key is correctly set up with access to Document Parser and Image OCR services
2. Verify that the PDF is not password-protected
3. Try converting the PDF to images before uploading for better OCR results

### Vector Search

If vector search is not working:

1. Confirm the `vector` extension is enabled in Supabase
2. Check that the `search_document_embeddings` function is properly created
3. Verify embeddings are being stored correctly in the `document_embeddings` table

## License

MIT
