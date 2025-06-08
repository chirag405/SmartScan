import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/authStore";
import { useConversationStore } from "../../stores/conversationStore";
import { useDocumentStore } from "../../stores/documentStore";
import { Tables } from "../../types";

type Message = Tables<"ai_messages">;
type Document = Tables<"documents">;

interface DocumentCardProps {
  document: Document;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  const colorScheme = useColorScheme();

  const getDocumentIcon = () => {
    const fileType = document.file_type?.toLowerCase();
    switch (fileType) {
      case "pdf":
        return "document-text-outline";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "image-outline";
      default:
        return "document-outline";
    }
  };

  const handleViewDocument = () => {
    Alert.alert(
      document.original_filename,
      `File Type: ${document.file_type}\nSize: ${(
        document.file_size_bytes /
        1024 /
        1024
      ).toFixed(2)} MB\nStatus: ${document.ocr_status}\nUploaded: ${new Date(
        document.created_at || ""
      ).toLocaleDateString()}`,
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <View
      style={[
        styles.documentCard,
        { backgroundColor: colorScheme === "dark" ? "#2C2C2E" : "#F2F2F7" },
      ]}
    >
      <View style={styles.documentHeader}>
        <Ionicons
          name={getDocumentIcon() as keyof typeof Ionicons.glyphMap}
          size={20}
          color="#007AFF"
        />
        <Text
          style={[
            styles.documentTitle,
            { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
          ]}
        >
          {document.original_filename}
        </Text>
      </View>
      <Text
        style={[
          styles.documentDetail,
          { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
        ]}
      >
        Type: {document.file_type?.toUpperCase()}
      </Text>
      <Text
        style={[
          styles.documentDetail,
          { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
        ]}
      >
        Status: {document.ocr_status || "Unknown"}
      </Text>
      <TouchableOpacity style={styles.viewButton} onPress={handleViewDocument}>
        <Text style={styles.viewButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );
};

interface MessageBubbleProps {
  message: Message;
  documents?: Document[];
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  documents,
}) => {
  const colorScheme = useColorScheme();
  const isUser = message.role === "user";

  // Parse referenced documents from message if they exist
  const referencedDocs =
    documents?.filter((doc) =>
      message.referenced_documents?.includes(doc.id)
    ) || [];

  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      {!isUser && (
        <View style={styles.assistantIcon}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          isUser
            ? { backgroundColor: "#007AFF" }
            : {
                backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF",
              },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: isUser
                ? "#FFFFFF"
                : colorScheme === "dark"
                ? "#FFFFFF"
                : "#000000",
            },
          ]}
        >
          {message.content}
        </Text>

        {referencedDocs.length > 0 && (
          <View style={styles.documentsContainer}>
            {referencedDocs.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </View>
        )}

        <Text
          style={[
            styles.timestamp,
            {
              color: isUser
                ? "rgba(255, 255, 255, 0.7)"
                : colorScheme === "dark"
                ? "#8E8E93"
                : "#8E8E93",
            },
          ]}
        >
          {new Date(message.created_at || "").toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
};

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    fetchConversations,
    createConversation,
    sendMessage,
    setCurrentConversation,
  } = useConversationStore();
  const { documents, fetchDocuments } = useDocumentStore();

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadData = async () => {
    if (!user) return;
    try {
      await Promise.all([fetchConversations(user.id), fetchDocuments(user.id)]);
    } catch (error) {
      console.error("Error loading chat data:", error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    const messageText = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      let conversationId = currentConversation?.id;

      // Create new conversation if none exists
      if (!conversationId) {
        conversationId = await createConversation(user.id, "New Chat");
      }

      await sendMessage(conversationId, messageText, user.id);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      setInputText(messageText); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const startNewChat = async () => {
    if (!user) return;

    try {
      await createConversation(user.id, "New Chat");
    } catch (error) {
      Alert.alert("Error", "Failed to create new chat");
    }
  };

  const selectConversation = (conversation: Tables<"ai_conversations">) => {
    setCurrentConversation(conversation);
  };

  if (error) {
    Alert.alert("Error", error);
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000000" : "#F2F2F7" },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF" },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text
              style={[
                styles.headerTitle,
                { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
              ]}
            >
              Smart Assistant
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
              ]}
            >
              {currentConversation
                ? currentConversation.title
                : "Ready to help"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
          <Ionicons
            name="add"
            size={24}
            color={colorScheme === "dark" ? "#FFFFFF" : "#000000"}
          />
        </TouchableOpacity>
      </View>

      {/* Conversation List (if no current conversation) */}
      {!currentConversation && conversations.length > 0 && (
        <View style={styles.conversationList}>
          <Text
            style={[
              styles.conversationListTitle,
              { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
            ]}
          >
            Recent Conversations
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {conversations.slice(0, 5).map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={[
                  styles.conversationItem,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF",
                  },
                ]}
                onPress={() => selectConversation(conversation)}
              >
                <Text
                  style={[
                    styles.conversationTitle,
                    { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
                  ]}
                  numberOfLines={1}
                >
                  {conversation.title}
                </Text>
                <Text
                  style={[
                    styles.conversationSubtitle,
                    { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
                  ]}
                >
                  {conversation.message_count || 0} messages
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#8E8E93" />
              <Text
                style={[
                  styles.emptyStateText,
                  { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
                ]}
              >
                Start a conversation with your AI assistant
              </Text>
              <Text
                style={[
                  styles.emptyStateSubtext,
                  { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
                ]}
              >
                Ask questions about your documents or get help with anything
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                documents={documents}
              />
            ))
          )}
        </ScrollView>

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF" },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colorScheme === "dark" ? "#2C2C2E" : "#F2F2F7",
                color: colorScheme === "dark" ? "#FFFFFF" : "#000000",
              },
            ]}
            placeholder="Ask me anything about your documents..."
            placeholderTextColor={
              colorScheme === "dark" ? "#8E8E93" : "#8E8E93"
            }
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !sending ? "#007AFF" : "#8E8E93",
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons
              name={sending ? "hourglass" : "send"}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
  },
  newChatButton: {
    padding: 8,
  },
  conversationList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  conversationListTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  conversationItem: {
    width: 120,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  conversationSubtitle: {
    fontSize: 12,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: "flex-end",
  },
  assistantMessage: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  documentsContainer: {
    marginTop: 8,
  },
  documentCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  documentDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  viewButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  viewButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
