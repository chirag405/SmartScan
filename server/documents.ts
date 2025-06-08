import OpenAI from "openai";
import { config } from "../lib/config";
import { supabase } from "../lib/supabaseClient";
import { Tables, TablesInsert, TablesUpdate } from "../types";
import { authQueries } from "./auth";

type Document = Tables<"documents">;
type DocumentInsert = TablesInsert<"documents">;
type DocumentUpdate = TablesUpdate<"documents">;
type DocumentEmbedding = Tables<"document_embeddings">;
type DocumentEmbeddingInsert = TablesInsert<"document_embeddings">;

// Type for search results from the RPC function
interface SearchResult {
  id: string;
  document_id: string;
  content_chunk: string;
  chunk_index: number;
  chunk_type: string;
  chunk_metadata: any;
  tokens_count: number;
  created_at: string;
  similarity: number;
}

export interface DocumentStats {
  totalDocuments: number;
  processedDocuments: number;
  storageUsedMB: number;
}

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  dangerouslyAllowBrowser: true, // Required for React Native
});

// Helper function to chunk text
const chunkText = (text: string, maxTokens: number = 1000): string[] => {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const potentialChunk = currentChunk + sentence + ".";
    // Rough estimate: 1 token ≈ 4 characters
    if (potentialChunk.length / 4 > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + ".";
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

// Helper function to create embeddings with improved error handling
const createEmbedding = async (text: string): Promise<number[]> => {
  try {
    if (!config.openai.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("No text provided for embedding");
    }

    console.log("Creating embedding for text length:", text.length);

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.trim(),
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No embedding data received from OpenAI");
    }

    const embedding = response.data[0].embedding;
    if (!embedding || embedding.length === 0) {
      throw new Error("Invalid embedding received from OpenAI");
    }

    console.log(
      "Embedding created successfully with dimension:",
      embedding.length
    );
    return embedding;
  } catch (error) {
    console.error("Error creating embedding:", error);
    throw error;
  }
};

// Extract text from image using Google Vision API (React Native compatible)
const extractTextFromImage = async (
  imageBuffer: ArrayBuffer
): Promise<{
  text: string;
  confidence: number;
  entities: any[];
  fullResponse: any;
}> => {
  try {
    if (!config.googleVision.apiKey) {
      throw new Error("Google Vision API key not configured");
    }

    // Convert ArrayBuffer to base64 - React Native compatible
    const uint8Array = new Uint8Array(imageBuffer);

    // Simple base64 encoding that works in both React Native and browser
    const base64Chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let base64Image = "";

    for (let i = 0; i < uint8Array.length; i += 3) {
      const byte1 = uint8Array[i];
      const byte2 = uint8Array[i + 1] || 0;
      const byte3 = uint8Array[i + 2] || 0;

      const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;

      base64Image += base64Chars.charAt((bitmap >> 18) & 63);
      base64Image += base64Chars.charAt((bitmap >> 12) & 63);
      base64Image +=
        i + 1 < uint8Array.length
          ? base64Chars.charAt((bitmap >> 6) & 63)
          : "=";
      base64Image +=
        i + 2 < uint8Array.length ? base64Chars.charAt(bitmap & 63) : "=";
    }

    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: "TEXT_DETECTION",
              maxResults: 50,
            },
          ],
        },
      ],
    };

    const response = await fetch(
      `${config.googleVision.endpoint}?key=${config.googleVision.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Google Vision API error: ${response.status} - ${errorData}`
      );
    }

    const result = await response.json();
    const textAnnotations = result.responses[0]?.textAnnotations || [];
    const fullText = textAnnotations[0]?.description || "";

    // Calculate average confidence
    const confidenceScores = textAnnotations.map(
      (annotation: any) => annotation.score || 0
    );
    const avgConfidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((a: number, b: number) => a + b, 0) /
          confidenceScores.length
        : 0;

    // Extract entities (like dates, numbers, etc.)
    const entities = textAnnotations.slice(1).map((annotation: any) => ({
      text: annotation.description,
      boundingBox: annotation.boundingPoly,
      confidence: annotation.score,
    }));

    return {
      text: fullText,
      confidence: avgConfidence,
      entities,
      fullResponse: result,
    };
  } catch (error) {
    console.error("Error extracting text from image:", error);
    throw error;
  }
};

// Extract text from various document types (images, PDFs, etc.)
const extractTextFromDocument = async (
  arrayBuffer: ArrayBuffer,
  mimeType: string,
  fileName: string
): Promise<{
  text: string;
  confidence: number;
  entities: any[];
  fullResponse: any;
}> => {
  try {
    console.log("Extracting text from document:", { mimeType, fileName });

    // Handle different document types
    if (mimeType.startsWith("image/")) {
      // Process image files with Google Vision API
      return await extractTextFromImage(arrayBuffer);
    } else if (mimeType === "application/pdf") {
      // For PDF files, we need to convert to images first for Vision API
      // This is a simplified approach - in production, you might want to use a dedicated PDF parser
      console.warn(
        "PDF processing currently requires conversion to images. Consider using a dedicated PDF text extraction service."
      );

      // For now, return a placeholder - you can integrate a PDF parsing library here
      return {
        text: "PDF processing not yet fully implemented. Please use image files or implement PDF text extraction.",
        confidence: 0.5,
        entities: [],
        fullResponse: {},
      };
    } else if (mimeType.includes("text/")) {
      // Handle plain text files
      const textDecoder = new TextDecoder("utf-8");
      const text = textDecoder.decode(arrayBuffer);

      return {
        text: text,
        confidence: 1.0,
        entities: [],
        fullResponse: { type: "text_file" },
      };
    } else if (mimeType.includes("word") || mimeType.includes("document")) {
      // Handle Word documents
      console.warn(
        "Word document processing not fully implemented. Consider using a dedicated document parser."
      );

      return {
        text: "Word document processing not yet fully implemented. Please use image files or plain text.",
        confidence: 0.5,
        entities: [],
        fullResponse: {},
      };
    } else {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
  } catch (error) {
    console.error("Error extracting text from document:", error);
    throw error;
  }
};

// Process document with OCR and embeddings
const processDocumentWithOCR = async (
  documentId: string,
  storagePath: string
): Promise<boolean> => {
  try {
    console.log("Starting document processing for:", documentId);

    // Get document metadata first
    const { data: docMeta, error: metaError } = await supabase
      .from("documents")
      .select("mime_type, filename")
      .eq("id", documentId)
      .single();

    if (metaError || !docMeta) {
      throw new Error(`Failed to get document metadata: ${metaError?.message}`);
    }

    // Update status to processing
    const { error: statusUpdateError } = await supabase
      .from("documents")
      .update({
        ocr_status: "processing",
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (statusUpdateError) {
      console.error("Error updating processing status:", statusUpdateError);
    }

    try {
      // Download file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(storagePath);

      if (downloadError) {
        console.error("Error downloading file:", downloadError);
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      if (!fileData) {
        throw new Error("No file data received from storage");
      }

      // Convert to ArrayBuffer - React Native compatible
      let arrayBuffer: ArrayBuffer;

      try {
        if (fileData && typeof fileData.arrayBuffer === "function") {
          // Browser environment
          arrayBuffer = await fileData.arrayBuffer();
        } else if (fileData instanceof Blob) {
          // React Native environment - use FileReader
          const reader = new FileReader();
          arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            reader.onload = () => {
              if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result);
              } else {
                reject(new Error("FileReader did not return ArrayBuffer"));
              }
            };
            reader.onerror = () => reject(new Error("FileReader error"));
            reader.readAsArrayBuffer(fileData);
          });
        } else {
          throw new Error("Unsupported file data format for processing");
        }
      } catch (bufferError: any) {
        console.error("Error converting file to ArrayBuffer:", bufferError);
        throw new Error(
          `File processing failed: ${bufferError.message || "Unknown error"}`
        );
      }

      // Extract text using appropriate method based on file type
      const extractionResult = await extractTextFromDocument(
        arrayBuffer,
        docMeta.mime_type,
        docMeta.filename
      );

      // Update document with extraction results
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          ocr_status: "completed",
          ocr_text: extractionResult.text,
          detected_text: extractionResult.text,
          ocr_confidence_score: extractionResult.confidence,
          vision_api_response: extractionResult.fullResponse,
          detected_entities: extractionResult.entities,
          processed_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Error updating document:", updateError);
        throw new Error(`Failed to update document: ${updateError.message}`);
      }

      // Create embeddings if text was extracted
      if (extractionResult.text && extractionResult.text.trim().length > 0) {
        console.log("Creating embeddings for document:", documentId);
        await createDocumentEmbeddings(documentId, extractionResult.text);
        console.log(
          "Embeddings created successfully for document:",
          documentId
        );
      } else {
        console.warn(
          "No text extracted, skipping embedding creation for:",
          documentId
        );
      }

      console.log("Document processing completed successfully:", documentId);
      return true;
    } catch (processingError: any) {
      console.error(
        "Processing error for document:",
        documentId,
        processingError
      );

      // Update document status to failed with error details
      const { error: failedUpdateError } = await supabase
        .from("documents")
        .update({
          ocr_status: "failed",
          ocr_text: `Processing failed: ${
            processingError.message || "Unknown error"
          }`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (failedUpdateError) {
        console.error("Error updating failed status:", failedUpdateError);
      }

      throw processingError;
    }
  } catch (error) {
    console.error("Error in processDocumentWithOCR:", error);
    return false;
  }
};

// Create embeddings for document chunks
const createDocumentEmbeddings = async (
  documentId: string,
  text: string
): Promise<void> => {
  try {
    if (!text || text.trim().length === 0) {
      console.warn("No text provided for embedding creation");
      return;
    }

    console.log("Creating document embeddings for:", documentId);

    // Chunk the text into smaller pieces
    const chunks = chunkText(text, 1000); // Limit to ~1000 tokens per chunk
    console.log(`Created ${chunks.length} chunks for embedding`);

    const embeddingPromises = chunks.map(async (chunk, index) => {
      try {
        const embedding = await createEmbedding(chunk);

        // Convert embedding array to PostgreSQL vector format
        const vectorString = `[${embedding.join(",")}]`;

        return {
          document_id: documentId,
          content_chunk: chunk,
          chunk_index: index,
          chunk_type: "text",
          chunk_metadata: {
            token_count: Math.ceil(chunk.length / 4), // Rough token estimate
            chunk_length: chunk.length,
          },
          embedding: vectorString,
          tokens_count: Math.ceil(chunk.length / 4),
        };
      } catch (error) {
        console.error(`Error creating embedding for chunk ${index}:`, error);
        throw error;
      }
    });

    // Process embeddings in batches to avoid overwhelming the API
    const batchSize = 5;
    const embeddingResults = [];

    for (let i = 0; i < embeddingPromises.length; i += batchSize) {
      const batch = embeddingPromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      embeddingResults.push(...batchResults);

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < embeddingPromises.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Insert all embeddings into the database
    const { error } = await supabase
      .from("document_embeddings")
      .insert(embeddingResults);

    if (error) {
      console.error("Error inserting embeddings:", error);
      throw new Error(`Failed to insert embeddings: ${error.message}`);
    }

    console.log(
      `Successfully created ${embeddingResults.length} embeddings for document:`,
      documentId
    );
  } catch (error) {
    console.error("Error creating document embeddings:", error);
    throw error;
  }
};

export const documentQueries = {
  // Get all documents for a user
  getUserDocuments: async (userId: string): Promise<Document[]> => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserDocuments:", error);
      return [];
    }
  },

  // Get user statistics
  getUserStats: async (userId: string): Promise<DocumentStats | null> => {
    try {
      // Get user data from users table using maybeSingle to handle case where user doesn't exist
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("document_count, storage_used_mb")
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user data:", userError);
        return null;
      }

      // If user doesn't exist in users table, return default stats
      if (!userData) {
        return {
          totalDocuments: 0,
          processedDocuments: 0,
          storageUsedMB: 0,
        };
      }

      // Get processed documents count
      const { count: processedCount, error: processedError } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("ocr_status", "completed");

      if (processedError) {
        console.error("Error fetching processed count:", processedError);
        return {
          totalDocuments: userData.document_count || 0,
          processedDocuments: 0,
          storageUsedMB: userData.storage_used_mb || 0,
        };
      }

      return {
        totalDocuments: userData.document_count || 0,
        processedDocuments: processedCount || 0,
        storageUsedMB: userData.storage_used_mb || 0,
      };
    } catch (error) {
      console.error("Error in getUserStats:", error);
      return null;
    }
  },

  // Create a new document
  createDocument: async (
    documentData: DocumentInsert
  ): Promise<Document | null> => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();

      if (error) {
        console.error("Error creating document:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in createDocument:", error);
      return null;
    }
  },

  // Update a document
  updateDocument: async (
    documentId: string,
    updates: DocumentUpdate
  ): Promise<Document | null> => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", documentId)
        .select()
        .single();

      if (error) {
        console.error("Error updating document:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in updateDocument:", error);
      return null;
    }
  },

  // Delete a document
  deleteDocument: async (documentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) {
        console.error("Error deleting document:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteDocument:", error);
      return false;
    }
  },

  // Upload file to storage
  uploadFileToStorage: async (
    file: File | Blob,
    fileName: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (error) {
        console.error("Error uploading file:", error);
        return null;
      }

      return data.path;
    } catch (error) {
      console.error("Error in uploadFileToStorage:", error);
      return null;
    }
  },

  // Enhanced upload with processing
  uploadAndProcessDocument: async (
    file: File | Blob,
    userId: string,
    filename: string,
    userEmail?: string
  ): Promise<Document | null> => {
    try {
      console.log("Starting upload and process for user:", userId);

      // Critical: Ensure user profile exists before proceeding
      if (!userEmail) {
        // Try to get email from current session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        userEmail = session?.user?.email || "unknown@example.com";
      }

      console.log("Ensuring user profile exists...");
      const userProfile = await authQueries.getOrCreateUserProfile(
        userId,
        userEmail
      );

      if (!userProfile) {
        const errorMsg =
          "Failed to create or access user profile. Please try signing out and signing back in.";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log("User profile confirmed:", userProfile.email);

      const fileExt = filename.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      console.log("Uploading file to storage...");
      const uploadPath = await documentQueries.uploadFileToStorage(
        file,
        fileName
      );
      if (!uploadPath) {
        throw new Error("Failed to upload file to storage");
      }

      console.log("File uploaded to storage:", uploadPath);

      // Create document record
      const documentData: DocumentInsert = {
        user_id: userId,
        filename: filename,
        original_filename: filename,
        file_type: fileExt || "unknown",
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        supabase_storage_path: fileName,
        ocr_status: "processing",
        uploaded_at: new Date().toISOString(),
      };

      console.log("Creating document record...");
      const newDocument = await documentQueries.createDocument(documentData);
      if (!newDocument) {
        // Clean up uploaded file if document creation fails
        await supabase.storage.from("documents").remove([fileName]);
        throw new Error("Failed to create document record");
      }

      console.log("Document record created:", newDocument.id);

      // Update user stats
      console.log("Updating user stats...");
      const statsUpdated = await documentQueries.updateUserStats(
        userId,
        file.size
      );
      if (!statsUpdated) {
        console.warn("Failed to update user stats, but continuing...");
      }

      // Process document asynchronously
      console.log("Starting background processing...");
      processDocumentWithOCR(newDocument.id, fileName).catch((error) => {
        console.error("Background processing failed:", error);
      });

      return newDocument;
    } catch (error) {
      console.error("Error in uploadAndProcessDocument:", error);
      return null;
    }
  },

  // Increment user document count and storage
  updateUserStats: async (
    userId: string,
    documentSizeBytes: number
  ): Promise<boolean> => {
    try {
      // Convert to KB and round to integer to avoid decimal issues
      const sizeKB = Math.round(documentSizeBytes / 1024);
      const sizeToAdd = Math.max(sizeKB, 1); // Ensure at least 1 KB is added

      // Get current stats
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("document_count, storage_used_mb")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error("Error fetching current user stats:", fetchError);
        return false;
      }

      // Convert current storage from MB to KB, add new size, then back to MB as integer
      const currentStorageKB = Math.round(
        (currentUser.storage_used_mb || 0) * 1024
      );
      const newStorageKB = currentStorageKB + sizeToAdd;
      const newStorageMB = Math.round(newStorageKB / 1024); // Round to whole MB

      const { error: updateError } = await supabase
        .from("users")
        .update({
          document_count: (currentUser.document_count || 0) + 1,
          storage_used_mb: newStorageMB,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating user stats:", updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updateUserStats:", error);
      return false;
    }
  },

  // Search documents by similarity
  searchDocumentsByEmbedding: async (
    query: string,
    userId: string,
    limit: number = 10
  ): Promise<{
    documents: Document[];
    chunks: DocumentEmbedding[];
    similarities: number[];
  }> => {
    try {
      // Create embedding for the query
      const queryEmbedding = await createEmbedding(query);

      // Search for similar document chunks using cosine similarity
      // Use any cast for the RPC function since it's not in the generated types
      const { data: similarChunks, error } = await (supabase as any).rpc(
        "search_document_embeddings",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: limit,
          user_id: userId,
        }
      );

      if (error) {
        console.error("Error searching embeddings:", error);
        return { documents: [], chunks: [], similarities: [] };
      }

      const searchResults = (similarChunks as SearchResult[]) || [];

      // Get the unique document IDs
      const documentIds = [
        ...new Set(searchResults.map((chunk) => chunk.document_id)),
      ];

      // Fetch the actual documents
      const { data: documents, error: docError } = await supabase
        .from("documents")
        .select("*")
        .in("id", documentIds);

      if (docError) {
        console.error("Error fetching documents:", docError);
        return {
          documents: [],
          chunks: searchResults as any,
          similarities: [],
        };
      }

      return {
        documents: documents || [],
        chunks: searchResults as any,
        similarities: searchResults.map((chunk) => chunk.similarity),
      };
    } catch (error) {
      console.error("Error in searchDocumentsByEmbedding:", error);
      return { documents: [], chunks: [], similarities: [] };
    }
  },

  // Reprocess document (for failed processing)
  reprocessDocument: async (documentId: string): Promise<boolean> => {
    try {
      // Get document details
      const { data: document, error } = await supabase
        .from("documents")
        .select("supabase_storage_path")
        .eq("id", documentId)
        .single();

      if (error || !document) {
        console.error("Error fetching document for reprocessing:", error);
        return false;
      }

      // Update status to processing
      await supabase
        .from("documents")
        .update({ ocr_status: "processing" })
        .eq("id", documentId);

      // Process the document
      return await processDocumentWithOCR(
        documentId,
        document.supabase_storage_path
      );
    } catch (error) {
      console.error("Error in reprocessDocument:", error);
      return false;
    }
  },
};
