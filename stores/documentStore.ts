import { OpenAI } from "openai";
import { create } from "zustand";
import { config } from "../lib/config";
import { supabase } from "../lib/supabaseClient";
import { authQueries } from "../server/auth";
import { documentQueries, DocumentStats } from "../server/documents";
import { Tables } from "../types";

type Document = Tables<"documents">;
type DocumentEmbedding = Tables<"document_embeddings">;

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  chunkIndex: number;
  chunkType: string;
  metadata: any;
}

export interface DocumentState {
  // Documents
  documents: Document[];
  loading: boolean;
  error: string | null;

  // User stats
  stats: DocumentStats | null;
  statsLoading: boolean;

  // Search state
  searchResults: SearchResult[];
  searchLoading: boolean;
  searchQuery: string;

  // Actions
  fetchDocuments: (userId: string) => Promise<void>;
  fetchUserStats: (userId: string) => Promise<void>;
  uploadDocument: (
    file: File | Blob,
    userId: string,
    filename: string,
    userEmail?: string
  ) => Promise<void>;
  uploadAndProcessDocument: (
    file: File | Blob,
    userId: string,
    filename: string,
    userEmail?: string
  ) => Promise<Document | null>;
  deleteDocument: (documentId: string) => Promise<void>;

  // New search functionality
  searchDocuments: (
    query: string,
    userId?: string,
    threshold?: number
  ) => Promise<SearchResult[]>;
  clearSearch: () => void;
  reprocessDocument: (documentId: string) => Promise<void>;

  // Reset store state
  resetStore: () => void;

  // Add retry functionality for failed document processing
  retryDocumentProcessing: (documentId: string) => Promise<boolean>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // Initial state
  documents: [],
  loading: false,
  error: null,

  // User stats state
  stats: null,
  statsLoading: false,

  // Search state
  searchResults: [],
  searchLoading: false,
  searchQuery: "",

  // Fetch user documents
  fetchDocuments: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const documents = await documentQueries.getUserDocuments(userId);
      set({ documents, loading: false });
    } catch (error) {
      console.error("Error fetching documents:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch documents",
        loading: false,
      });
    }
  },

  // Fetch user statistics
  fetchUserStats: async (userId: string) => {
    set({ statsLoading: true });
    try {
      const stats = await documentQueries.getUserStats(userId);
      set({ stats, statsLoading: false });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      set({ statsLoading: false });
    }
  },

  uploadDocument: async (
    file: File | Blob,
    userId: string,
    filename: string,
    userEmail?: string
  ) => {
    set({ loading: true, error: null });
    try {
      // First, ensure user profile exists (this is critical!)
      try {
        const userProfile = await authQueries.getOrCreateUserProfile(
          userId,
          userEmail || "unknown@example.com"
        );
        if (!userProfile) {
          console.warn(
            "User profile creation failed, but continuing with upload..."
          );
          // For now, continue with upload even if profile creation fails
        }
      } catch (error) {
        console.error("User profile error:", error);
        console.warn("Continuing with upload despite profile error...");
        // Continue with upload despite profile error
      }

      const fileExt = filename.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const uploadPath = await documentQueries.uploadFileToStorage(
        file,
        fileName
      );
      if (!uploadPath) {
        throw new Error("Failed to upload file to storage");
      }

      // Create document record
      const documentData = {
        user_id: userId,
        filename: filename,
        original_filename: filename,
        file_type: fileExt || "unknown",
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        supabase_storage_path: fileName,
        ocr_status: "pending",
      };

      const newDocument = await documentQueries.createDocument(documentData);
      if (!newDocument) {
        throw new Error("Failed to create document record");
      }

      // Update local state
      set((state) => ({
        documents: [newDocument, ...state.documents],
        loading: false,
      }));

      // Update user stats
      await documentQueries.updateUserStats(userId, file.size);

      // Refresh stats
      await get().fetchUserStats(userId);
    } catch (error) {
      console.error("Error uploading document:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to upload document",
        loading: false,
      });
    }
  },

  uploadAndProcessDocument: async (
    file: File | Blob,
    userId: string,
    filename: string,
    userEmail?: string
  ): Promise<Document | null> => {
    set({ loading: true, error: null });
    try {
      // Validate file before processing
      if (!file || file.size === 0) {
        throw new Error("Invalid file: File is empty or corrupted");
      }

      if (!userId) {
        throw new Error("User ID is required for document upload");
      }

      console.log("Starting upload process for:", filename);

      const newDocument = await documentQueries.uploadAndProcessDocument(
        file,
        userId,
        filename,
        userEmail
      );

      if (!newDocument) {
        throw new Error("Failed to upload and process document");
      }

      // Update local state
      set((state) => ({
        documents: [newDocument, ...state.documents],
        loading: false,
      }));

      // Refresh stats in background
      get()
        .fetchUserStats(userId)
        .catch((error) => {
          console.warn("Failed to refresh user stats:", error);
        });

      return newDocument;
    } catch (error) {
      console.error("Error uploading and processing document:", error);

      let errorMessage = "Failed to upload and process document";

      // Provide more specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes("user profile")) {
          errorMessage =
            "Account setup required. Please try signing out and signing back in.";
        } else if (
          error.message.includes("email") &&
          error.message.includes("already registered")
        ) {
          errorMessage =
            "Email conflict detected. Your email is already associated with another account. Please contact support or try signing out and back in.";
        } else if (error.message.includes("foreign key constraint")) {
          errorMessage =
            "Account verification failed. Please sign out and sign back in to continue.";
        } else if (error.message.includes("storage")) {
          errorMessage =
            "File upload failed. Please check your internet connection and try again.";
        } else if (error.message.includes("size")) {
          errorMessage =
            "File is too large or corrupted. Please try a different file.";
        } else {
          errorMessage = error.message;
        }
      }

      set({
        error: errorMessage,
        loading: false,
      });
      return null;
    }
  },

  deleteDocument: async (documentId: string) => {
    try {
      // Save user ID before deleting the document to use for refreshing stats
      const document = get().documents.find((doc) => doc.id === documentId);
      const userId = document?.user_id;

      const success = await documentQueries.deleteDocument(documentId);
      if (success) {
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== documentId),
        }));

        // If we have the user ID, refresh the stats to reflect the updated count and storage
        if (userId) {
          await get().fetchUserStats(userId);
        }
      } else {
        throw new Error("Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete document",
      });
    }
  },

  // Enhanced search functionality
  searchDocuments: async (
    query: string,
    userId?: string,
    threshold: number = 0.6
  ): Promise<SearchResult[]> => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    set({ loading: true, error: null });
    try {
      // Create embedding for search query
      if (!config.openai.apiKey) {
        throw new Error("OpenAI API key not configured for search");
      }

      console.log("Creating search embedding for query:", query);

      const openai = new OpenAI({
        apiKey: config.openai.apiKey,
        dangerouslyAllowBrowser: true,
      });

      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query.trim(),
      });

      if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
        throw new Error("Failed to create search embedding");
      }

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Convert to PostgreSQL vector format
      const vectorString = `[${queryEmbedding.join(",")}]`;

      console.log("Searching documents with embedding...");

      // Search using the database function
      const { data, error } = await supabase.rpc("search_document_embeddings", {
        query_embedding: vectorString,
        match_threshold: threshold,
        match_count: 20,
        user_id: userId || undefined,
      });

      if (error) {
        console.error("Search error:", error);
        throw new Error(`Search failed: ${error.message}`);
      }

      console.log(`Found ${data?.length || 0} search results`);

      // Transform results
      const searchResults: SearchResult[] = (data || []).map((result: any) => ({
        id: result.id,
        documentId: result.document_id,
        content: result.content_chunk,
        similarity: result.similarity,
        chunkIndex: result.chunk_index,
        chunkType: result.chunk_type || "text",
        metadata: result.chunk_metadata || {},
      }));

      set({ loading: false });
      return searchResults;
    } catch (error) {
      console.error("Error searching documents:", error);
      set({
        error: error instanceof Error ? error.message : "Search failed",
        loading: false,
      });
      return [];
    }
  },

  clearSearch: () => {
    set({
      searchResults: [],
      searchQuery: "",
    });
  },

  reprocessDocument: async (documentId: string) => {
    try {
      const success = await documentQueries.retryDocumentProcessing(documentId);
      if (success) {
        // Refresh documents to get updated status
        const currentDocuments = get().documents;
        if (currentDocuments.length > 0) {
          const userId = currentDocuments[0]?.user_id;
          if (userId) {
            await get().fetchDocuments(userId);
          }
        }
      }
    } catch (error) {
      console.error("Error reprocessing document:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to reprocess document",
      });
    }
  },

  resetStore: () => {
    set({
      documents: [],
      loading: false,
      error: null,
      stats: null,
      statsLoading: false,
      searchResults: [],
      searchLoading: false,
      searchQuery: "",
    });
  },

  // Add retry functionality for failed document processing
  retryDocumentProcessing: async (documentId: string): Promise<boolean> => {
    set({ loading: true, error: null });
    try {
      const success = await documentQueries.retryDocumentProcessing(documentId);

      if (success) {
        // Refresh documents list to get updated status
        const currentState = get();
        if (currentState.documents.length > 0) {
          const userId = currentState.documents[0]?.user_id;
          if (userId) {
            await get().fetchDocuments(userId);
          }
        }
      }

      set({ loading: false });
      return success;
    } catch (error) {
      console.error("Error retrying document processing:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to retry processing",
        loading: false,
      });
      return false;
    }
  },
}));
