import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../stores/authStore";
import { useDocumentStore } from "../../stores/documentStore";

interface DocumentUploaderProps {
  onUploadComplete?: (documentId: string) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadComplete,
  maxFileSize = 50, // 50MB default
  allowedTypes = [
    "image/*",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});

  const { uploadAndProcessDocument, loading, error } = useDocumentStore();
  const { user } = useAuthStore();

  const convertUriToBlob = async (
    uri: string,
    mimeType: string
  ): Promise<Blob> => {
    try {
      console.log("Converting URI to blob:", { uri, mimeType });

      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();

      console.log("Blob created:", {
        size: blob.size,
        type: blob.type,
      });

      if (blob.size === 0) {
        throw new Error("File could not be read or is empty");
      }

      return blob;
    } catch (error) {
      console.error("Error converting URI to blob:", error);
      throw new Error(
        `Failed to convert file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const validateFile = (file: {
    size: number;
    mimeType: string;
    name: string;
  }) => {
    // Check if file data is valid
    if (!file.size || file.size === 0) {
      Alert.alert(
        "Invalid File",
        "The selected file appears to be empty or corrupted. Please try selecting a different file."
      );
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      Alert.alert(
        "File Too Large",
        `File size (${fileSizeMB.toFixed(
          2
        )}MB) exceeds the maximum allowed size of ${maxFileSize}MB. Please choose a smaller file or compress the current one.`
      );
      return false;
    }

    // Normalize MIME type for better compatibility
    let normalizedMimeType = file.mimeType?.toLowerCase() || "";

    // Handle common MIME type variations
    if (!normalizedMimeType) {
      // Try to determine MIME type from file extension
      const extension = file.name.toLowerCase().split(".").pop();
      switch (extension) {
        case "jpg":
        case "jpeg":
          normalizedMimeType = "image/jpeg";
          break;
        case "png":
          normalizedMimeType = "image/png";
          break;
        case "gif":
          normalizedMimeType = "image/gif";
          break;
        case "pdf":
          normalizedMimeType = "application/pdf";
          break;
        case "txt":
          normalizedMimeType = "text/plain";
          break;
        case "doc":
          normalizedMimeType = "application/msword";
          break;
        case "docx":
          normalizedMimeType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
        default:
          normalizedMimeType = "application/octet-stream";
      }
    }

    // Check file type with improved logic
    const isAllowedType = allowedTypes.some((type) => {
      if (type.includes("*")) {
        const baseType = type.split("/")[0];
        return normalizedMimeType.startsWith(baseType);
      }
      return normalizedMimeType === type;
    });

    if (!isAllowedType) {
      const supportedTypesText = allowedTypes
        .map((type) => {
          if (type.includes("image")) return "Images (JPEG, PNG, GIF, etc.)";
          if (type.includes("pdf")) return "PDF documents";
          if (type.includes("msword")) return "Word documents";
          if (type.includes("text")) return "Text files";
          return type;
        })
        .filter((value, index, self) => self.indexOf(value) === index)
        .join(", ");

      Alert.alert(
        "Unsupported File Type",
        `File type "${normalizedMimeType}" is not supported.\n\nSupported formats:\n${supportedTypesText}`
      );
      return false;
    }

    return true;
  };

  const handleDocumentUpload = async (
    file: Blob,
    filename: string,
    mimeType: string
  ) => {
    if (!user?.id) {
      Alert.alert("Error", "Please log in to upload documents.");
      return;
    }

    try {
      setIsUploading(true);

      // Debug: Log file information
      console.log("File upload details:", {
        filename,
        mimeType,
        fileSize: file.size,
        fileType: file.type,
      });

      // Validate file size before upload
      if (file.size === 0) {
        throw new Error("File is empty or could not be read properly");
      }

      // Create a File-like object for the upload
      const fileObject = new File([file], filename, { type: mimeType });

      // Double-check the file object
      console.log("Created file object:", {
        name: fileObject.name,
        size: fileObject.size,
        type: fileObject.type,
      });

      const document = await uploadAndProcessDocument(
        fileObject,
        user.id,
        filename,
        user.email
      );

      if (document) {
        Alert.alert(
          "Upload Successful",
          "Your document has been uploaded and is being processed. You'll be notified when processing is complete.",
          [
            {
              text: "OK",
              onPress: () => onUploadComplete?.(document.id),
            },
          ]
        );
      } else {
        throw new Error("Failed to upload document");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Failed",
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during upload."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        if (
          !validateFile({
            size: asset.size || 0,
            mimeType: asset.mimeType || "application/octet-stream",
            name: asset.name,
          })
        ) {
          return;
        }

        const blob = await convertUriToBlob(
          asset.uri,
          asset.mimeType || "application/octet-stream"
        );
        await handleDocumentUpload(
          blob,
          asset.name,
          asset.mimeType || "application/octet-stream"
        );
      }
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  const pickImage = async () => {
    try {
      // Request camera roll permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photo library to upload images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        if (
          !validateFile({
            size: asset.fileSize || 0,
            mimeType: "image/jpeg",
            name: asset.fileName || `image_${Date.now()}.jpg`,
          })
        ) {
          return;
        }

        const blob = await convertUriToBlob(asset.uri, "image/jpeg");
        await handleDocumentUpload(
          blob,
          asset.fileName || `image_${Date.now()}.jpg`,
          "image/jpeg"
        );
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your camera to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        if (
          !validateFile({
            size: asset.fileSize || 0,
            mimeType: "image/jpeg",
            name: `camera_${Date.now()}.jpg`,
          })
        ) {
          return;
        }

        const blob = await convertUriToBlob(asset.uri, "image/jpeg");
        await handleDocumentUpload(
          blob,
          `camera_${Date.now()}.jpg`,
          "image/jpeg"
        );
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Document</Text>
        <Text style={styles.subtitle}>
          Choose a document, image, or take a photo to extract text and make it
          searchable
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            isUploading && styles.optionButtonDisabled,
          ]}
          onPress={pickDocument}
          disabled={isUploading || loading}
        >
          <View style={styles.optionContent}>
            <Ionicons name="document-outline" size={32} color="#007AFF" />
            <Text style={styles.optionTitle}>Choose Document</Text>
            <Text style={styles.optionDescription}>
              Select PDF, Word, or text files from your device
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            isUploading && styles.optionButtonDisabled,
          ]}
          onPress={pickImage}
          disabled={isUploading || loading}
        >
          <View style={styles.optionContent}>
            <Ionicons name="image-outline" size={32} color="#007AFF" />
            <Text style={styles.optionTitle}>Choose Image</Text>
            <Text style={styles.optionDescription}>
              Select images from your photo library
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            isUploading && styles.optionButtonDisabled,
          ]}
          onPress={takePhoto}
          disabled={isUploading || loading}
        >
          <View style={styles.optionContent}>
            <Ionicons name="camera-outline" size={32} color="#007AFF" />
            <Text style={styles.optionTitle}>Take Photo</Text>
            <Text style={styles.optionDescription}>
              Use your camera to capture a document
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {(isUploading || loading) && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.uploadingText}>
            {isUploading ? "Uploading document..." : "Processing document..."}
          </Text>
          <Text style={styles.uploadingSubtext}>
            This may take a few moments. We're extracting text and making it
            searchable.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Supported Formats</Text>
        <Text style={styles.infoText}>
          • Images: JPEG, PNG, GIF, BMP{"\n"}• Documents: PDF, Word (.doc,
          .docx){"\n"}• Text: Plain text files{"\n"}• Maximum file size:{" "}
          {maxFileSize}MB
        </Text>
      </View>
    </ScrollView>
  );
};

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
    fontSize: 28,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6c757d",
    lineHeight: 24,
  },
  optionsContainer: {
    padding: 16,
    gap: 12,
  },
  optionButton: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
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
  optionButtonDisabled: {
    opacity: 0.6,
  },
  optionContent: {
    alignItems: "center",
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
    marginTop: 12,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 20,
  },
  uploadingContainer: {
    backgroundColor: "white",
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginTop: 16,
    marginBottom: 8,
  },
  uploadingSubtext: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 20,
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
  infoContainer: {
    backgroundColor: "white",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
  },
});
