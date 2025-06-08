import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/authStore";
import { useDocumentStore } from "../../stores/documentStore";
import { Tables } from "../../types";

type Document = Tables<"documents">;

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7" },
      ]}
    >
      <Ionicons name={icon} size={24} color="#007AFF" style={styles.statIcon} />
      <Text
        style={[
          styles.statValue,
          { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.statTitle,
          { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
        ]}
      >
        {title}
      </Text>
    </View>
  );
};

interface DocumentItemProps {
  document: Document;
  onPress?: () => void;
}

const DocumentItem: React.FC<DocumentItemProps> = ({ document, onPress }) => {
  const colorScheme = useColorScheme();

  const getStatusColor = () => {
    switch (document.ocr_status) {
      case "completed":
        return "#34C759";
      case "processing":
        return "#FF9500";
      case "pending":
        return "#8E8E93";
      case "failed":
        return "#FF3B30";
      default:
        return "#8E8E93";
    }
  };

  const getStatusIcon = () => {
    switch (document.ocr_status) {
      case "completed":
        return "checkmark-circle";
      case "processing":
        return "time";
      case "pending":
        return "hourglass";
      case "failed":
        return "close-circle";
      default:
        return "hourglass";
    }
  };

  const getStatusText = () => {
    switch (document.ocr_status) {
      case "completed":
        return "Processed";
      case "processing":
        return "Processing";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const getDocumentIcon = () => {
    const fileType = document.file_type?.toLowerCase();
    switch (fileType) {
      case "pdf":
        return "document-text";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "image";
      default:
        return "document";
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.documentItem,
        { backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF" },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={getDocumentIcon() as keyof typeof Ionicons.glyphMap}
        size={24}
        color="#007AFF"
        style={styles.documentIcon}
      />
      <View style={styles.documentInfo}>
        <Text
          style={[
            styles.documentName,
            { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
          ]}
          numberOfLines={1}
        >
          {document.original_filename || "Untitled Document"}
        </Text>
        <View style={styles.statusContainer}>
          <Ionicons
            name={getStatusIcon() as keyof typeof Ionicons.glyphMap}
            size={14}
            color={getStatusColor()}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.documentSize,
          { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
        ]}
      >
        {(document.file_size_bytes / 1024 / 1024).toFixed(1)} MB
      </Text>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuthStore();
  const { documents, stats, loading, error, fetchDocuments, fetchUserStats } =
    useDocumentStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      await Promise.all([fetchDocuments(user.id), fetchUserStats(user.id)]);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUploadRedirect = () => {
    router.push("/(tabs)/documents");
  };

  const handleDocumentPress = (document: Document) => {
    // Navigate to documents tab for more details
    router.push("/(tabs)/documents");
  };

  const formatStorageSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  if (error) {
    console.error("Home screen error:", error);
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000000" : "#F2F2F7" },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
            ]}
          >
            Quick Stats
          </Text>
          <View style={styles.statsContainer}>
            <StatCard
              title="Documents"
              value={(stats?.totalDocuments || 0).toString()}
              icon="document-outline"
            />
            <StatCard
              title="Processed"
              value={(stats?.processedDocuments || 0).toString()}
              icon="checkmark-circle-outline"
            />
            <StatCard
              title="Storage"
              value={formatStorageSize(stats?.storageUsedMB || 0)}
              icon="cloud-outline"
            />
          </View>
        </View>

        {/* Go to Upload */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
            ]}
          >
            Upload Documents
          </Text>
          <TouchableOpacity
            style={[
              styles.uploadRedirectContainer,
              {
                backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF",
              },
            ]}
            onPress={handleUploadRedirect}
          >
            <View style={styles.uploadRedirectContent}>
              <View style={styles.uploadRedirectLeft}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={32}
                  color="#007AFF"
                  style={styles.uploadRedirectIcon}
                />
                <View>
                  <Text
                    style={[
                      styles.uploadRedirectTitle,
                      { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
                    ]}
                  >
                    Upload & Process Documents
                  </Text>
                  <Text
                    style={[
                      styles.uploadRedirectSubtitle,
                      { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
                    ]}
                  >
                    Go to Documents tab to upload files
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colorScheme === "dark" ? "#8E8E93" : "#8E8E93"}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
              ]}
            >
              Recent Documents
            </Text>
            {documents.length > 0 && (
              <TouchableOpacity onPress={onRefresh}>
                <Text style={styles.seeAllText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && documents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
                ]}
              >
                Loading documents...
              </Text>
            </View>
          ) : documents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
                ]}
              >
                No documents yet. Use the Documents tab to upload files!
              </Text>
            </View>
          ) : (
            <View style={styles.documentsContainer}>
              {documents.slice(0, 5).map((document) => (
                <DocumentItem
                  key={document.id}
                  document={document}
                  onPress={() => handleDocumentPress(document)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  seeAllText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: "center",
  },
  uploadRedirectContainer: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadRedirectContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  uploadRedirectLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  uploadRedirectIcon: {
    marginRight: 12,
  },
  uploadRedirectTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  uploadRedirectSubtitle: {
    fontSize: 14,
  },
  documentsContainer: {
    gap: 12,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentIcon: {
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  documentSize: {
    fontSize: 12,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
