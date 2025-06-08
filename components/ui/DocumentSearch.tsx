import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../stores/authStore";
import { useDocumentStore } from "../../stores/documentStore";
import { Tables } from "../../types";

type Document = Tables<"documents">;
type DocumentEmbedding = Tables<"document_embeddings">;

interface SearchResultProps {
  document: Document;
  chunks: DocumentEmbedding[];
  similarity: number;
  onDocumentPress: (document: Document) => void;
}

const SearchResult: React.FC<SearchResultProps> = ({
  document,
  chunks,
  similarity,
  onDocumentPress,
}) => {
  const relevantChunk = chunks[0]; // Get the most relevant chunk
  const confidenceColor =
    similarity > 0.8 ? "#34C759" : similarity > 0.6 ? "#FF9500" : "#FF3B30";

  return (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => onDocumentPress(document)}
    >
      <View style={styles.resultHeader}>
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle} numberOfLines={1}>
            {document.title || document.filename || "Untitled Document"}
          </Text>
          <Text style={styles.documentSubtitle}>
            {document.file_type?.toUpperCase()} •{" "}
            {new Date(document.created_at || "").toLocaleDateString()}
          </Text>
        </View>
        <View
          style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}
        >
          <Text style={styles.confidenceText}>
            {Math.round(similarity * 100)}%
          </Text>
        </View>
      </View>

      {relevantChunk && (
        <View style={styles.chunkPreview}>
          <Text style={styles.chunkText} numberOfLines={3}>
            {relevantChunk.content_chunk}
          </Text>
        </View>
      )}

      <View style={styles.resultFooter}>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  document.ocr_status === "completed" ? "#34C759" : "#6c757d",
              },
            ]}
          />
          <Text style={styles.statusText}>
            {document.ocr_status === "completed" ? "Processed" : "Processing"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );
};

interface DocumentSearchProps {
  onDocumentSelect?: (document: Document) => void;
  placeholder?: string;
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({
  onDocumentSelect,
  placeholder = "Search your documents...",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuthStore();
  const { searchResults, searchLoading, searchDocuments, clearSearch } =
    useDocumentStore();

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user?.id) return;

    await searchDocuments(searchQuery.trim(), user.id);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearSearch();
  };

  const handleDocumentPress = (document: Document) => {
    onDocumentSelect?.(document);
  };

  const renderSearchResult = ({
    item,
    index,
  }: {
    item: Document;
    index: number;
  }) => {
    // Find relevant chunks for this document
    const relevantChunks = searchResults.chunks.filter(
      (chunk) => chunk.document_id === item.id
    );

    const similarity = searchResults.similarities[index] || 0;

    return (
      <SearchResult
        document={item}
        chunks={relevantChunks}
        similarity={similarity}
        onDocumentPress={handleDocumentPress}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#6c757d"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor="#6c757d"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#6c757d" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.searchButton,
            !searchQuery.trim() && styles.searchButtonDisabled,
          ]}
          onPress={handleSearch}
          disabled={!searchQuery.trim() || searchLoading}
        >
          {searchLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="search" size={16} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {searchLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching documents...</Text>
        </View>
      )}

      {searchResults.documents.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>
            Found {searchResults.documents.length} document
            {searchResults.documents.length !== 1 ? "s" : ""}
          </Text>
          <FlatList
            data={searchResults.documents}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
          />
        </View>
      )}

      {!searchLoading &&
        searchQuery &&
        searchResults.documents.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#6c757d" />
            <Text style={styles.emptyTitle}>No documents found</Text>
            <Text style={styles.emptyText}>
              Try different keywords or check if your documents have been
              processed.
            </Text>
          </View>
        )}

      {!searchQuery && (
        <View style={styles.placeholderContainer}>
          <Ionicons name="search" size={48} color="#6c757d" />
          <Text style={styles.placeholderTitle}>Search Your Documents</Text>
          <Text style={styles.placeholderText}>
            Use semantic search to find information across all your processed
            documents. Try searching for concepts, not just exact words.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    alignItems: "center",
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#212529",
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  searchButtonDisabled: {
    backgroundColor: "#6c757d",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  resultsList: {
    padding: 16,
    gap: 12,
  },
  resultCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  documentInfo: {
    flex: 1,
    marginRight: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },
  documentSubtitle: {
    fontSize: 12,
    color: "#6c757d",
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  chunkPreview: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  chunkText: {
    fontSize: 14,
    color: "#495057",
    lineHeight: 20,
  },
  resultFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#6c757d",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#212529",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 24,
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#212529",
    marginTop: 16,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 24,
  },
});
