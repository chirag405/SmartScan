import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useAuthStore } from "../../stores/authStore";
import { useDocumentStore } from "../../stores/documentStore";

type UploadMethod = "document" | "camera" | "gallery" | null;

interface DocumentUploaderProps {
  onUploadComplete?: (documentId: string) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadComplete,
}) => {
  const colorScheme = useColorScheme();
  const [uploading, setUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { uploadAndProcessDocument } = useDocumentStore();
  const { user } = useAuthStore();

  const textColor = colorScheme === "dark" ? "#FFFFFF" : "#000000";
  const backgroundColor = colorScheme === "dark" ? "#1C1C1E" : "#F2F2F7";
  const cardBackground = colorScheme === "dark" ? "#2C2C2E" : "#FFFFFF";
  const buttonBackground = colorScheme === "dark" ? "#2C2C2E" : "#F2F2F7";

  const handleUpload = async (method: UploadMethod) => {
    try {
      setUploadMethod(method);
      setUploading(true);
      setUploadProgress(0);

      if (!user) {
        Alert.alert("Error", "You must be logged in to upload documents");
        setUploading(false);
        return;
      }

      let result;

      switch (method) {
        case "document":
          // Pick a document
          result = await DocumentPicker.getDocumentAsync({
            type: [
              "application/pdf",
              "image/jpeg",
              "image/png",
              "text/plain",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ],
            copyToCacheDirectory: true,
          });
          break;

        case "camera":
          // Take a photo
          const cameraPermission =
            await ImagePicker.requestCameraPermissionsAsync();
          if (!cameraPermission.granted) {
            Alert.alert(
              "Permission Required",
              "Camera permission is needed to take photos"
            );
            setUploading(false);
            return;
          }

          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          });
          break;

        case "gallery":
          // Pick from photo library
          const galleryPermission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!galleryPermission.granted) {
            Alert.alert(
              "Permission Required",
              "Photo library permission is needed to select images"
            );
            setUploading(false);
            return;
          }

          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          });
          break;

        default:
          setUploading(false);
          return;
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName =
        "name" in asset
          ? asset.name
          : fileUri.split("/").pop() ||
            `document-${Date.now()}.${fileUri.split(".").pop()}`;

      // Read the file as a blob
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists) {
        Alert.alert(
          "Error",
          "The selected file does not exist or is inaccessible"
        );
        setUploading(false);
        return;
      }

      // Check file size (limit to 50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      if (fileInfo.size > MAX_FILE_SIZE) {
        Alert.alert("Error", "File is too large (maximum 50MB)");
        setUploading(false);
        return;
      }

      // Read file as blob
      const fileBlob = await readFileAsBlob(fileUri);
      if (!fileBlob) {
        Alert.alert("Error", "Failed to read file");
        setUploading(false);
        return;
      }

      // Start upload with progress tracking
      try {
        // Upload to Supabase via our document store
        const document = await uploadAndProcessDocument(
          fileBlob,
          user.id,
          fileName,
          user.email
        );

        // Success!
        Alert.alert(
          "Success",
          "Document uploaded successfully. Processing will happen in the background.",
          [
            {
              text: "OK",
              onPress: () => {
                if (document && onUploadComplete) {
                  onUploadComplete(document.id);
                }
              },
            },
          ]
        );
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert(
          "Upload Failed",
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      } finally {
        setUploading(false);
        setUploadProgress(0);
        setUploadMethod(null);
      }
    } catch (error) {
      console.error("Error in handleUpload:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      setUploading(false);
      setUploadProgress(0);
      setUploadMethod(null);
    }
  };

  // Helper function to read file as Blob or File
  const readFileAsBlob = async (uri: string): Promise<Blob | File | null> => {
    try {
      if (Platform.OS === "web") {
        // On web, fetch the file and convert to blob
        const response = await fetch(uri);
        return await response.blob();
      } else {
        // On native, we can't create a proper Blob, so we'll use the file URI directly
        // and handle it in the backend with special processing for file URIs
        const fileInfo = await FileSystem.getInfoAsync(uri);

        // Create a File-like object that can be sent to the server
        // This isn't a real File/Blob but will be handled specially by uploadAndProcessDocument
        return {
          uri: uri,
          name: uri.split("/").pop() || "file",
          type: uri.endsWith(".pdf")
            ? "application/pdf"
            : uri.endsWith(".jpg") || uri.endsWith(".jpeg")
              ? "image/jpeg"
              : uri.endsWith(".png")
                ? "image/png"
                : "application/octet-stream",
          size: "size" in fileInfo ? fileInfo.size : 0,
        } as any;
      }
    } catch (error) {
      console.error("Error reading file:", error);
      return null;
    }
  };

  const getMethodLabel = (method: UploadMethod): string => {
    switch (method) {
      case "document":
        return "Uploading document...";
      case "camera":
        return "Uploading photo...";
      case "gallery":
        return "Uploading image...";
      default:
        return "Uploading...";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.card, { backgroundColor: cardBackground }]}>
        <Text style={[styles.title, { color: textColor }]}>
          Upload Document
        </Text>

        {uploading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={[styles.loadingText, { color: textColor }]}>
              {getMethodLabel(uploadMethod)}
            </Text>
            {uploadProgress > 0 && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${uploadProgress}%`, backgroundColor: "#007AFF" },
                  ]}
                />
                <Text style={styles.progressText}>
                  {Math.round(uploadProgress)}%
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: buttonBackground }]}
              onPress={() => handleUpload("document")}
            >
              <View>
                <Ionicons name="document-text" size={24} color="#007AFF" />
                <Text style={[styles.buttonText, { color: textColor }]}>
                  Choose File
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: buttonBackground }]}
              onPress={() => handleUpload("camera")}
            >
              <View>
                <Ionicons name="camera" size={24} color="#007AFF" />
                <Text style={[styles.buttonText, { color: textColor }]}>
                  Take Photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: buttonBackground }]}
              onPress={() => handleUpload("gallery")}
            >
              <View>
                <Ionicons name="images" size={24} color="#007AFF" />
                <Text style={[styles.buttonText, { color: textColor }]}>
                  From Gallery
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.supportedContainer}>
          <Text
            style={[
              styles.supportedText,
              { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
            ]}
          >
            Supported formats: PDF, JPG, PNG, TXT, DOC, DOCX
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  button: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  progressContainer: {
    width: "100%",
    height: 10,
    backgroundColor: "#E1E1E1",
    borderRadius: 5,
    marginTop: 16,
    overflow: "hidden",
    position: "relative",
  },
  progressBar: {
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    borderRadius: 5,
  },
  progressText: {
    position: "absolute",
    right: 0,
    top: 12,
    fontSize: 12,
    color: "#8E8E93",
  },
  supportedContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  supportedText: {
    fontSize: 12,
  },
});

// No default export needed since we're using named export
