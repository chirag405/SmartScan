import { Buffer } from "buffer";
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
const chunkText = (
  text: string,
  maxTokens: number = 1000,
  overlap: number = 200
): string[] => {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  // Enhanced algorithm that ensures proper sentence boundaries and overlap
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim() + "."; // Add back the sentence ending
    const potentialChunk =
      currentChunk + (currentChunk ? " " : "") + trimmedSentence;

    // Rough estimate: 1 token ≈ 4 characters
    const potentialChunkTokens = Math.ceil(potentialChunk.length / 4);

    if (potentialChunkTokens > maxTokens && currentChunk.length > 0) {
      // Current chunk is full, add it to chunks
      chunks.push(currentChunk.trim());

      // Create overlap by keeping some of the last content
      const words = currentChunk.split(" ");
      const overlapWordCount = Math.min(Math.ceil(overlap / 4), words.length);
      const overlapText = words.slice(-overlapWordCount).join(" ");

      // Start new chunk with overlap text + current sentence
      currentChunk =
        (overlapText.length > 0 ? overlapText + " " : "") + trimmedSentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add the last chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  console.log(`Created ${chunks.length} chunks with ${overlap} token overlap`);
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

/**
 * Create a minimal valid PDF file as a fallback
 *
 * @param size - Optional target size for the PDF (defaults to 1024 bytes)
 * @returns Buffer containing a minimal valid PDF
 */
const createMinimalPdf = (size = 1024): Buffer => {
  // Create a minimal valid PDF structure
  const header = "%PDF-1.4\n";
  const body =
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>\n" +
    "4 0 obj<</Length 5 0 R>>\nstream\n";

  // Calculate padding to reach the target size
  const footer =
    "\nendstream\nendobj\n" +
    "5 0 obj\n100\nendobj\n" +
    "xref\n" +
    "0 6\n" +
    "0000000000 65535 f\n" +
    "0000000010 00000 n\n" +
    "0000000053 00000 n\n" +
    "0000000102 00000 n\n" +
    "0000000172 00000 n\n" +
    "0000000300 00000 n\n" +
    "trailer<</Size 6/Root 1 0 R>>\n" +
    "startxref\n" +
    "320\n" +
    "%%EOF";

  // Calculate how much padding we need
  const headerAndFooterSize = Buffer.from(
    header + body + footer,
    "utf8"
  ).length;
  const paddingSize = Math.max(0, size - headerAndFooterSize);

  // Create padding content (repeating pattern for better compression)
  let padding = "";
  for (let i = 0; i < paddingSize; i++) {
    padding += String.fromCharCode(65 + (i % 26));
  }

  // Create the complete PDF content
  const pdfContent = header + body + padding + footer;
  return Buffer.from(pdfContent, "utf8");
};

/**
 * Extract PDF content from a React Native blob as a fallback
 *
 * @param rnBlob - The React Native blob object
 * @returns Buffer containing the extracted or synthesized PDF
 */
const extractPdfFromReactNativeBlob = (rnBlob: any): Buffer => {
  console.log("Extracting PDF from React Native blob...");
  console.log("Blob properties:", Object.keys(rnBlob).join(", "));

  // Check if we have the expected structure from error logs
  if (
    rnBlob &&
    typeof rnBlob === "object" &&
    "size" in rnBlob &&
    "offset" in rnBlob &&
    "blobId" in rnBlob &&
    "type" in rnBlob &&
    "name" in rnBlob
  ) {
    console.log(
      `Found RN blob with size: ${rnBlob.size}, type: ${rnBlob.type}, name: ${rnBlob.name}`
    );

    // Try to get data from __collector if available
    if ("__collector" in rnBlob && rnBlob.__collector) {
      console.log(
        "Found __collector in blob, attempting to extract binary data..."
      );

      // Different approaches for different collector types
      if (Buffer.isBuffer(rnBlob.__collector)) {
        console.log("__collector is a Buffer, using directly");
        return rnBlob.__collector;
      } else if (ArrayBuffer.isView(rnBlob.__collector)) {
        console.log("__collector is an ArrayBuffer view, converting to Buffer");
        return Buffer.from(rnBlob.__collector.buffer);
      } else if (typeof rnBlob.__collector === "string") {
        console.log("__collector is a string, trying base64 decode");
        try {
          return Buffer.from(rnBlob.__collector, "base64");
        } catch (e) {
          console.log("Base64 decode failed, using as UTF-8");
          return Buffer.from(rnBlob.__collector, "utf8");
        }
      } else if (Array.isArray(rnBlob.__collector)) {
        console.log("__collector is an array, converting to Buffer");
        return Buffer.from(rnBlob.__collector);
      }
    }
  }

  // Fallback: create a minimal PDF with the blob size if available
  const size =
    rnBlob && typeof rnBlob === "object" && "size" in rnBlob
      ? rnBlob.size
      : 1024;
  console.log(`Using fallback minimal PDF (${size} bytes)`);
  return createMinimalPdf(size);
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
      providers: "mistral",
      language: "en",
      file_url: fileUrl,
    };

    console.log(`API endpoint: ${config.edenAI.ocrAsyncEndpoint}`);
    console.log(`Using signed URL approach with Mistral provider for OCR`);
    console.log(
      `File type: ${mimeType}, method: secure signed URL from storage (expires in 1 hour)`
    );

    // Call Eden AI OCR Async for PDF
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

              // Extract text from results
              let extractedText = "";
              let confidence = 0.5;
              let entities: any[] = [];

              // Process the OCR results
              if (
                resultData.results &&
                Object.keys(resultData.results).length > 0
              ) {
                const providers = Object.keys(resultData.results);
                console.log(
                  `Available OCR results from providers: ${providers.join(", ")}`
                );

                // Log Mistral provider structure if present
                if (resultData.results.mistral) {
                  const mistral = resultData.results.mistral;
                  console.log(
                    `Mistral provider details - final_status: ${mistral.final_status}, has raw_text: ${Boolean(mistral.raw_text)}, text length: ${mistral.raw_text ? mistral.raw_text.length : 0}`
                  );
                }

                for (const provider of providers) {
                  const providerResult = resultData.results[provider];

                  const isSuccess =
                    !providerResult.error && providerResult.data;
                  if (isSuccess) {
                    console.log(`Using OCR results from provider: ${provider}`);

                    // Extract text from OCR results
                    if (providerResult.data.text) {
                      extractedText = providerResult.data.text;
                    } else if (providerResult.data.texts) {
                      extractedText = providerResult.data.texts
                        .map(
                          (textObj: any) =>
                            textObj.text || textObj.content || textObj
                        )
                        .join("\n\n");
                    }

                    // Extract entities if available
                    if (providerResult.data.entities) {
                      entities = providerResult.data.entities.map(
                        (entity: any) => ({
                          text: entity.value || entity.text,
                          description: entity.label || entity.type,
                          confidence: entity.confidence || 0.5,
                        })
                      );
                    }

                    confidence = providerResult.confidence || 0.8;
                    break;
                  } else {
                    // Check if provider has raw_text even if success status is not set
                    if (
                      providerResult.raw_text &&
                      providerResult.raw_text.trim().length > 0
                    ) {
                      console.log(
                        `Provider ${provider} has raw_text despite status not being success`
                      );
                      extractedText = providerResult.raw_text;
                      confidence = providerResult.confidence || 0.8;
                      break;
                    } else {
                      console.warn(
                        `Provider ${provider} failed:`,
                        providerResult.status,
                        providerResult.error
                      );
                    }
                  }
                }
              }

              // Check for raw_text directly if extractedText is empty
              if (!extractedText || extractedText.trim().length === 0) {
                // Try to get raw_text from any provider
                let foundRawText = false;
                for (const provider of Object.keys(resultData.results)) {
                  const providerResult = resultData.results[provider];
                  if (
                    providerResult.raw_text &&
                    providerResult.raw_text.trim().length > 0
                  ) {
                    extractedText = providerResult.raw_text;
                    foundRawText = true;
                    console.log(`Using raw_text from provider: ${provider}`);
                    break;
                  }
                }

                if (!foundRawText) {
                  extractedText =
                    "No text could be extracted from PDF. The document might be image-based or have security restrictions.";
                  console.warn("No text was extracted from PDF");
                }
              }

              if (extractedText && extractedText.trim().length > 0) {
                console.log(
                  `Extracted ${extractedText.length} characters of text from PDF`
                );

                try {
                  // 1. Update document with the extracted text status
                  logProcessingStep(
                    documentId,
                    "TEXT STORAGE",
                    "Updating document status after text extraction",
                    { textLength: extractedText.length, confidence }
                  );

                  await documentQueries.updateDocument(documentId, {
                    ocr_confidence_score: confidence,
                    ocr_status: "extracted",
                  });

                  // 2. Process the text with GPT to clean it up
                  logProcessingStep(
                    documentId,
                    "TEXT PROCESSING",
                    "Processing extracted text with GPT for better structure",
                    { originalTextLength: extractedText.length }
                  );

                  const processedResult = await processTextWithGPTStructured(
                    extractedText,
                    documentId
                  );

                  if (
                    processedResult.success &&
                    processedResult.processedText
                  ) {
                    // 3. Classify document and extract structured data
                    logProcessingStep(
                      documentId,
                      "DOCUMENT CLASSIFICATION",
                      "Classifying document type and extracting structured data",
                      {
                        processedTextLength:
                          processedResult.processedText.length,
                      }
                    );

                    const classificationResult =
                      await classifyDocumentAndExtractData(
                        processedResult.processedText,
                        documentId
                      );

                    // 4. Update document with processed data
                    const updateData: DocumentUpdate = {
                      ocr_status: "completed",
                      processed_at: new Date().toISOString(),
                    };

                    if (classificationResult.success) {
                      updateData.document_type =
                        classificationResult.documentType;
                      updateData.processed_text = JSON.stringify(
                        classificationResult.structuredData
                      );

                      // Only keep essential metadata
                      if (classificationResult.structuredData) {
                        const data = classificationResult.structuredData;

                        // Set title if available
                        if (data.title || data.name) {
                          updateData.title = data.title || data.name;
                        }
                      }

                      logProcessingStep(
                        documentId,
                        "CLASSIFICATION RESULT",
                        `Document classified as: ${classificationResult.documentType}`,
                        { structuredData: classificationResult.structuredData }
                      );
                    }

                    await documentQueries.updateDocument(
                      documentId,
                      updateData
                    );

                    // 5. Generate embeddings for improved search
                    logProcessingStep(
                      documentId,
                      "EMBEDDING GENERATION",
                      "Creating vector embeddings for semantic search",
                      {
                        textForEmbeddings:
                          processedResult.processedText.substring(0, 100) +
                          "...",
                      }
                    );

                    try {
                      // Use the cleaned text for better quality embeddings and structured data for better chunking
                      await createDocumentEmbeddings(
                        documentId,
                        processedResult.processedText,
                        classificationResult.success
                          ? classificationResult.structuredData
                          : null
                      );

                      logProcessingStep(
                        documentId,
                        "PROCESS COMPLETE",
                        "Document processing completed successfully!",
                        { documentId, status: "completed" }
                      );
                    } catch (embeddingError) {
                      logProcessingStep(
                        documentId,
                        "EMBEDDING ERROR",
                        "Error creating embeddings, but continuing processing",
                        {
                          error:
                            embeddingError instanceof Error
                              ? embeddingError.message
                              : String(embeddingError),
                        }
                      );
                      // Don't fail the whole process if embeddings fail
                    }
                  } else {
                    // If GPT processing failed, update status to partial
                    logProcessingStep(
                      documentId,
                      "PROCESSING FALLBACK",
                      "GPT processing failed, using raw text as fallback",
                      {
                        reason:
                          processedResult.metadata.reason || "Unknown error",
                      }
                    );

                    await documentQueries.updateDocument(documentId, {
                      ocr_status: "fallback",
                      processed_at: new Date().toISOString(),
                    });

                    // Still try to create embeddings with raw text
                    logProcessingStep(
                      documentId,
                      "FALLBACK EMBEDDINGS",
                      "Creating embeddings from raw OCR text"
                    );

                    await createDocumentEmbeddings(
                      documentId,
                      extractedText,
                      null
                    );
                  }
                } catch (processingError) {
                  logProcessingStep(
                    documentId,
                    "PROCESSING ERROR",
                    "Error in document processing pipeline",
                    {
                      error:
                        processingError instanceof Error
                          ? processingError.message
                          : String(processingError),
                    }
                  );

                  await documentQueries.updateDocument(documentId, {
                    ocr_status: "error",
                    processed_at: new Date().toISOString(),
                    processed_text:
                      "Error during document processing. Please try again.",
                  } as any);
                }
              }

              console.log(
                "Full OCR response:",
                JSON.stringify(resultData, null, 2)
              );
              return {
                text: extractedText,
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
            // If still processing, continue polling
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

// Calculate average confidence from pages
const calculateAverageConfidence = (pages: any[]): number => {
  if (!pages || pages.length === 0) return 0.5;

  let totalConfidence = 0;
  let totalBlocks = 0;

  for (const page of pages) {
    if (page.blocks) {
      for (const block of page.blocks) {
        totalConfidence += block.confidence || 0;
        totalBlocks++;
      }
    }
  }

  return totalBlocks > 0 ? totalConfidence / totalBlocks : 0.5;
};

// Utility function to log structured data processing from GPT
const logStructuredDataProcessing = (data: {
  documentId: string;
  originalText?: string;
  processedText?: string | null;
  error?: any;
  status: "success" | "failure" | "skipped";
  metadata?: Record<string, any>;
}) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    documentId: data.documentId,
    status: data.status,
    originalLength: data.originalText ? data.originalText.length : 0,
    processedLength: data.processedText ? data.processedText.length : 0,
    model: "gpt-3.5-turbo",
    error: data.error
      ? data.error instanceof Error
        ? data.error.message
        : String(data.error)
      : undefined,
    ...data.metadata,
  };

  // Log the structured data
  console.log("GPT STRUCTURED DATA:", JSON.stringify(logData));

  // You could also store this in a database or send to a monitoring service
  // For now, we'll just log to console
};

// Define the metadata interface for GPT processing
interface GPTProcessingMetadata {
  documentId: string;
  timestamp: string;
  processingTime: number;
  status: "success" | "failure" | "skipped";
  model: string;
  reason?: string;
  error?: string;
  characterCount?: number;
  fullResponse?: any;
  textSample?: {
    firstChars: string;
    lastChars: string;
  };
  [key: string]: any;
}

// Process text with GPT and return structured result with metadata
export const processTextWithGPTStructured = async (
  rawText: string,
  documentId: string,
  options: {
    includeOriginalText?: boolean;
    logFullResponse?: boolean;
    additionalMetadata?: Record<string, any>;
    documentType?: string; // Add document type hint
  } = {}
): Promise<{
  success: boolean;
  processedText: string | null;
  originalText?: string;
  metadata: GPTProcessingMetadata;
}> => {
  const startTime = Date.now();
  const metadata: GPTProcessingMetadata = {
    documentId,
    timestamp: new Date().toISOString(),
    processingTime: 0, // Will be updated before return
    status: "pending" as "success" | "failure" | "skipped",
    model: "gpt-3.5-turbo",
    ...(options.additionalMetadata || {}),
  };

  try {
    if (!rawText || rawText.trim().length === 0) {
      console.warn("No text provided for GPT processing");

      metadata.status = "skipped";
      metadata.reason = "Empty input text";
      metadata.processingTime = Date.now() - startTime;

      logStructuredDataProcessing({
        documentId,
        originalText: options.includeOriginalText ? rawText : undefined,
        processedText: null,
        status: "skipped",
        metadata: { reason: "Empty input text" },
      });

      return {
        success: false,
        processedText: null,
        originalText: options.includeOriginalText ? rawText : undefined,
        metadata,
      };
    }

    console.log(`Processing text with GPT for document: ${documentId}`);
    console.log(`Original text length: ${rawText.length} characters`);

    // If text is very short, no need to process
    if (rawText.length < 100) {
      console.log("Text too short for GPT processing, using as is");

      metadata.status = "skipped";
      metadata.reason = "Text too short";
      metadata.processingTime = Date.now() - startTime;

      logStructuredDataProcessing({
        documentId,
        originalText: options.includeOriginalText ? rawText : undefined,
        processedText: rawText,
        status: "skipped",
        metadata: { reason: "Text too short" },
      });

      return {
        success: true,
        processedText: rawText,
        originalText: options.includeOriginalText ? rawText : undefined,
        metadata,
      };
    }

    // Get existing document type from database if not provided in options
    let documentType = options.documentType;
    if (!documentType) {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("document_type")
          .eq("id", documentId)
          .single();
          
        if (!error && data && data.document_type) {
          documentType = data.document_type;
          console.log(`Using existing document type from database: ${documentType}`);
        }
      } catch (err) {
        // Ignore error, we'll proceed without document type
        console.log("Could not retrieve document type from database");
      }
    }

    // Include document type hint in the prompt if available
    const documentTypeHint = documentType 
      ? `\nIMPORTANT: This document appears to be a "${documentType}". Consider this document type in your analysis.` 
      : '';

    // Prepare prompt for GPT
    const prompt = `
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
            uploadPath = await documentQueries.uploadFileToStorage(
              blob,
              fileName
            );
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
        uploadPath = await documentQueries.uploadFileToStorage(
          file as File | Blob,
          fileName
        );
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
      // Process the query to expand it slightly for better matches
      const enhancedQuery = await enhanceSearchQuery(query);

      // Create embedding for the query
      const queryEmbedding = await createEmbedding(enhancedQuery);

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

// Process text with GPT to improve structure and content for embeddings
const processTextWithGPT = async (
  rawText: string,
  documentId: string
): Promise<string | null> => {
  try {
    // Use the new structured implementation instead
    const result = await processTextWithGPTStructured(rawText, documentId);
    return result.processedText;
  } catch (error: any) {
    console.error("Error in legacy processTextWithGPT:", error);
    return null;
  }
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

// Helper function to enhance search query
const enhanceSearchQuery = async (query: string): Promise<string> => {
  // For simple implementation, just return the original query
  // In a future enhancement, this could use GPT to expand the query
  return query;
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
