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
                    !providerResult.error && providerResult.extracted_data;
                  if (isSuccess) {
                    console.log(`Using OCR results from provider: ${provider}`);

                    // Extract text from OCR results
                    if (providerResult.extracted_data.text) {
                      extractedText = providerResult.extracted_data.text;
                    } else if (providerResult.extracted_data.texts) {
                      extractedText = providerResult.extracted_data.texts
                        .map(
                          (textObj: any) =>
                            textObj.text || textObj.content || textObj
                        )
                        .join("\n\n");
                    }

                    // Extract entities if available
                    if (providerResult.extracted_data.entities) {
                      entities = providerResult.extracted_data.entities.map(
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
                      updateData.extracted_data =
                        classificationResult.structuredData;

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
                  });
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

    // Prepare prompt for GPT
    const prompt = `
    You are a document analysis expert with exceptional skills in information extraction. Your task is to:
    1. Identify the type of document from the text provided
    2. Extract ONLY the most relevant and unique information specific to this document
    3. Present the information in a clear, structured paragraph format
    4. COMPLETELY EXCLUDE generic disclaimers, boilerplate text, standard instructions, and legal warnings
    
    Document text:
    ${rawText.slice(0, 15000)} // Limit to prevent token overflow
    
    STRICT EXCLUSION RULES - DO NOT INCLUDE:
    - Generic disclaimers or warnings (e.g., "Aadhaar is proof of identity, not citizenship")
    - Standard legal text or terms and conditions
    - Boilerplate instructions (e.g., "verify through online authentication")
    - Repeated headers/footers or watermarks
    - Generic advice or precautionary statements
    - Standard government notices or regulatory text
    - Generic "how to use" instructions
    - Standard contact information for government departments
    - Generic security warnings or authentication instructions
    
    ONLY INCLUDE DOCUMENT-SPECIFIC INFORMATION:
    - Personal details unique to the document holder
    - Specific dates, numbers, and identifiers
    - Unique addresses, contact information
    - Specific course/subject details (for educational documents)
    - Specific transaction details (for financial documents)
    - Document-specific reference numbers or codes
    
    Please analyze the document and provide a structured paragraph response in the following format:
    
    **Document Type:** [Identified document type with confidence level]
    
    **Key Information:**
    [Write 2-3 paragraphs covering the most important document-specific details. Include personal identifiers, dates, numbers, addresses, and other unique information. Organize logically - start with primary identification details, then supporting information, then any structured data like subjects/courses/transactions if applicable.]
    
    **Additional Details:**
    [Include any other relevant document-specific information that provides context but isn't critical for identification. This could include secondary contact details, additional reference numbers, or other supporting data.]
    
    FORMATTING GUIDELINES:
    - Use clear, readable paragraphs
    - Bold important identifiers and numbers within the text
    - Keep the response concise but comprehensive
    - Focus on facts and data, not explanations
    - Maintain the original language for names and addresses when bilingual
    
    IMPORTANT:
    - Only extract information that is unique and specific to this particular document
    - Completely ignore all generic text, disclaimers, and standard instructions
    - Focus on the document holder's personal information and document-specific details
    - Do not include any boilerplate or regulatory text
    - Keep the response factual and direct
    `;

    // Call GPT
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 4000,
    });

    const processedText = response.choices[0]?.message?.content?.trim();

    if (!processedText) {
      console.warn("GPT processing returned empty result");

      metadata.status = "failure";
      metadata.reason = "Empty response from GPT";
      metadata.processingTime = Date.now() - startTime;

      if (options.logFullResponse) {
        metadata.fullResponse = response;
      }

      logStructuredDataProcessing({
        documentId,
        originalText: options.includeOriginalText ? rawText : undefined,
        processedText: null,
        status: "failure",
        metadata: { reason: "Empty response from GPT" },
      });

      return {
        success: false,
        processedText: null,
        originalText: options.includeOriginalText ? rawText : undefined,
        metadata,
      };
    }

    console.log(`Processed text length: ${processedText.length} characters`);
    console.log("GPT processing completed successfully");

    metadata.status = "success";
    metadata.processingTime = Date.now() - startTime;
    metadata.characterCount = processedText.length;

    if (options.logFullResponse) {
      metadata.fullResponse = response;
    }

    // Add sample of text for verification
    metadata.textSample = {
      firstChars: processedText.substring(0, 100),
      lastChars: processedText.substring(processedText.length - 100),
    };

    // Log the structured data
    logStructuredDataProcessing({
      documentId,
      originalText: options.includeOriginalText ? rawText : undefined,
      processedText,
      status: "success",
      metadata: {
        responseData: {
          firstChars: processedText.substring(0, 100),
          lastChars: processedText.substring(processedText.length - 100),
        },
      },
    });

    return {
      success: true,
      processedText,
      originalText: options.includeOriginalText ? rawText : undefined,
      metadata,
    };
  } catch (error) {
    console.error("Error processing text with GPT:", error);

    metadata.status = "failure";
    metadata.reason = "GPT API error";
    metadata.error = error instanceof Error ? error.message : String(error);
    metadata.processingTime = Date.now() - startTime;

    logStructuredDataProcessing({
      documentId,
      originalText: options.includeOriginalText ? rawText : undefined,
      processedText: null,
      error,
      status: "failure",
      metadata: { reason: "GPT API error" },
    });

    return {
      success: false,
      processedText: null,
      originalText: options.includeOriginalText ? rawText : undefined,
      metadata,
    };
  }
};

// Classify document type and extract structured data
export const classifyDocumentAndExtractData = async (
  processedText: string,
  documentId: string
): Promise<{
  success: boolean;
  documentType: string | null;
  structuredData: Record<string, any> | null;
  metadata: {
    processingTime: number;
    status: "success" | "failure" | "skipped";
    model: string;
    error?: string;
  };
}> => {
  const startTime = Date.now();

  try {
    if (!processedText || processedText.trim().length === 0) {
      console.warn("No text provided for document classification");
      return {
        success: false,
        documentType: null,
        structuredData: null,
        metadata: {
          processingTime: Date.now() - startTime,
          status: "skipped",
          model: "gpt-3.5-turbo-16k",
          error: "Empty input text",
        },
      };
    }

    console.log(`Classifying document type for: ${documentId}`);

    // Prepare prompt for GPT to classify document and extract structured data
    const prompt = `
    You are a document analysis expert with exceptional skills in information extraction. Your task is to:
    1. Identify the type of document from the text provided
    2. Extract ONLY the most relevant and unique information specific to this document
    3. Present the information in a clear, structured paragraph format
    4. COMPLETELY EXCLUDE generic disclaimers, boilerplate text, standard instructions, and legal warnings
    
    Document text:
    ${processedText.slice(0, 15000)} // Limit to prevent token overflow
    
    STRICT EXCLUSION RULES - DO NOT INCLUDE:
    - Generic disclaimers or warnings (e.g., "Aadhaar is proof of identity, not citizenship")
    - Standard legal text or terms and conditions
    - Boilerplate instructions (e.g., "verify through online authentication")
    - Repeated headers/footers or watermarks
    - Generic advice or precautionary statements
    - Standard government notices or regulatory text
    - Generic "how to use" instructions
    - Standard contact information for government departments
    - Generic security warnings or authentication instructions
    
    ONLY INCLUDE DOCUMENT-SPECIFIC INFORMATION:
    - Personal details unique to the document holder
    - Specific dates, numbers, and identifiers
    - Unique addresses, contact information
    - Specific course/subject details (for educational documents)
    - Specific transaction details (for financial documents)
    - Document-specific reference numbers or codes
    
    Please analyze the document and provide a structured paragraph response in the following format:
    
    **Document Type:** [Identified document type with confidence level]
    
    **Key Information:**
    [Write 2-3 paragraphs covering the most important document-specific details. Include personal identifiers, dates, numbers, addresses, and other unique information. Organize logically - start with primary identification details, then supporting information, then any structured data like subjects/courses/transactions if applicable.]
    
    **Additional Details:**
    [Include any other relevant document-specific information that provides context but isn't critical for identification. This could include secondary contact details, additional reference numbers, or other supporting data.]
    
    FORMATTING GUIDELINES:
    - Use clear, readable paragraphs
    - Bold important identifiers and numbers within the text
    - Keep the response concise but comprehensive
    - Focus on facts and data, not explanations
    - Maintain the original language for names and addresses when bilingual
    
    IMPORTANT:
    - Only extract information that is unique and specific to this particular document
    - Completely ignore all generic text, disclaimers, and standard instructions
    - Focus on the document holder's personal information and document-specific details
    - Do not include any boilerplate or regulatory text
    - Keep the response factual and direct
    `;

    // Call GPT for classification and data extraction
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Lower temperature for more consistent results
      max_tokens: 4000,
    });

    const result = response.choices[0]?.message?.content?.trim();

    if (!result) {
      console.warn("GPT classification returned empty result");
      return {
        success: false,
        documentType: null,
        structuredData: null,
        metadata: {
          processingTime: Date.now() - startTime,
          status: "failure",
          model: "gpt-3.5-turbo-16k",
          error: "Empty response from GPT",
        },
      };
    }

    // Parse the response to extract document type and key information
    // Response format is:
    // **Document Type:** [type]
    // **Key Information:** [info]
    // **Additional Details:** [details]

    let documentType = "Unknown Document";
    const structuredData: Record<string, any> = {
      title: "",
      primary_info: {},
      secondary_info: {},
      full_text: result,
    };

    // Extract document type from the response
    const docTypeMatch = result.match(
      /\*\*Document Type:\*\* (.*?)(?=\n\n|\n\*\*|$)/s
    );
    if (docTypeMatch && docTypeMatch[1]) {
      documentType = docTypeMatch[1].trim();

      // If document type includes confidence level, extract it
      const confidenceMatch =
        documentType.match(/(.*?) with ([\d.]+)% confidence/i) ||
        documentType.match(/(.*?) \(([\d.]+)%\)/i) ||
        documentType.match(/(.*?) \(confidence: ([\d.]+)\)/i);

      if (confidenceMatch) {
        documentType = confidenceMatch[1].trim();
        structuredData.confidence = parseFloat(confidenceMatch[2]) / 100;
      } else {
        structuredData.confidence = 0.85; // Default confidence
      }
    }

    // Extract key information
    const keyInfoMatch = result.match(
      /\*\*Key Information:\*\* (.*?)(?=\n\n\*\*Additional Details|\n\*\*Additional Details|$)/s
    );
    if (keyInfoMatch && keyInfoMatch[1]) {
      structuredData.primary_info.text = keyInfoMatch[1].trim();
    }

    // Extract additional details
    const additionalDetailsMatch = result.match(
      /\*\*Additional Details:\*\* (.*?)(?=\n\n\*\*|$)/s
    );
    if (additionalDetailsMatch && additionalDetailsMatch[1]) {
      structuredData.secondary_info.text = additionalDetailsMatch[1].trim();
    }

    // Set title based on document type
    structuredData.title = documentType;

    console.log(`Document classified as: ${documentType}`);

    return {
      success: true,
      documentType,
      structuredData,
      metadata: {
        processingTime: Date.now() - startTime,
        status: "success",
        model: "gpt-3.5-turbo-16k",
      },
    };
  } catch (error) {
    console.error("Error classifying document:", error);
    return {
      success: false,
      documentType: null,
      structuredData: null,
      metadata: {
        processingTime: Date.now() - startTime,
        status: "failure",
        model: "gpt-3.5-turbo-16k",
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

// Update the document embedding creation to use structured data
const createDocumentEmbeddings = async (
  documentId: string,
  text: string,
  structuredData?: Record<string, any> | null
): Promise<void> => {
  try {
    if (structuredData && Object.keys(structuredData).length > 0) {
      console.log("Using structured data for embeddings generation");
      await createEmbeddingsFromStructuredData(documentId, structuredData);
    } else if (text && text.trim().length > 0) {
      console.log("Falling back to raw text for embeddings generation");
      await createEmbeddingsFromText(documentId, text);
    } else {
      console.warn(
        "No text or structured data provided for embedding creation"
      );
      return;
    }
  } catch (error) {
    console.error("Error creating document embeddings:", error);
    throw error;
  }
};

// Create embeddings from structured data
const createEmbeddingsFromStructuredData = async (
  documentId: string,
  structuredData: Record<string, any>
): Promise<void> => {
  try {
    console.log("Creating embeddings from structured data for:", documentId);

    // Delete any existing embeddings for this document to avoid duplicates
    const { error: deleteError } = await supabase
      .from("document_embeddings")
      .delete()
      .eq("document_id", documentId);

    if (deleteError) {
      console.warn("Error deleting existing embeddings:", deleteError);
    }

    const chunks: { text: string; metadata: any }[] = [];

    // Extract chunks from structured data using recursive function
    extractChunksFromStructuredData(structuredData, chunks);

    console.log(`Created ${chunks.length} chunks from structured data`);

    if (chunks.length === 0) {
      console.warn(
        "No chunks extracted from structured data, falling back to JSON string"
      );
      // If no chunks were extracted, use the JSON string as fallback
      const jsonText = JSON.stringify(structuredData, null, 2);
      const fallbackChunks = chunkText(jsonText, 1000);
      chunks.push(
        ...fallbackChunks.map((chunk) => ({
          text: chunk,
          metadata: { source: "json_fallback" },
        }))
      );
    }

    // Process embeddings in batches
    const batchSize = 5;
    const embeddingResults = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);

      const batchPromises = batchChunks.map(async (chunk, batchIndex) => {
        try {
          const embedding = await createEmbedding(chunk.text);

          // Convert embedding array to PostgreSQL vector format
          const vectorString = `[${embedding.join(",")}]`;

          return {
            document_id: documentId,
            content_chunk: chunk.text,
            chunk_index: i + batchIndex,
            chunk_type: "structured",
            chunk_metadata: {
              ...chunk.metadata,
              token_count: Math.ceil(chunk.text.length / 4),
              chunk_length: chunk.text.length,
            },
            embedding: vectorString,
            tokens_count: Math.ceil(chunk.text.length / 4),
          };
        } catch (error) {
          console.error(
            `Error creating embedding for chunk ${i + batchIndex}:`,
            error
          );
          throw error;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      embeddingResults.push(...batchResults);

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Insert all embeddings into the database
    if (embeddingResults.length > 0) {
      const { error } = await supabase
        .from("document_embeddings")
        .insert(embeddingResults);

      if (error) {
        console.error("Error inserting embeddings:", error);
        throw new Error(`Failed to insert embeddings: ${error.message}`);
      }

      console.log(
        `Successfully created ${embeddingResults.length} embeddings from structured data for document:`,
        documentId
      );
    } else {
      console.warn("No embeddings created for document:", documentId);
    }
  } catch (error) {
    console.error("Error creating embeddings from structured data:", error);
    throw error;
  }
};

// Helper function to recursively extract chunks from structured data
const extractChunksFromStructuredData = (
  data: any,
  chunks: { text: string; metadata: any }[],
  path: string = "",
  depth: number = 0
): void => {
  // Base case: if max depth reached or not an object
  if (depth > 10 || typeof data !== "object" || data === null) {
    return;
  }

  // Special handling for arrays of objects
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      const newPath = path ? `${path}[${index}]` : `[${index}]`;
      extractChunksFromStructuredData(item, chunks, newPath, depth + 1);
    });
    return;
  }

  // Check for title and add it with high importance
  if (
    data.title &&
    typeof data.title === "string" &&
    data.title.trim().length > 0
  ) {
    chunks.push({
      text: `Title: ${data.title}`,
      metadata: {
        path: path ? `${path}.title` : "title",
        field: "title",
        importance: "high",
      },
    });
  }

  // Process primary_info with highest priority
  if (data.primary_info && typeof data.primary_info === "object") {
    const primaryInfoText = formatObjectToText(data.primary_info);
    if (primaryInfoText.trim().length > 0) {
      chunks.push({
        text: `Primary Information: ${primaryInfoText}`,
        metadata: {
          path: path ? `${path}.primary_info` : "primary_info",
          importance: "high",
          type: "primary_info",
        },
      });
    }

    // Also extract primary_info fields individually for more precise matching
    for (const [key, value] of Object.entries(data.primary_info)) {
      if (typeof value === "string" && value.trim().length > 0) {
        chunks.push({
          text: `${key}: ${value}`,
          metadata: {
            path: path ? `${path}.primary_info.${key}` : `primary_info.${key}`,
            field: key,
            importance: "high",
          },
        });
      }
    }
  }

  // Process secondary_info with medium priority
  if (data.secondary_info && typeof data.secondary_info === "object") {
    const secondaryInfoText = formatObjectToText(data.secondary_info);
    if (secondaryInfoText.trim().length > 0) {
      chunks.push({
        text: `Secondary Information: ${secondaryInfoText}`,
        metadata: {
          path: path ? `${path}.secondary_info` : "secondary_info",
          importance: "medium",
          type: "secondary_info",
        },
      });
    }
  }

  // Process detail_sections with appropriate priorities
  if (data.detail_sections && Array.isArray(data.detail_sections)) {
    data.detail_sections.forEach((section: any, index: number) => {
      if (section && typeof section === "object") {
        const heading = section.heading || `Section ${index + 1}`;
        const content = section.content || "";
        const importance = section.importance_level || "medium";

        // Handle structured content with high priority (especially for tables like subjects)
        if (
          section.structured_content &&
          typeof section.structured_content === "object"
        ) {
          const structuredText = formatObjectToText(section.structured_content);
          if (structuredText.trim().length > 0) {
            chunks.push({
              text: `${heading} (Structured): ${structuredText}`,
              metadata: {
                path: `${path ? path + "." : ""}detail_sections[${index}].structured_content`,
                type: "structured_content",
                heading,
                importance: importance === "high" ? "high" : "medium", // Ensure structured content is at least medium priority
              },
            });
          }

          // If there are arrays in structured_content (like subject lists), process them specially
          for (const [key, value] of Object.entries(
            section.structured_content
          )) {
            if (Array.isArray(value)) {
              value.forEach((item, itemIndex) => {
                if (typeof item === "object") {
                  const itemText = formatObjectToText(item);
                  if (itemText.trim().length > 0) {
                    chunks.push({
                      text: `${heading} - ${key} ${itemIndex + 1}: ${itemText}`,
                      metadata: {
                        path: `${path ? path + "." : ""}detail_sections[${index}].structured_content.${key}[${itemIndex}]`,
                        type: "structured_item",
                        heading,
                        importance: importance === "high" ? "high" : "medium",
                      },
                    });
                  }
                }
              });
            }
          }
        }

        // Process the main content of the section based on importance
        if (
          content &&
          typeof content === "string" &&
          content.trim().length > 0
        ) {
          // For high importance sections, create smaller chunks for more precise retrieval
          if (importance === "high") {
            const contentChunks = chunkText(content, 500); // Smaller chunks for high importance
            contentChunks.forEach((chunk, chunkIndex) => {
              chunks.push({
                text: `${heading}: ${chunk}`,
                metadata: {
                  path: `${path ? path + "." : ""}detail_sections[${index}]`,
                  type: "section_content",
                  heading,
                  importance: "high",
                  chunk_index: chunkIndex,
                  total_chunks: contentChunks.length,
                },
              });
            });
          } else {
            // For medium/low importance, use larger chunks
            const contentChunks = chunkText(content, 1000);
            contentChunks.forEach((chunk, chunkIndex) => {
              chunks.push({
                text: `${heading}: ${chunk}`,
                metadata: {
                  path: `${path ? path + "." : ""}detail_sections[${index}]`,
                  type: "section_content",
                  heading,
                  importance: importance,
                  chunk_index: chunkIndex,
                  total_chunks: contentChunks.length,
                },
              });
            });
          }
        }
      }
    });
  }

  // Process metadata as medium importance
  if (data.metadata && typeof data.metadata === "object") {
    const metadataText = formatObjectToText(data.metadata);
    if (metadataText.trim().length > 0) {
      chunks.push({
        text: `Metadata: ${metadataText}`,
        metadata: {
          path: path ? `${path}.metadata` : "metadata",
          type: "metadata",
          importance: "medium",
        },
      });
    }
  }

  // Process ignorable_content with low importance
  if (data.ignorable_content && typeof data.ignorable_content === "object") {
    const ignorableContent = data.ignorable_content.content || "";
    if (
      typeof ignorableContent === "string" &&
      ignorableContent.trim().length > 100
    ) {
      // Create larger chunks for ignorable content
      const contentChunks = chunkText(ignorableContent, 1500);
      contentChunks.forEach((chunk, index) => {
        chunks.push({
          text: chunk,
          metadata: {
            path: path ? `${path}.ignorable_content` : "ignorable_content",
            type: "ignorable",
            importance: "low",
            chunk_index: index,
            total_chunks: contentChunks.length,
          },
        });
      });
    }
  }

  // Process other fields at the top level
  for (const [key, value] of Object.entries(data)) {
    // Skip fields we've already processed
    if (
      [
        "title",
        "primary_info",
        "secondary_info",
        "detail_sections",
        "metadata",
        "ignorable_content",
      ].includes(key)
    ) {
      continue;
    }

    const newPath = path ? `${path}.${key}` : key;

    // Handle string values with sufficient length
    if (typeof value === "string" && value.trim().length > 50) {
      chunks.push({
        text: `${key}: ${value}`,
        metadata: {
          path: newPath,
          field: key,
          importance: "medium", // Default to medium for unclassified content
        },
      });
    }
    // Recurse into nested objects
    else if (typeof value === "object" && value !== null) {
      extractChunksFromStructuredData(value, chunks, newPath, depth + 1);
    }
  }
};

// Helper function to format objects to text
const formatObjectToText = (obj: any): string => {
  if (typeof obj !== "object" || obj === null) {
    return String(obj || "");
  }

  return Object.entries(obj)
    .filter(
      ([_, value]) => value !== null && value !== undefined && value !== ""
    )
    .map(([key, value]) => {
      if (typeof value === "object" && !Array.isArray(value)) {
        return `${key}: ${formatObjectToText(value)}`;
      } else if (Array.isArray(value)) {
        return `${key}: ${value
          .map((item) =>
            typeof item === "object" ? formatObjectToText(item) : String(item)
          )
          .join(", ")}`;
      } else {
        return `${key}: ${value}`;
      }
    })
    .join(" | ");
};

// Create embeddings from raw text (original implementation as fallback)
const createEmbeddingsFromText = async (
  documentId: string,
  text: string
): Promise<void> => {
  try {
    if (!text || text.trim().length === 0) {
      console.warn("No text provided for embedding creation");
      return;
    }

    console.log("Creating document embeddings from raw text for:", documentId);

    // Chunk the text into smaller pieces
    const chunks = chunkText(text, 1000); // Limit to ~1000 tokens per chunk
    console.log(`Created ${chunks.length} chunks for embedding`);

    // Delete any existing embeddings for this document to avoid duplicates
    const { error: deleteError } = await supabase
      .from("document_embeddings")
      .delete()
      .eq("document_id", documentId);

    if (deleteError) {
      console.warn("Error deleting existing embeddings:", deleteError);
      // Continue with embedding creation even if deletion fails
    }

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
    if (embeddingResults.length > 0) {
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
    } else {
      console.warn("No embeddings created for document:", documentId);
    }
  } catch (error) {
    console.error("Error creating document embeddings from text:", error);
    throw error;
  }
};

const formatStorageSize = (sizeInMB: number): number => {
  // Round to one decimal place and ensure it's a valid number
  const formattedSize = Math.max(0, Math.round((sizeInMB || 0) * 10) / 10);
  // Ensure we return at least 0.1 MB if there is any storage used (but less than 0.1 MB)
  if (sizeInMB > 0 && formattedSize === 0) {
    return 0.1;
  }
  return isNaN(formattedSize) ? 0 : formattedSize;
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

  // Get a document by ID
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

  // Update user document stats
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

      // Update stats
      const newDocCount = Math.floor((userData.document_count || 0) + 1);

      // Convert bytes to MB with better precision
      const currentStorageMB = parseFloat(
        userData.storage_used_mb?.toString() || "0"
      );

      // Calculate additional storage with precision
      const additionalStorageMB = newFileSize / (1024 * 1024);

      // Calculate new storage with one decimal place precision
      const rawNewStorage = currentStorageMB + additionalStorageMB;
      const newStorageUsed = parseFloat(rawNewStorage.toFixed(1));

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

// Helper function to update user stats after document deletion
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
    // Use a more precise conversion that keeps decimal points
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    // Ensure storage_used_mb never goes below 0
    const currentStorageMB = parseFloat(
      userData.storage_used_mb?.toString() || "0"
    );

    // Calculate new storage with one decimal place precision
    const newStorageUsed = Math.max(
      0,
      parseFloat((currentStorageMB - fileSizeMB).toFixed(1))
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
