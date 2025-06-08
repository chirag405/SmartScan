import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import { Tables } from "../types";

type Conversation = Tables<"ai_conversations">;
type Message = Tables<"ai_messages">;

interface ConversationState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchConversations: (userId: string) => Promise<void>;
  createConversation: (userId: string, title?: string) => Promise<string>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    content: string,
    userId: string
  ) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  deleteConversation: (conversationId: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,

  fetchConversations: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      set({ conversations: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch conversations",
        loading: false,
      });
    }
  },

  createConversation: async (userId: string, title?: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: userId,
          title: title || "New Conversation",
          is_active: true,
          message_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        conversations: [data, ...state.conversations],
        currentConversation: data,
        messages: [],
        loading: false,
      }));

      return data.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create conversation",
        loading: false,
      });
      throw error;
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      set({ messages: data || [], loading: false });
    } catch (error) {
      console.error("Error fetching messages:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch messages",
        loading: false,
      });
    }
  },

  sendMessage: async (
    conversationId: string,
    content: string,
    userId: string
  ) => {
    try {
      // Add user message
      const { data: userMessage, error: userError } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          content,
          role: "user",
        })
        .select()
        .single();

      if (userError) throw userError;

      // Update messages immediately for user message
      set((state) => ({
        messages: [...state.messages, userMessage],
      }));

      // Update conversation last message time and message count
      await supabase
        .from("ai_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          message_count: get().messages.length + 1,
        })
        .eq("id", conversationId);

      // Simulate AI response (in a real app, this would call your AI service)
      setTimeout(async () => {
        try {
          const aiResponse = await generateAIResponse(content, userId);

          const { data: aiMessage, error: aiError } = await supabase
            .from("ai_messages")
            .insert({
              conversation_id: conversationId,
              user_id: userId,
              content: aiResponse,
              role: "assistant",
              model_used: "simulated-ai",
            })
            .select()
            .single();

          if (aiError) throw aiError;

          set((state) => ({
            messages: [...state.messages, aiMessage],
          }));

          // Update conversation again for AI message
          await supabase
            .from("ai_conversations")
            .update({
              last_message_at: new Date().toISOString(),
              message_count: get().messages.length,
            })
            .eq("id", conversationId);
        } catch (error) {
          console.error("Error generating AI response:", error);
        }
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to send message",
      });
    }
  },

  setCurrentConversation: (conversation: Conversation | null) => {
    set({ currentConversation: conversation, messages: [] });
    if (conversation) {
      get().fetchMessages(conversation.id);
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .update({ is_active: false })
        .eq("id", conversationId);

      if (error) throw error;

      set((state) => ({
        conversations: state.conversations.filter(
          (conv) => conv.id !== conversationId
        ),
        currentConversation:
          state.currentConversation?.id === conversationId
            ? null
            : state.currentConversation,
        messages:
          state.currentConversation?.id === conversationId
            ? []
            : state.messages,
      }));
    } catch (error) {
      console.error("Error deleting conversation:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete conversation",
      });
    }
  },
}));

// Simulated AI response function (replace with actual AI service)
async function generateAIResponse(
  userMessage: string,
  userId: string
): Promise<string> {
  // This is a simple simulation - in a real app, you'd call your AI service
  const responses = [
    "I understand your question. Let me help you with that.",
    "Based on your documents, here's what I found...",
    "That's a great question! Here's the information you need:",
    "I can help you with that. Let me search through your documents.",
    "Here's the analysis of your request:",
  ];

  // Check if user is asking about documents
  if (userMessage.toLowerCase().includes("document")) {
    try {
      const { data: documents, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .limit(5);

      if (!error && documents && documents.length > 0) {
        const docList = documents
          .map((doc) => `📄 ${doc.original_filename} (${doc.file_type})`)
          .join("\n");
        return `You have ${documents.length} documents:\n\n${docList}\n\nWould you like details about any specific document?`;
      }
    } catch (error) {
      console.error("Error fetching documents for AI response:", error);
    }
  }

  return responses[Math.floor(Math.random() * responses.length)];
}
