import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
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

// Check if we have an API key directly from environment (fallback)
const envApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// Use environment variable or config for API key
const hardcodedApiKey = process.env.OPENAI_API_KEY || "";

// Use the first available key
const finalApiKey = config.openai.apiKey || envApiKey || hardcodedApiKey;

const openai = new OpenAI({
  apiKey: finalApiKey,
  dangerouslyAllowBrowser: true, // Required for React Native
});

// Helper function to chunk text using LangChain
const chunkText = async (
  text: string,
  maxTokens: number = 500, // Smaller default chunk size (was 1000)
  overlap: number = 200
): Promise<string[]> => {
  try {
    console.log(
      "Using LangChain RecursiveCharacterTextSplitter for chunking with increased overlap"
    );

    // Use LangChain's RecursiveCharacterTextSplitter with increased overlap
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: maxTokens * 4, // Approximate character count (4 chars ≈ 1 token)
      chunkOverlap: overlap * 4, // Increased overlap in characters
      separators: ["\n\n", "\n", ". ", "! ", "? ", ";", ":", " ", ""], // Order matters
    });

    const langChainChunks = await splitter.splitText(text);

    // Verify chunks aren't too large
    const maxChunkLength = maxTokens * 5; // A bit larger than expected to allow some flexibility
    const finalChunks: string[] = [];

    // Process any chunks that are still too large
    for (const chunk of langChainChunks) {
      if (chunk.length <= maxChunkLength) {
        finalChunks.push(chunk);
      } else {
        // For large chunks, split again with higher overlap
        const subSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: (maxTokens / 2) * 4, // Smaller chunk size
          chunkOverlap: (overlap / 2) * 4, // Higher proportional overlap
          separators: ["\n", ". ", "! ", "? ", ";", ":", " ", ""],
        });

        try {
          const subChunks = await subSplitter.splitText(chunk);
          finalChunks.push(...subChunks);
        } catch (subError) {
          // If subsplitting fails, use character-based chunking as fallback
          console.warn(
            "SubSplitter failed, using character chunking",
            subError
          );

          // Manual character-based chunking with overlap
          const subChunkSize = Math.floor(maxTokens * 3); // ~75% of max tokens
          const subOverlap = Math.floor(overlap * 2); // Double the overlap

          for (let i = 0; i < chunk.length; i += subChunkSize - subOverlap) {
            const subChunk = chunk.substring(
              i,
              Math.min(i + subChunkSize, chunk.length)
            );
            if (subChunk.trim().length > 0) {
              finalChunks.push(subChunk);
            }
          }
        }
      }
    }

    console.log(
      `Created ${finalChunks.length} chunks with LangChain with increased overlap`
    );
    return finalChunks;
  } catch (error) {
    console.error("Error in LangChain text chunking:", error);

    // Fallback to enhanced manual chunking with improved overlap
    console.log(
      "Falling back to enhanced manual chunking method with increased overlap"
    );

    // Try paragraph-based chunking first
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    if (paragraphs.length > 3) {
      console.log(
        `Using ${paragraphs.length} paragraphs as basis for chunking`
      );
      const chunks: string[] = [];
      const maxParagraphLength = maxTokens * 4; // Approximate character count
      const overlapChars = overlap * 4;

      for (const paragraph of paragraphs) {
        if (paragraph.length <= maxParagraphLength) {
          chunks.push(paragraph);
        } else {
          // Split long paragraphs with overlap
          let startIdx = 0;
          while (startIdx < paragraph.length) {
            const endIdx = Math.min(
              startIdx + maxParagraphLength,
              paragraph.length
            );
            chunks.push(paragraph.substring(startIdx, endIdx));
            startIdx += maxParagraphLength - overlapChars;
          }
        }
      }

      console.log(
        `Created ${chunks.length} paragraph-based chunks with overlap`
      );
      return chunks;
    }

    // If not enough paragraphs, use sentence-based chunking
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const chunks: string[] = [];

    if (sentences.length > 0) {
      // Enhanced overlap mechanism - sliding window of sentences
      const sentencesPerChunk = Math.max(3, Math.floor(maxTokens / 100)); // Rough estimate of sentences per chunk
      const overlapSentences = Math.max(1, Math.floor(sentencesPerChunk * 0.4)); // 40% overlap

      for (
        let i = 0;
        i < sentences.length;
        i += sentencesPerChunk - overlapSentences
      ) {
        const endIdx = Math.min(i + sentencesPerChunk, sentences.length);
        const chunkSentences = sentences.slice(i, endIdx);

        if (chunkSentences.length > 0) {
          const chunk = chunkSentences.join(". ") + ".";
          chunks.push(chunk.trim());
        }

        // Break if we've processed all sentences
        if (endIdx >= sentences.length) break;
      }

      console.log(
        `Created ${chunks.length} sentence-based chunks with enhanced overlap`
      );
      return chunks;
    }

    // Last resort: character-based chunking
    const charChunks: string[] = [];
    const chunkSize = maxTokens * 4; // Chars per chunk
    const charOverlap = overlap * 4; // Chars of overlap

    for (let i = 0; i < text.length; i += chunkSize - charOverlap) {
      const chunk = text.substring(i, Math.min(i + chunkSize, text.length));
      if (chunk.trim().length > 0) {
        charChunks.push(chunk);
      }
    }

    console.log(
      `Created ${charChunks.length} character-based chunks with overlap`
    );
    return charChunks;
  }
};

// Helper function to create embeddings using LangChain
const createEmbedding = async (text: string): Promise<number[]> => {
  try {
    if (!config.openai.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("No text provided for embedding");
    }

    console.log(
      "Creating embedding with LangChain for text length:",
      text.length
    );

    // Create LangChain OpenAIEmbeddings instance with the configured API key
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai.apiKey,
      modelName: "text-embedding-3-small",
      dimensions: 1536, // Specify dimensions for the embedding model
    });

    // Generate embedding using LangChain
    const embedding = await embeddings.embedQuery(text.trim());

    if (!embedding || embedding.length === 0) {
      throw new Error(
        "Invalid embedding received from LangChain OpenAIEmbeddings"
      );
    }

    console.log(
      "LangChain embedding created successfully with dimension:",
      embedding.length
    );
    return embedding;
  } catch (error) {
    console.error("Error creating embedding with LangChain:", error);

    // If LangChain fails, fall back to direct OpenAI API call
    try {
      console.log("Falling back to direct OpenAI API call for embedding");

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.trim(),
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No embedding data received from OpenAI fallback");
      }

      const embedding = response.data[0].embedding;
      if (!embedding || embedding.length === 0) {
        throw new Error("Invalid embedding received from OpenAI fallback");
      }

      console.log(
        "Fallback embedding created successfully with dimension:",
        embedding.length
      );
      return embedding;
    } catch (fallbackError) {
      console.error("Error in fallback embedding:", fallbackError);
      throw fallbackError;
    }
  }
};

// Enhanced logging function with formatted output
const logProcessingStep = (
  documentId: string,
  step: string,
  message: string,
  data?: any
) => {
  const timestamp = new Date().toISOString();
  console.log("\n" + "=".repeat(80));
  console.log(`📄 DOCUMENT PROCESSING [${timestamp}]`);
  console.log(`📋 Document ID: ${documentId}`);
  console.log(`🔄 Step: ${step}`);
  console.log(`📝 ${message}`);
  if (data) {
    console.log(
      "📊 Data:",
      typeof data === "object" ? JSON.stringify(data, null, 2) : data
    );
  }
  console.log("=".repeat(80) + "\n");
};

// Extract text from document using Eden AI
const extractTextFromDocument = async (
  documentId: string,
  storagePath: string,
  mimeType: string
): Promise<{
  text: string;
  confidence: number;
  entities: Array<{
    description?: string;
    score?: number;
    topicality?: number;
    text?: string;
    boundingBox?: any;
    confidence?: number;
  }>;
  fullResponse: any;
}> => {
  try {
    logProcessingStep(
      documentId,
      "TEXT EXTRACTION",
      `Starting text extraction for document: ${documentId}`,
      { storagePath, mimeType }
    );

    // First check if Eden AI is configured
    let useEdenAI = !!config.edenAI.apiKey;

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (fileError || !fileData) {
      throw new Error(`Failed to download file: ${fileError?.message}`);
    }

    // Validate file data is not empty
    if (fileData.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    console.log(
      `File downloaded successfully: ${fileData.size} bytes, type: ${fileData.type || mimeType}`
    );

    // Generate a signed URL that expires in 1 hour for security
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 60 * 60); // Expires in 1 hour (60 * 60 seconds)

    if (signedUrlError || !signedUrlData || !signedUrlData.signedUrl) {
      throw new Error(
        `Failed to generate signed URL: ${signedUrlError?.message || "No URL returned"}`
      );
    }

    const fileUrl = signedUrlData.signedUrl;
    console.log(`Using signed URL for OCR (expires in 1 hour): ${fileUrl}`);

    // Create request body with file_url
    const requestBody = {
      providers: ["microsoft"], // Use Microsoft OCR
      language: "en",
      file_url: fileUrl,
      // Additional parameters for better text extraction
      text_detection_mode: "accurate", // Use accurate mode for better results
      preserve_layout: true, // Preserve document layout
      extract_tables: true, // Extract tables
      extract_figures: true, // Extract figures and diagrams
      extract_headers: true, // Extract headers and footers
      extract_footnotes: true, // Extract footnotes
      extract_metadata: true, // Extract document metadata
    };

    console.log(`API endpoint: ${config.edenAI.ocrAsyncEndpoint}`);
    console.log(`Using signed URL approach with multiple providers for OCR`);
    console.log(
      `File type: ${mimeType}, method: secure signed URL from storage (expires in 1 hour)`
    );

    // Call Eden AI OCR Async
    const response = await fetch(config.edenAI.ocrAsyncEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.edenAI.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Eden AI OCR Async failed with status ${response.status}:`,
        errorData
      );
      throw new Error(
        `Eden AI OCR Async error (${response.status}): ${errorData}`
      );
    }

    const responseData = await response.json();
    console.log("Eden AI OCR Async job submitted successfully");

    // For async OCR, we get a job_id and need to poll for results
    if (responseData.public_id) {
      console.log(
        `Polling for OCR results with job ID: ${responseData.public_id}`
      );
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 5 minutes (30 * 10 seconds)

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

        try {
          const resultResponse = await fetch(
            `${config.edenAI.ocrAsyncResultEndpoint}/${responseData.public_id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${config.edenAI.apiKey}`,
              },
            }
          );

          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            console.log(
              `OCR job status: ${resultData.status} (attempt ${attempts + 1})`
            );

            // Check if processing is complete
            if (resultData.status === "finished") {
              console.log("OCR processing completed");

              // Extract text from Microsoft results
              let rawExtractedText = "";
              let confidence = 0.5;
              let entities: any[] = [];

              // Process the Microsoft OCR results
              if (resultData.results && resultData.results.microsoft) {
                const microsoftResult = resultData.results.microsoft;
                console.log("Processing Microsoft OCR results");

                // Get ALL text from Microsoft's response
                const allTextParts: string[] = [];

                if (
                  microsoftResult.raw_text &&
                  microsoftResult.raw_text.trim().length > 0
                ) {
                  console.log("Adding Microsoft's raw_text");
                  allTextParts.push(microsoftResult.raw_text);
                }

                if (microsoftResult.data?.text) {
                  console.log("Adding Microsoft's structured text");
                  allTextParts.push(microsoftResult.data.text);
                }

                if (microsoftResult.data?.texts) {
                  console.log("Adding Microsoft's text array");
                  const textsArray = microsoftResult.data.texts
                    .map(
                      (textObj: any) =>
                        textObj.text || textObj.content || textObj
                    )
                    .filter((text: string) => text && text.trim().length > 0);
                  allTextParts.push(...textsArray);
                }

                // Add tables if available
                if (microsoftResult.data?.tables) {
                  console.log("Adding Microsoft's tables");
                  const tablesText = microsoftResult.data.tables
                    .map((table: any) => {
                      if (Array.isArray(table)) {
                        return table
                          .map((row) =>
                            Array.isArray(row)
                              ? row.join("\t")
                              : JSON.stringify(row)
                          )
                          .join("\n");
                      }
                      return JSON.stringify(table);
                    })
                    .join("\n\n");
                  allTextParts.push(tablesText);
                }

                // Add metadata if available
                if (microsoftResult.data?.metadata) {
                  console.log("Adding Microsoft's metadata");
                  allTextParts.push(
                    JSON.stringify(microsoftResult.data.metadata, null, 2)
                  );
                }

                // Combine all text parts
                rawExtractedText = allTextParts
                  .filter((text) => text && text.trim().length > 0)
                  .join("\n\n");

                confidence = microsoftResult.confidence || 0.8;

                // Extract entities if available
                if (microsoftResult.data?.entities) {
                  entities = microsoftResult.data.entities.map(
                    (entity: any) => ({
                      text: entity.value || entity.text,
                      description: entity.label || entity.type,
                      confidence: entity.confidence || 0.5,
                      boundingBox: entity.boundingBox,
                    })
                  );
                }
              }

              // Final fallback if no text was extracted
              if (!rawExtractedText || rawExtractedText.trim().length === 0) {
                rawExtractedText =
                  "No text could be extracted from the document. The document might be image-based, have security restrictions, or be in an unsupported format.";
                console.warn("No text was extracted from document");
              }

              console.log(
                `Successfully extracted ${rawExtractedText.length} characters of raw text`
              );

              // Now use GPT to stitch the text together properly
              let finalProcessedText = rawExtractedText;

              if (rawExtractedText.length > 50) {
                // Only process if we have meaningful text
                try {
                  console.log("Processing text with GPT to stitch together...");

                  const stitchingPrompt = `
You are a text formatting expert. Your task is to convert raw OCR output into clean, readable English text while preserving EVERY SINGLE WORD and piece of information.

CRITICAL REQUIREMENTS:
- PRESERVE ALL TEXT: Every word, number, symbol, and character from the raw OCR must appear in your output
- DO NOT remove, omit, skip, or delete ANY content whatsoever
- DO NOT summarize, condense, or shorten anything
- DO NOT paraphrase or change the meaning
- Your job is ONLY to clean up and organize the existing text

WHAT YOU SHOULD DO:
- Simply present all the raw OCR text in clean, readable English format
- Fix obvious OCR scanning errors (like "teh" -> "the", "rn" -> "m", etc.)
- Add proper punctuation and paragraph breaks where needed
- Organize the text into readable sentences and paragraphs
- Maintain the exact same information density and detail level
- Present the content as simple, clear English text (NOT as a story or narrative)

WHAT YOU MUST NOT DO:
- Remove any information, no matter how repetitive or lengthy
- Summarize or compress any sections
- Skip over any details, names, numbers, or data
- Change the original structure or sequence significantly
- Add your own interpretations or explanations

RAW OCR TEXT:
${rawExtractedText}

Please provide the complete formatted text that contains EVERY piece of information from the raw OCR, simply presented as clean, readable English text:`;
                  const response = await openai.chat.completions.create({
                    model: "gpt-4-0125-preview",
                    messages: [{ role: "user", content: stitchingPrompt }],
                    max_tokens: 4000,
                    temperature: 0.1,
                  });

                  const stitchedText =
                    response.choices[0]?.message?.content?.trim();

                  if (stitchedText && stitchedText.length > 0) {
                    finalProcessedText = stitchedText;
                    console.log(
                      `GPT processing successful. Final text length: ${finalProcessedText.length}`
                    );
                  } else {
                    console.warn("GPT processing failed, using raw text");
                  }
                } catch (gptError) {
                  console.error("Error processing text with GPT:", gptError);
                  console.log("Using raw extracted text as fallback");
                }
              }

              // Update document with processed text
              const { error: updateError } = await supabase
                .from("documents")
                .update({
                  ocr_status: "completed",
                  processed_at: new Date().toISOString(),
                  processed_text: finalProcessedText,
                  ocr_confidence_score: confidence,
                })
                .eq("id", documentId);

              if (updateError) {
                console.error(
                  "Error updating document with processed text:",
                  updateError
                );
              } else {
                console.log(
                  "Document updated successfully, starting chunking and embedding..."
                );

                // Create embeddings for the processed text
                try {
                  await createDocumentEmbeddings(
                    documentId,
                    finalProcessedText,
                    null // No structured data needed since we're using the full text
                  );
                  console.log("Document embeddings created successfully");
                } catch (embeddingError) {
                  console.error("Error creating embeddings:", embeddingError);
                  // Don't fail the whole process if embeddings fail
                }
              }

              return {
                text: finalProcessedText,
                confidence: confidence,
                entities: entities,
                fullResponse: resultData,
              };
            } else if (resultData.status === "failed") {
              console.error(
                "OCR processing failed:",
                resultData.error || "Unknown error"
              );
              throw new Error(
                `OCR processing failed: ${resultData.error || "Unknown error"}`
              );
            }
          } else {
            console.error(
              `Error polling OCR results: ${resultResponse.status}`
            );
          }
        } catch (pollError) {
          console.error("Error polling for OCR results:", pollError);
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error(
          "OCR processing timeout - results not available within 5 minutes"
        );
      }
    } else {
      throw new Error("No job ID returned from OCR async endpoint");
    }
  } catch (error) {
    console.error("Error extracting text:", error);
    throw new Error(
      `Unexpected error during text extraction: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Add explicit return statement as a fallback for TypeScript
  return {
    text: "",
    confidence: 0,
    entities: [],
    fullResponse: { error: "Function reached end without returning" },
  };
};

// Format storage size helper function
const formatStorageSize = (sizeInMB: number): number => {
  return Math.round(sizeInMB * 10) / 10; // Round to 1 decimal place
};

// Export documentQueries object
export const documentQueries = {
  // Get all documents for a user
  getUserDocuments: async (userId: string): Promise<Document[]> => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching user documents:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserDocuments:", error);
      return [];
    }
  },

  // Get a single document by ID
  getDocument: async (documentId: string): Promise<Document | null> => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) {
        console.error("Error fetching document:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getDocument:", error);
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
      // First, get the document to determine file size and user ID
      const { data: document, error: getError } = await supabase
        .from("documents")
        .select("user_id, file_size_bytes, supabase_storage_path")
        .eq("id", documentId)
        .single();

      if (getError || !document) {
        console.error("Error fetching document for deletion:", getError);
        return false;
      }

      // Delete the document from the database
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) {
        console.error("Error deleting document:", error);
        return false;
      }

      // Delete associated embeddings
      const { error: embeddingError } = await supabase
        .from("document_embeddings")
        .delete()
        .eq("document_id", documentId);

      if (embeddingError) {
        console.warn("Error deleting document embeddings:", embeddingError);
        // Continue anyway, as this is not critical
      }

      // Try to delete the file from storage
      if (document.supabase_storage_path) {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove([document.supabase_storage_path]);

        if (storageError) {
          console.warn("Error deleting document from storage:", storageError);
          // Continue anyway, as this is not critical
        }
      }

      // Update user stats to reflect the deletion
      if (document.user_id) {
        await updateUserStatsAfterDeletion(
          document.user_id,
          document.file_size_bytes || 0
        );
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
    file:
      | File
      | Blob
      | { uri: string; name: string; type: string; size: number },
    userId: string,
    filename: string,
    userEmail?: string,
    documentType?: string
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

      // Log document type if provided
      if (documentType) {
        console.log(`Document type provided by user: ${documentType}`);
      }

      const fileExt = filename.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      let uploadPath: string | null = null;

      // Check if this is a React Native file object with URI
      if ("uri" in file && typeof file.uri === "string") {
        console.log("Handling React Native file upload with URI:", file.uri);

        try {
          // For React Native on mobile, file.uri is a local file path
          // We may need to use different strategies depending on the platform and environment

          // Try using fetch if the URI is accessible via HTTP/HTTPS
          if (file.uri.startsWith("http")) {
            const fetchResponse = await fetch(file.uri);
            const blob = await fetchResponse.blob();

            // Upload the blob to Supabase Storage
            console.log("Uploading blob from HTTP URI...");
            const { data: uploadData, error: uploadError } =
              await supabase.storage.from("documents").upload(fileName, blob);

            if (uploadError) {
              throw uploadError;
            }
            uploadPath = uploadData.path;
          }
          // For file:// URIs or other local paths, we might need to use a different approach
          // This might require a native module or specific platform handling
          // For example, on React Native Expo, we might use FileSystem.readAsStringAsync
          else {
            // For this implementation, we're converting the file object directly
            // This works if the server is handling the mobile file object correctly
            console.log("Uploading from local file URI...");

            // Create a FormData and send that to Supabase
            const formData = new FormData();
            formData.append("file", file as any);

            const { data, error } = await supabase.storage
              .from("documents")
              .upload(fileName, formData, {
                contentType: file.type,
              });

            if (error) {
              console.error("Error uploading file from URI:", error);
              throw error;
            }

            uploadPath = data.path;
          }
        } catch (error: any) {
          console.error("Error handling React Native file upload:", error);
          throw new Error(
            `Failed to upload file from URI: ${error?.message || String(error)}`
          );
        }

        if (!uploadPath) {
          throw new Error("Failed to upload file from URI to storage");
        }

        console.log("File uploaded to storage from URI:", uploadPath);
      } else {
        // Handle regular File/Blob upload for web
        console.log("Uploading file to storage...");
        const { data: uploadData2, error: uploadError2 } =
          await supabase.storage
            .from("documents")
            .upload(fileName, file as File | Blob);

        if (uploadError2) {
          throw uploadError2;
        }
        uploadPath = uploadData2.path;
        if (!uploadPath) {
          throw new Error("Failed to upload file to storage");
        }

        console.log("File uploaded to storage:", uploadPath);
      }

      // Create document record
      const documentData: DocumentInsert = {
        user_id: userId,
        filename: filename,
        original_filename: filename,
        file_type: fileExt || "unknown",
        mime_type:
          "type" in file
            ? file.type
            : (file as File | Blob).type || "application/octet-stream",
        file_size_bytes:
          "size" in file ? file.size : (file as File | Blob).size,
        supabase_storage_path: fileName,
        ocr_status: "pending",
        uploaded_at: new Date().toISOString(),
        document_type: documentType || null, // Add user-provided document type
      };

      console.log("Creating document record...");
      const { data: newDocument, error: createError } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();

      if (createError || !newDocument) {
        // Clean up uploaded file if document creation fails
        await supabase.storage.from("documents").remove([fileName]);
        throw new Error("Failed to create document record");
      }

      console.log("Document record created:", newDocument.id);

      // Update user stats
      console.log("Updating user stats...");
      // Update user stats inline
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("document_count, storage_used_mb")
          .eq("id", userId)
          .single();

        if (!userError && userData) {
          const fileSize =
            "size" in file ? file.size : (file as File | Blob).size;
          const newDocCount = Math.floor((userData.document_count || 0) + 1);
          const currentStorageMB = parseFloat(
            String(userData.storage_used_mb || 0)
          );
          const additionalStorageMB = fileSize / (1024 * 1024);
          const newStorageUsed =
            Math.round((currentStorageMB + additionalStorageMB) * 10) / 10;

          await supabase
            .from("users")
            .update({
              document_count: newDocCount,
              storage_used_mb: newStorageUsed,
            })
            .eq("id", userId);
        }
      } catch (statsError) {
        console.warn("Failed to update user stats:", statsError);
      }

      // Process document asynchronously
      console.log("Starting background processing...");
      extractTextFromDocument(
        newDocument.id,
        fileName,
        documentData.mime_type
      ).catch((error: Error) => {
        console.error("Background processing failed:", error);
      });

      return newDocument;
    } catch (error) {
      console.error("Error in uploadAndProcessDocument:", error);
      return null;
    }
  },

  // Get user document statistics
  getUserStats: async (userId: string): Promise<DocumentStats | null> => {
    try {
      // Get user record first
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("document_count, storage_used_mb")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user stats:", userError);
        return null;
      }

      // Count processed documents (including both completed and fallback)
      const { count: processedCount, error: countError } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("ocr_status", ["completed", "fallback"]);

      if (countError) {
        console.error("Error counting processed documents:", countError);
        // Continue with partial data
      }

      return {
        totalDocuments: userData.document_count || 0,
        processedDocuments: processedCount || 0,
        storageUsedMB: formatStorageSize(userData.storage_used_mb || 0),
      };
    } catch (error) {
      console.error("Error in getUserStats:", error);
      return null;
    }
  },

  // Update user document stats - fixed to handle numeric storage properly
  updateUserStats: async (
    userId: string,
    newFileSize: number
  ): Promise<boolean> => {
    try {
      // Get current user stats
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("document_count, storage_used_mb")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user stats:", userError);
        return false;
      }

      // Update document count
      const newDocCount = Math.floor((userData.document_count || 0) + 1);

      // Convert bytes to MB with proper precision and ensure numeric type
      const currentStorageMB = parseFloat(
        String(userData.storage_used_mb || 0)
      );
      const additionalStorageMB = newFileSize / (1024 * 1024);

      // Calculate new storage with one decimal place precision
      const rawNewStorage = currentStorageMB + additionalStorageMB;
      const newStorageUsed = Math.round(rawNewStorage * 10) / 10; // Round to 1 decimal place

      console.log("Updating user stats with:", {
        currentStorageMB,
        additionalStorageMB,
        rawNewStorage,
        newStorageUsed,
        newDocCount,
      });

      const { error: updateError } = await supabase
        .from("users")
        .update({
          document_count: newDocCount,
          storage_used_mb: newStorageUsed,
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

  // Search documents by similarity with improved relevance
  searchDocumentsByEmbedding: async (
    query: string,
    userId: string,
    limit: number = 10,
    options: {
      documentType?: string;
      minThreshold?: number;
      includeContext?: boolean;
    } = {}
  ): Promise<{
    documents: Document[];
    chunks: DocumentEmbedding[];
    similarities: number[];
  }> => {
    try {
      // Create embedding for the query
      const queryEmbedding = await createEmbedding(query);

      // Set dynamic threshold based on query complexity
      const defaultThreshold = options.minThreshold || 0.65; // Lower from 0.7 for better recall

      // Search for similar document chunks using cosine similarity
      const { data: similarChunks, error } = await (supabase as any).rpc(
        "search_document_embeddings",
        {
          query_embedding: queryEmbedding,
          match_threshold: defaultThreshold,
          match_count: limit * 2, // Get more candidates for filtering
          user_id: userId,
        }
      );

      if (error) {
        console.error("Error searching embeddings:", error);
        return { documents: [], chunks: [], similarities: [] };
      }

      const searchResults = (similarChunks as SearchResult[]) || [];

      // Filter by document type if specified
      let filteredResults = searchResults;
      if (options.documentType) {
        filteredResults = searchResults.filter((result) => {
          const metadata = result.chunk_metadata || {};
          return metadata.document_type === options.documentType;
        });

        // If no results after filtering, fall back to original results
        if (filteredResults.length === 0) {
          filteredResults = searchResults;
        }
      }

      // Apply a smarter ranking that considers both similarity and importance
      const rankedResults = rankSearchResults(filteredResults);

      // Limit to requested number after ranking
      const finalResults = rankedResults.slice(0, limit);

      // Get the unique document IDs
      const documentIds = [
        ...new Set(finalResults.map((chunk) => chunk.document_id)),
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
          chunks: finalResults as any,
          similarities: [],
        };
      }

      return {
        documents: documents || [],
        chunks: finalResults as any,
        similarities: finalResults.map((chunk) => chunk.similarity),
      };
    } catch (error) {
      console.error("Error in searchDocumentsByEmbedding:", error);
      return { documents: [], chunks: [], similarities: [] };
    }
  },

  // Search documents wrapper that prompts for document type
  searchDocuments: async (
    query: string,
    userId: string,
    options: {
      documentType?: string;
      limit?: number;
      minThreshold?: number;
    } = {}
  ): Promise<{
    documents: Document[];
    chunks: DocumentEmbedding[];
    similarities: number[];
  }> => {
    const limit = options.limit || 10;

    return documentQueries.searchDocumentsByEmbedding(query, userId, limit, {
      documentType: options.documentType,
      minThreshold: options.minThreshold || 0.65,
      includeContext: true,
    });
  },

  // Retry failed document processing
  retryDocumentProcessing: async (documentId: string): Promise<boolean> => {
    try {
      logProcessingStep(
        documentId,
        "RETRY INITIATED",
        "Starting document processing retry",
        { documentId }
      );

      // Get the document
      const { data: document, error: docError } = await supabase
        .from("documents")
        .select("supabase_storage_path, mime_type")
        .eq("id", documentId)
        .single();

      if (docError || !document) {
        logProcessingStep(
          documentId,
          "RETRY ERROR",
          "Error fetching document for retry",
          { error: docError ? docError.message : "Document not found" }
        );
        return false;
      }

      // Update status to pending
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          ocr_status: "pending",
        })
        .eq("id", documentId);

      if (updateError) {
        logProcessingStep(
          documentId,
          "RETRY ERROR",
          "Error updating document status for retry",
          { error: updateError.message }
        );
        return false;
      }

      // Re-process the document
      logProcessingStep(
        documentId,
        "RETRY EXTRACTION",
        "Starting document extraction process"
      );

      extractTextFromDocument(
        documentId,
        document.supabase_storage_path,
        document.mime_type
      ).catch((error: Error) => {
        logProcessingStep(
          documentId,
          "RETRY FAILED",
          "Retry processing failed during extraction",
          { error: error.message }
        );
      });

      return true;
    } catch (error) {
      console.error("Error in retryDocumentProcessing:", error);
      return false;
    }
  },
};

// Helper function to update user stats after document deletion - fixed for numeric storage
const updateUserStatsAfterDeletion = async (
  userId: string,
  fileSizeBytes: number
): Promise<boolean> => {
  try {
    // Get current user stats
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("document_count, storage_used_mb")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error(
        "Error fetching user stats for deletion update:",
        userError
      );
      return false;
    }

    // Calculate new values
    // Ensure document_count never goes below 0
    const newDocCount = Math.max(0, (userData.document_count || 1) - 1);

    // Convert file size from bytes to MB with better precision
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    // Ensure storage_used_mb never goes below 0
    // Parse as float to ensure it's a numeric type for the database
    const currentStorageMB = parseFloat(String(userData.storage_used_mb || 0));

    // Calculate new storage with one decimal place precision
    const newStorageUsed = Math.max(
      0,
      Math.round((currentStorageMB - fileSizeMB) * 10) / 10
    );

    console.log("Updating user stats after deletion:", {
      currentDocCount: userData.document_count,
      newDocCount,
      currentStorageMB,
      fileSizeMB,
      newStorageUsed,
    });

    // Update the user record
    const { error: updateError } = await supabase
      .from("users")
      .update({
        document_count: newDocCount,
        storage_used_mb: newStorageUsed,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user stats after deletion:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateUserStatsAfterDeletion:", error);
    return false;
  }
};

// Helper function to rank search results with weighted scoring
const rankSearchResults = (results: SearchResult[]): SearchResult[] => {
  return results
    .map((result) => {
      // Get importance from metadata
      const metadata = result.chunk_metadata || {};
      const importance = metadata.importance || "medium";

      // Apply importance weights
      let importanceWeight = 1.0;
      if (importance === "high") {
        importanceWeight = 1.5;
      } else if (importance === "low") {
        importanceWeight = 0.7;
      }

      // Calculate weighted score (modifies similarity in place)
      result.similarity = result.similarity * importanceWeight;

      return result;
    })
    .sort((a, b) => b.similarity - a.similarity);
};

/**
 * Create document embeddings for semantic search
 *
 * This function chunks the processed text and creates vector embeddings
 * for each chunk to enable semantic search functionality.
 *
 * @param documentId - The ID of the document
 * @param processedText - The processed text to embed
 * @param structuredData - Optional structured data to improve chunking
 * @returns Promise that resolves when embeddings are created
 */
const createDocumentEmbeddings = async (
  documentId: string,
  processedText: string,
  structuredData: any | null
): Promise<boolean> => {
  try {
    logProcessingStep(
      documentId,
      "EMBEDDINGS",
      "Creating document embeddings for search",
      { textLength: processedText.length }
    );

    if (!processedText || processedText.trim().length === 0) {
      throw new Error("No text provided for embeddings");
    }

    // First, delete any existing embeddings for this document
    console.log(`Deleting existing embeddings for document: ${documentId}`);
    await supabase
      .from("document_embeddings")
      .delete()
      .eq("document_id", documentId);

    // Get document metadata to attach to chunks
    const { data: documentData, error: docError } = await supabase
      .from("documents")
      .select("document_type, title, file_type")
      .eq("id", documentId)
      .single();

    if (docError) {
      console.warn(
        "Could not retrieve document metadata for embeddings:",
        docError
      );
      // Continue anyway with limited metadata
    }

    // Determine chunking strategy based on document type and structured data
    const documentType = documentData?.document_type || "unknown";
    console.log(`Using document type for chunking strategy: ${documentType}`);

    // Prepare texts for chunking with smarter segmentation based on document type
    let textToChunk = processedText;
    let chunks: string[] = [];

    // Prioritize chunking the full text with overlap
    console.log("Using enhanced text chunking with overlap");
    try {
      // Use smaller chunks and higher overlap ratio for better context preservation
      const maxTokens = 500; // Smaller chunk size (was 1000)
      const overlap = 200; // Higher overlap (was 300 but with smaller chunks this is proportionally higher)

      // Use await to handle the async function properly
      chunks = await chunkText(textToChunk, maxTokens, overlap);

      // If we only have one large chunk, force split it into smaller chunks
      if (chunks.length <= 1 && textToChunk.length > 1000) {
        console.log("Text resulted in only one chunk, forcing smaller chunks");

        // Split by paragraphs first
        let paragraphChunks = textToChunk
          .split(/\n\s*\n/)
          .filter((chunk) => chunk.trim().length > 0);

        // If we have multiple paragraphs, use those
        if (paragraphChunks.length > 1) {
          chunks = paragraphChunks;
          console.log(`Created ${chunks.length} paragraph-based chunks`);
        } else {
          // Force splitting by sentences with overlap
          const sentences = textToChunk
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0);
          chunks = [];
          const sentencesPerChunk = 5; // Aim for ~5 sentences per chunk
          const sentenceOverlap = 2; // Overlap of 2 sentences between chunks

          for (
            let i = 0;
            i < sentences.length;
            i += sentencesPerChunk - sentenceOverlap
          ) {
            if (i < 0) i = 0; // Safety check

            // Take sentencesPerChunk sentences, but don't go past the end
            const endIdx = Math.min(i + sentencesPerChunk, sentences.length);
            const chunkSentences = sentences.slice(i, endIdx);

            // Join sentences back together
            const chunk =
              chunkSentences.join(". ") +
              (chunkSentences.length > 0 ? "." : "");

            if (chunk.trim().length > 0) {
              chunks.push(chunk.trim());
            }

            // Stop if we've processed all sentences
            if (endIdx >= sentences.length) break;
          }

          console.log(
            `Created ${chunks.length} sentence-based chunks with overlap`
          );
        }
      }

      // If chunks are too large, split them further
      const maxChunkLength = 1500; // ~375 tokens
      const finalChunks: string[] = [];

      for (const chunk of chunks) {
        if (chunk.length <= maxChunkLength) {
          finalChunks.push(chunk);
        } else {
          // Split large chunks into smaller pieces with overlap
          let startIdx = 0;
          const overlapChars = 250; // Characters to overlap

          while (startIdx < chunk.length) {
            const endIdx = Math.min(startIdx + maxChunkLength, chunk.length);
            finalChunks.push(chunk.substring(startIdx, endIdx));

            // Move start position forward, accounting for overlap
            startIdx += maxChunkLength - overlapChars;

            // Make sure we're making progress
            if (startIdx < endIdx - overlapChars) {
              startIdx = endIdx - overlapChars;
            }

            // Stop if we've reached the end
            if (startIdx >= chunk.length) break;
          }
        }
      }

      // Replace original chunks with the final processed chunks
      chunks = finalChunks;

      console.log(
        `Successfully created ${chunks.length} overlapping chunks from text`
      );
    } catch (chunkingError) {
      console.error("Error during text chunking:", chunkingError);

      // First try paragraph-based chunking as fallback
      const paragraphChunks = textToChunk
        .split(/\n\s*\n/)
        .filter((chunk) => chunk.trim().length > 0);

      // If we have enough paragraphs, use those
      if (paragraphChunks.length > 3) {
        console.log(`Using ${paragraphChunks.length} paragraphs as chunks`);

        // Process paragraphs to ensure they're not too large
        chunks = [];
        const maxParagraphLength = 1500; // ~375 tokens

        for (const paragraph of paragraphChunks) {
          if (paragraph.length <= maxParagraphLength) {
            chunks.push(paragraph);
          } else {
            // Split large paragraphs with overlap
            let startIdx = 0;
            const overlapChars = 200;

            while (startIdx < paragraph.length) {
              const endIdx = Math.min(
                startIdx + maxParagraphLength,
                paragraph.length
              );
              chunks.push(paragraph.substring(startIdx, endIdx));
              startIdx += maxParagraphLength - overlapChars;
            }
          }
        }
      } else {
        // Fall back to sentence-based chunking with overlap
        console.log(
          "Using sentence-based chunking with overlap as final fallback"
        );
        const sentences = textToChunk
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 0);
        chunks = [];

        if (sentences.length > 0) {
          const sentencesPerChunk = 5; // Aim for ~5 sentences per chunk
          const sentenceOverlap = 2; // Overlap of 2 sentences

          for (
            let i = 0;
            i < sentences.length;
            i += sentencesPerChunk - sentenceOverlap
          ) {
            if (i < 0) i = 0; // Safety check

            // Take sentencesPerChunk sentences, but don't go past the end
            const endIdx = Math.min(i + sentencesPerChunk, sentences.length);
            const chunkSentences = sentences.slice(i, endIdx);

            // Join sentences back together with period
            const chunk =
              chunkSentences.join(". ") +
              (chunkSentences.length > 0 ? "." : "");

            if (chunk.trim().length > 0) {
              chunks.push(chunk.trim());
            }
          }
        } else {
          // If even sentence splitting fails, use character-based chunking
          const chunkSize = 1000;
          const overlap = 200;

          for (let i = 0; i < textToChunk.length; i += chunkSize - overlap) {
            const chunk = textToChunk.substring(
              i,
              Math.min(i + chunkSize, textToChunk.length)
            );
            if (chunk.trim().length > 0) {
              chunks.push(chunk);
            }
          }
        }
      }

      console.log(
        `Created ${chunks.length} chunks with improved fallback method`
      );
    }

    console.log(`Created ${chunks.length} chunks for embedding`);

    // Assign importance levels to chunks
    const chunksWithImportance = chunks.map((chunk, index) => {
      // Simple heuristic: first chunks are often more important
      let importance = "medium";
      if (index === 0) importance = "high";
      else if (index === 1) importance = "high";
      else if (index >= chunks.length - 2) importance = "low";

      // If chunk contains certain keywords, elevate importance
      const lowerChunk = chunk.toLowerCase();
      if (
        lowerChunk.includes("total") ||
        lowerChunk.includes("summary") ||
        lowerChunk.includes("conclusion") ||
        lowerChunk.includes("agreement") ||
        lowerChunk.includes("important")
      ) {
        importance = "high";
      }

      return { chunk, importance };
    });

    // Process embeddings in batches to avoid rate limits
    const BATCH_SIZE = 5;
    const batches = [];

    for (let i = 0; i < chunksWithImportance.length; i += BATCH_SIZE) {
      batches.push(chunksWithImportance.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} embedding batches`);

    let totalEmbeddings = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);

      const embeddingPromises = batch.map(
        async ({ chunk, importance }, chunkIndex) => {
          const absoluteIndex = batchIndex * BATCH_SIZE + chunkIndex;

          try {
            // Generate embedding for this chunk
            const embedding = await createEmbedding(chunk);

            // Calculate approximate token count (rough estimate)
            const tokensCount = Math.ceil(chunk.length / 4);

            // Create metadata object
            const chunkMetadata = {
              importance,
              document_type: documentType,
              title: documentData?.title || "",
              chunk_index: absoluteIndex,
              total_chunks: chunksWithImportance.length,
            };

            // Convert embedding to PostgreSQL vector format
            const vectorString = `[${embedding.join(",")}]`;

            // Create embedding record
            const embeddingInsert: DocumentEmbeddingInsert = {
              document_id: documentId,
              content_chunk: chunk,
              chunk_index: absoluteIndex,
              chunk_type: "text",
              chunk_metadata: chunkMetadata,
              tokens_count: tokensCount,
              embedding: vectorString,
            };

            return embeddingInsert;
          } catch (embeddingError) {
            console.error(
              `Error creating embedding for chunk ${absoluteIndex}:`,
              embeddingError
            );
            return null;
          }
        }
      );

      // Wait for all embeddings in this batch
      const embeddingResults = await Promise.all(embeddingPromises);
      const validEmbeddings = embeddingResults.filter(
        (result) => result !== null
      ) as DocumentEmbeddingInsert[];

      if (validEmbeddings.length > 0) {
        // Insert embeddings into database
        const { error: insertError } = await supabase
          .from("document_embeddings")
          .insert(validEmbeddings);

        if (insertError) {
          console.error("Error inserting embeddings batch:", insertError);
        } else {
          totalEmbeddings += validEmbeddings.length;
          console.log(
            `Successfully inserted ${validEmbeddings.length} embeddings from batch ${batchIndex + 1}`
          );
        }
      }

      // Add a small delay between batches to avoid rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    logProcessingStep(
      documentId,
      "EMBEDDINGS COMPLETE",
      `Successfully created ${totalEmbeddings} embeddings for search`,
      {
        totalChunks: chunks.length,
        successfulEmbeddings: totalEmbeddings,
      }
    );

    return true;
  } catch (error) {
    console.error("Error creating document embeddings:", error);
    logProcessingStep(
      documentId,
      "EMBEDDINGS ERROR",
      "Failed to create embeddings",
      { error: error instanceof Error ? error.message : String(error) }
    );
    return false;
  }
};
