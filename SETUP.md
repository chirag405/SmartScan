# SmartScan Setup Guide

## Prerequisites

1. Node.js (v16 or higher)
2. Expo CLI (`npm install -g @expo/cli`)
3. Supabase account and project

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_APP_URL=your_app_url_for_oauth_redirect
```

## Supabase Configuration

### 1. Database Schema

The app uses the following tables (already defined in `types.ts`):

- `users` - User profiles and metadata
- `documents` - Document storage and metadata
- `document_embeddings` - Vector embeddings for document search
- `ai_conversations` - Chat conversation history
- `ai_messages` - Individual chat messages
- `document_access_logs` - Document access tracking

### 2. Storage Buckets

Create a storage bucket named `documents` in your Supabase project for file uploads.

### 3. Authentication

Enable Google OAuth in your Supabase project:

1. Go to Authentication > Providers
2. Enable Google provider
3. Add your OAuth credentials
4. Set redirect URLs

### 4. Row Level Security (RLS)

Enable RLS on all tables and create policies to ensure users can only access their own data.

Example policy for documents table:

```sql
CREATE POLICY "Users can only see their own documents" ON documents
FOR ALL USING (auth.uid() = user_id);
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see above)
4. Start the development server:
   ```bash
   npm start
   ```

## Features

### Authentication

- Google OAuth integration
- Persistent login sessions
- Secure token storage

### Document Management

- Upload PDF, JPG, PNG files
- OCR processing status tracking
- Document metadata storage
- File size and storage tracking

### AI Chat

- Conversation history
- Document-aware responses
- Real-time messaging
- Context-aware AI responses

### User Profile

- User statistics
- Account management
- Sign out functionality

## Development

### Adding New Features

1. Update database schema in Supabase
2. Regenerate types: `npm run generate-type`
3. Update stores in `stores/` directory
4. Update UI components

### Testing

The app includes error handling and loading states throughout. Test with:

- Network connectivity issues
- Authentication failures
- File upload errors
- Database connection issues

## Deployment

1. Build for production: `expo build`
2. Configure production environment variables
3. Set up proper OAuth redirect URLs for production
4. Deploy to app stores or web

## Troubleshooting

### Common Issues

1. **Authentication not working**: Check OAuth configuration and redirect URLs
2. **File uploads failing**: Verify storage bucket permissions
3. **Database errors**: Check RLS policies and table permissions
4. **Type errors**: Regenerate types with `npm run generate-type`

### Debug Mode

Enable debug logging by adding console.log statements in store actions and checking the Expo development tools.
