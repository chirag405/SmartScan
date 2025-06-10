# Implementation Status: Document Processing with AI

## ✅ Completed Features

### Core Document Processing

- [x] **Multi-format file upload support** (images, PDFs, Word docs, text files)
- [x] **Eden AI integration** for document parsing and OCR text extraction
- [x] **OpenAI embeddings** using text-embedding-3-small model
- [x] **Vector storage** in PostgreSQL with vector extension
- [x] **Asynchronous processing** with status tracking

### User Interface Components

- [x] **DocumentUploader component** with three upload methods:
  - File picker for documents
  - Photo library selection
  - Camera capture
- [x] **DocumentSearch component** with semantic search
- [x] **Documents screen** with tabbed interface (Upload/Search/Manage)
- [x] **Processing status indicators** and retry functionality
- [x] **Statistics dashboard** showing document counts and storage usage

### Backend Infrastructure

- [x] **Enhanced document server logic** with OCR and embedding processing
- [x] **Vector similarity search** function in PostgreSQL
- [x] **Document state management** using Zustand
- [x] **Error handling and retry mechanisms**
- [x] **File validation and security measures**

### Search & Discovery

- [x] **Semantic search** using vector embeddings
- [x] **Similarity scoring** with confidence indicators
- [x] **Real-time search** with debouncing
- [x] **Search result ranking** by relevance
- [x] **Multi-document search** across user's library

### Configuration & Setup

- [x] **Environment configuration** for React Native
- [x] **API key management** with secure storage
- [x] **Database schema** with proper indexing
- [x] **Setup documentation** with step-by-step guides
- [x] **Troubleshooting guides** for common issues

## 🔧 Technical Implementation Details

### Architecture

- **Frontend**: React Native with Expo Router
- **State Management**: Zustand stores
- **Backend**: Supabase (PostgreSQL + Storage)
- **AI Services**: Eden AI + OpenAI
- **Vector Database**: vector extension

### Key Files Created/Modified

1. `server/documents.ts` - Enhanced with OCR and embedding processing
2. `stores/documentStore.ts` - Updated with search and processing functions
3. `components/ui/DocumentUploader.tsx` - New upload component
4. `components/ui/DocumentSearch.tsx` - New search component
5. `app/(tabs)/documents.tsx` - New documents screen
6. `lib/config.ts` - Configuration management
7. `supabase/functions/search-document-embeddings.sql` - Vector search function

### Security Features

- Environment variable validation
- File type and size validation
- User data isolation with RLS
- API key secure storage
- Input sanitization

## 🚀 Performance Optimizations

### Text Processing

- **Smart chunking** to optimize token usage
- **Batch embedding** generation
- **Async processing** to prevent UI blocking
- **Progress tracking** for user feedback

### Search Performance

- **Vector indexing** with ivfflat for fast similarity search
- **Query optimization** with user-scoped searches
- **Result caching** to reduce API calls
- **Debounced search** to prevent excessive queries

### Cost Optimization

- **Efficient chunking** to minimize OpenAI token usage
- **Image compression** before Vision API processing
- **Error retry logic** with exponential backoff
- **Usage monitoring** and limits

## 📱 User Experience Features

### Upload Flow

1. **Multiple upload methods** (file picker, photo library, camera)
2. **Real-time progress** indicators
3. **Format validation** with user-friendly error messages
4. **Background processing** with status updates
5. **Success notifications** with auto-navigation

### Search Experience

1. **Semantic search** that understands context and meaning
2. **Instant results** with similarity percentages
3. **Document previews** with relevant text snippets
4. **Clear empty states** and loading indicators
5. **Error handling** with helpful messages

### Management Interface

1. **Document list** with processing status
2. **Retry functionality** for failed processing
3. **Statistics dashboard** with storage usage
4. **Confidence scores** for OCR results
5. **Pull-to-refresh** for data updates

## 🔮 Ready for Integration

### Chat Integration Points

- Documents are automatically available for AI chat context
- Vector search can be used for relevant document retrieval
- Processing status can inform chat about document availability
- Embeddings are ready for RAG (Retrieval Augmented Generation)

### Extension Possibilities

- **Document annotations** and highlights
- **OCR confidence** improvement suggestions
- **Batch processing** for multiple documents
- **Export functionality** for processed text
- **Document versioning** and history

## 📋 Environment Requirements

### API Keys Needed

- `EXPO_PUBLIC_EDEN_AI_API_KEY` - For document parsing and OCR text extraction
- `EXPO_PUBLIC_OPENAI_API_KEY` - For embeddings generation
- Supabase credentials (URL and anon key)

### Database Setup

- vector extension enabled
- Vector search function deployed
- Proper RLS policies configured
- Storage bucket for documents

## 🎯 Next Steps

The document processing system is fully functional and ready for use. Users can now:

1. **Upload any supported document format**
2. **Get automatic text extraction with OCR**
3. **Search documents using natural language**
4. **View processing status and statistics**
5. **Retry failed processing attempts**

The system is designed to scale and can handle multiple concurrent uploads and searches efficiently.

## Document Retrieval Strategy

### Option 1: Keyword-Based Search (Recommended for MVP)

This approach is simpler and more straightforward for the initial implementation:

1. When documents are processed with Eden AI:

   - Extract text content
   - Generate metadata (document type, date, key entities like names, numbers)
   - Store in a structured format in Supabase

2. When user asks a question:

   - Parse the question for key terms
   - Use regular database queries to find matching documents
   - Use metadata to narrow down search (e.g., "my electricity bill from July")
   - Retrieve the most relevant document(s)

3. AI response generation:
   - Pass the document content + user query to the AI model
   - Generate a focused answer using only the retrieved document(s)
   - Include document reference/link in the response

**Advantages:**

- Simpler implementation
- Lower processing overhead
- Faster document ingestion
- No embedding generation or storage needed
- Works well for straightforward document queries

**Limitations:**

- Less effective for complex semantic questions
- May miss documents that are semantically relevant but don't contain exact keywords
- Requires good metadata extraction

### Option 2: Vector Embedding Search (For Future Enhancement)

If more sophisticated search capabilities are needed:

1. During document processing:

   - Break documents into chunks
   - Generate vector embeddings for each chunk
   - Store embeddings in Supabase's vector extension

2. For user queries:

   - Convert query to embedding vector
   - Perform similarity search to find relevant document chunks
   - Retrieve most similar document sections

3. AI response generation:
   - Same as Option 1, but with more semantically relevant content

**Implementation Requirements:**

- OpenAI Embedding API integration
- Supabase pgvector extension setup
- Chunking strategy for documents
- Vector similarity search implementation

**Recommendation:**
Start with Option 1 (keyword-based) for the MVP. It's simpler to implement and will work well for most document-specific queries. You can add vector-based search as an enhancement in a future phase if needed for more complex semantic search capabilities.

## Complete System Flow Architecture

### 1. Document Processing Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  User       │    │  Eden AI     │    │  OpenAI     │    │  OpenAI     │    │  Supabase   │
│  Upload     │───▶│  Doc Parser/ │───▶│  Structure  │───▶│  Embeddings │───▶│  Storage &  │
│  Document   │    │  Image OCR   │    │  & Extract  │    │  API        │    │  pgvector   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Step-by-Step Flow:**

1. **Document Upload**:

   - User uploads document through app interface
   - Document is temporarily stored
   - Processing job is initiated

2. **Eden AI Processing**:

   - Document sent to Eden AI for text extraction:
     - Document Parser API for PDFs and structured documents
     - Image OCR API for photos and images
   - Raw text extracted and returned

3. **OpenAI Structure & Extraction**:

   - Raw text sent to OpenAI with prompt to:
     - Identify document type (PAN card, Aadhar, marksheet, etc.)
     - Extract structured data into JSON format
     - Organize data into meaningful sections
   - Returns structured JSON with document metadata

4. **Text Chunking & Embedding**:

   - Structured text divided into semantic chunks
   - Each chunk sent to OpenAI Embeddings API
   - Vector embeddings generated for each chunk

5. **Supabase Storage**:
   - Original document stored in Supabase Storage
   - Structured data stored in PostgreSQL tables
   - Vector embeddings stored in pgvector columns
   - Document metadata indexed for quick retrieval

### 2. Document Query System with Vercel AI SDK

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐    ┌─────────────┐
│  User       │    │  Vercel     │    │  Query Processing   │    │  OpenAI     │
│  Query      │───▶│  AI SDK     │───▶│  1. Embedding Gen   │───▶│  Response   │
│  Interface  │    │  Router     │    │  2. Vector Search   │    │  Generation │
└─────────────┘    └─────────────┘    │  3. Content Fetch   │    └─────────────┘
                         ▲             └─────────────────────┘           │
                         │                       ▲                       │
                         │                       │                       │
                         │               ┌───────────────┐               │
                         │               │   Supabase    │               │
                         │               │   pgvector    │               │
                         │               └───────────────┘               │
                         └───────────────────────────────────────────────┘
                              Streaming response with document reference
```

**Step-by-Step Query Flow:**

1. **User Query**:

   - User enters question in app interface
   - Query submitted to backend via Vercel AI SDK

2. **Query Type Determination**:

   - System analyzes query to determine if it's:
     - A document download request
     - A specific information request

3. **For Document Download Requests**:

   - Fetch document reference from database
   - Generate temporary download URL from Supabase Storage
   - Return URL to user interface

4. **For Information Requests**:

   - Convert query to embedding vector using OpenAI Embeddings API
   - Perform vector similarity search in Supabase pgvector
   - Retrieve top-k most relevant text chunks (typically 3-5)
   - Fetch full context for each chunk

5. **OpenAI Response Generation**:
   - Construct prompt with:
     - User's original query
     - Retrieved relevant text chunks as context
   - Send to OpenAI GPT model
   - Stream response back to user via Vercel AI SDK

## Supabase Configuration & Schema

### 1. Database Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  structured_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table with vector embeddings
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- Create vector index for similarity search
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

### 2. Supabase Storage Configuration

```typescript
// Storage bucket configuration
const storageBuckets = {
  documents: {
    public: false,
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/tiff",
      "image/webp",
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
  },
};
```

### 3. Vector Search Implementation

```typescript
// Example vector search function
async function searchDocumentEmbeddings(
  userId: string,
  queryEmbedding: number[],
  docType?: string,
  limit: number = 5
) {
  // Build base query joining documents and chunks
  let query = supabase
    .rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
    })
    .select(
      `
      id,
      chunk_text,
      metadata,
      similarity,
      documents:document_id (
        id,
        file_name,
        document_type,
        structured_data
      )
    `
    )
    .eq("documents.user_id", userId);

  // Add document type filter if specified
  if (docType) {
    query = query.eq("documents.document_type", docType);
  }

  // Execute query
  const { data, error } = await query;

  return { data, error };
}
```

## Vercel AI SDK Integration

### 1. API Route Implementation

```typescript
// Example API route using Vercel AI SDK
import { OpenAIStream, StreamingTextResponse } from "ai";
import { Configuration, OpenAIApi } from "openai-edge";
import { createClient } from "@supabase/supabase-js";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { userId, query } = await req.json();

  // Check if download request
  if (
    query.toLowerCase().includes("download") ||
    query.toLowerCase().includes("get file") ||
    query.toLowerCase().includes("original document")
  ) {
    // Handle document download request
    // Return document URL
    return new Response(JSON.stringify({ type: "download", url: "..." }));
  }

  // Generate embedding for query
  const embeddingResponse = await openai.createEmbedding({
    model: "text-embedding-3-small",
    input: query,
  });

  const embeddingData = await embeddingResponse.json();
  const queryEmbedding = embeddingData.data[0].embedding;

  // Search for relevant chunks
  const { data: chunks } = await searchDocumentEmbeddings(
    userId,
    queryEmbedding
  );

  // Prepare context from chunks
  const context = chunks.map((chunk) => chunk.chunk_text).join("\n\n");

  // Create completion with context
  const response = await openai.createChatCompletion({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that answers questions about documents. Use ONLY the provided document context to answer questions. If the information is not in the context, say you don't have that information.",
      },
      {
        role: "user",
        content: `Context from documents:\n${context}\n\nQuestion: ${query}`,
      },
    ],
    stream: true,
  });

  // Convert to stream and return
  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
```

### 2. Frontend Implementation with Vercel AI SDK

```typescript
import { useChat } from 'ai/react';

export function DocumentChat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/document-chat',
    body: {
      userId: 'current-user-id' // Replace with actual user ID
    }
  });

  return (
    <div>
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about your documents..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```
