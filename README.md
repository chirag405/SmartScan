# SmartScan

An intelligent document processing app built with React Native, Expo, and Supabase. SmartScan allows users to upload documents in various formats, extract text using Google Vision API, create vector embeddings for semantic search, and interact with their documents through AI-powered chat.

## Features

### Document Processing

- **Multi-format Support**: Upload images (JPEG, PNG, GIF, BMP), PDFs, Word documents, and text files
- **OCR Text Extraction**: Powered by Google Vision API for accurate text recognition
- **Intelligent Processing**: Automatic text extraction with confidence scoring
- **Background Processing**: Asynchronous document processing for better user experience

### AI-Powered Search

- **Vector Embeddings**: Documents are automatically converted to embeddings using OpenAI's text-embedding-3-small model
- **Semantic Search**: Find documents by meaning, not just keywords
- **Similarity Scoring**: Results ranked by relevance with confidence indicators
- **Real-time Search**: Fast vector similarity search using pgvector

### Document Management

- **Upload Options**:
  - Choose from device storage
  - Select from photo library
  - Take photos with camera
- **Processing Status**: Track document processing progress
- **Retry Failed**: Reprocess documents that failed initially
- **Statistics Dashboard**: View total documents, processed count, and storage usage

### Chat Integration

- **Document-aware Conversations**: Chat with AI about your uploaded documents
- **Context Retrieval**: AI can reference specific document content
- **Multi-document Queries**: Ask questions across your entire document library

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL with pgvector)
- **AI Services**:
  - Google Vision API for OCR
  - OpenAI for embeddings and chat
- **Storage**: Supabase Storage for file management
- **Vector Database**: PostgreSQL with pgvector extension

## Getting Started

### Prerequisites

1. **Node.js** (v18 or later)
2. **Expo CLI** (`npm install -g @expo/cli`)
3. **Google Cloud Platform** account with Vision API enabled
4. **OpenAI** account with API access
5. **Supabase** project

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd SmartScan
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the project root:

   ```env
   # Google Vision API
   EXPO_PUBLIC_GOOGLE_VISION_API_KEY=your-google-vision-api-key

   # OpenAI API
   EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key

   # Supabase
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Database Setup:**

   Enable pgvector extension in your Supabase project:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

   Run the vector search function from `supabase/functions/search-document-embeddings.sql`

5. **Start the development server:**
   ```bash
   npm start
   ```

### Detailed Setup Guide

For complete setup instructions including API configuration, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

## Usage

### Uploading Documents

1. Navigate to the **Documents** tab
2. Switch to the **Upload** section
3. Choose your upload method:
   - **Choose Document**: Select files from device storage
   - **Choose Image**: Pick from photo library
   - **Take Photo**: Capture documents with camera
4. Wait for processing to complete

### Searching Documents

1. Go to the **Search** section in the Documents tab
2. Enter your search query (supports semantic search)
3. View results with similarity scores
4. Tap on documents to view details

### Managing Documents

1. Use the **Manage** section to view all uploaded documents
2. See processing status and confidence scores
3. Retry failed processing if needed
4. View storage statistics

### AI Chat

1. Navigate to the **Chat** tab
2. Ask questions about your documents
3. The AI will retrieve relevant content automatically
4. Reference specific documents in conversations

## API Integration

### Google Vision API

The app uses Google Vision API for OCR text extraction:

- Supports multiple image formats
- Provides confidence scoring
- Extracts text entities and bounding boxes
- Handles various document orientations

### OpenAI Integration

- **Embeddings**: Uses `text-embedding-3-small` for vector generation
- **Chat**: Integrates with GPT models for document conversations
- **Token Optimization**: Intelligent text chunking to minimize costs

### Vector Search

- **pgvector**: PostgreSQL extension for vector similarity
- **Cosine Similarity**: Measures document relevance
- **Indexed Search**: Optimized queries for fast results
- **User Isolation**: Search within user's document scope

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Native  │    │    Supabase      │    │   AI Services   │
│     Frontend    │◄──►│   PostgreSQL     │    │                 │
│                 │    │   + pgvector     │    │ Google Vision   │
│ • Document UI   │    │   + Storage      │    │ OpenAI          │
│ • Search UI     │    │   + Auth         │    │                 │
│ • Chat UI       │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Database Schema

Key tables:

- `documents`: Document metadata and OCR results
- `document_embeddings`: Vector embeddings for search
- `ai_conversations`: Chat history
- `ai_messages`: Individual chat messages

## Cost Considerations

### Google Vision API

- First 1,000 requests/month: Free
- Additional requests: $1.50 per 1,000

### OpenAI

- Embeddings: $0.00002 per 1K tokens
- Chat: Varies by model used

### Optimization Tips

- Compress images before processing
- Implement smart chunking for large documents
- Cache embeddings to avoid reprocessing
- Monitor API usage with alerts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style
4. Add tests for new features
5. Submit a pull request

## Security

- Environment variables are never committed
- API keys are properly secured
- User data is isolated with RLS policies
- File uploads are validated and sanitized

## Troubleshooting

### Common Issues

1. **Vision API Errors**: Check API key and quota
2. **Embedding Failures**: Verify OpenAI API access
3. **Search Not Working**: Ensure pgvector extension is installed
4. **Upload Failures**: Check file size and format restrictions

### Debug Mode

Enable debug logging by setting:

```env
DEBUG_GOOGLE_VISION=true
DEBUG_OPENAI_EMBEDDINGS=true
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Check the troubleshooting guide in [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
- Review the API documentation
- Open an issue on GitHub
