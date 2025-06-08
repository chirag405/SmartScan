import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DocumentSearch } from "../../components/ui/DocumentSearch";
import { DocumentUploader } from "../../components/ui/DocumentUploader";
import { useAuthStore } from "../../stores/authStore";
import { useDocumentStore } from "../../stores/documentStore";
import { Tables } from "../../types";

type Document = Tables<"documents">;

export default function DocumentsScreen() {
  const [activeTab, setActiveTab] = useState<"upload" | "search" | "manage">(
    "upload"
  );
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuthStore();
  const {
    documents,
    stats,
    loading,
    error,
    fetchDocuments,
    fetchUserStats,
    reprocessDocument,
  } = useDocumentStore();

  useEffect(() => {
    if (user?.id) {
      fetchDocuments(user.id);
      fetchUserStats(user.id);
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    if (!user?.id) return;

    setRefreshing(true);
    try {
      await Promise.all([fetchDocuments(user.id), fetchUserStats(user.id)]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDocumentSelect = (document: Document) => {
    // Navigate to document detail or perform action
    console.log("Selected document:", document);
  };

  const handleUploadComplete = (documentId: string) => {
    // Refresh documents after upload
    if (user?.id) {
      fetchDocuments(user.id);
      fetchUserStats(user.id);
    }
    // Switch to manage tab to see the uploaded document
    setActiveTab("manage");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#34C759";
      case "processing":
        return "#FF9500";
      case "failed":
        return "#FF3B30";
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Processed";
      case "processing":
        return "Processing";
      case "failed":
        return "Failed";
      default:
        return "Pending";
    }
  };

  const renderTabButton = (
    tab: "upload" | "search" | "manage",
    icon: string,
    label: string
  ) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? "#007AFF" : "#6c757d"}
      />
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Your Documents</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.totalDocuments || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.processedDocuments || 0}</Text>
          <Text style={styles.statLabel}>Processed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {(stats?.storageUsedMB || 0).toFixed(1)}MB
          </Text>
          <Text style={styles.statLabel}>Storage</Text>
        </View>
      </View>
    </View>
  );

  const renderDocumentItem = (document: Document) => (
    <TouchableOpacity
      key={document.id}
      style={styles.documentItem}
      onPress={() => handleDocumentSelect(document)}
    >
      <View style={styles.documentHeader}>
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle} numberOfLines={1}>
            {document.title || document.filename || "Untitled Document"}
          </Text>
          <Text style={styles.documentSubtitle}>
            {document.file_type?.toUpperCase()} •{" "}
            {new Date(document.created_at || "").toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.documentActions}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusColor(
                  document.ocr_status || "pending"
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(document.ocr_status || "pending")}
            </Text>
          </View>
          {document.ocr_status === "failed" && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => reprocessDocument(document.id)}
            >
              <Ionicons name="refresh" size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {document.detected_text && (
        <Text style={styles.documentPreview} numberOfLines={2}>
          {document.detected_text.substring(0, 150)}...
        </Text>
      )}

      <View style={styles.documentFooter}>
        <Text style={styles.documentSize}>
          {(document.file_size_bytes / 1024).toFixed(1)}KB
        </Text>
        {document.ocr_confidence_score && (
          <Text style={styles.confidenceScore}>
            {Math.round(document.ocr_confidence_score * 100)}% confidence
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderManageContent = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {renderStatsCard()}

      <View style={styles.documentsContainer}>
        <Text style={styles.sectionTitle}>Recent Documents</Text>
        {documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#6c757d" />
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>
              Upload your first document to get started with AI-powered document
              processing.
            </Text>
          </View>
        ) : (
          documents.map(renderDocumentItem)
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>
          Upload, process, and search your documents with AI
        </Text>
      </View>

      <View style={styles.tabContainer}>
        {renderTabButton("upload", "cloud-upload-outline", "Upload")}
        {renderTabButton("search", "search-outline", "Search")}
        {renderTabButton("manage", "folder-outline", "Manage")}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {activeTab === "upload" && (
        <DocumentUploader onUploadComplete={handleUploadComplete} />
      )}

      {activeTab === "search" && (
        <DocumentSearch onDocumentSelect={handleDocumentSelect} />
      )}

      {activeTab === "manage" && renderManageContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 24,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6c757d",
    lineHeight: 24,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  tabTextActive: {
    color: "#007AFF",
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: "white",
    margin: 16,
    padding: 20,
    borderRadius: 12,
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
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  documentsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 16,
  },
  documentItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  documentHeader: {
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
  documentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  retryButton: {
    padding: 4,
  },
  documentPreview: {
    fontSize: 14,
    color: "#495057",
    lineHeight: 20,
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  documentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  documentSize: {
    fontSize: 12,
    color: "#6c757d",
  },
  confidenceScore: {
    fontSize: 12,
    color: "#007AFF",
  },
  emptyContainer: {
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
  errorContainer: {
    backgroundColor: "#fff5f5",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  errorText: {
    fontSize: 14,
    color: "#c53030",
    marginLeft: 8,
    flex: 1,
  },
});
