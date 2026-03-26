import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Platform, KeyboardAvoidingView, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGetMessages, useSendMessage, useGetConversations } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useSound } from "@/hooks/useSound";

type Message = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { data: messages, isLoading, refetch } = useGetMessages(parseInt(id ?? "0"));
  const { data: conversations } = useGetConversations();
  const sendMessageMutation = useSendMessage();
  const { play } = useSound();
  const prevMsgCount = useRef(0);

  const conversation = (conversations ?? []).find(c => c.id === parseInt(id ?? "0"));
  const otherUser = conversation?.otherUser;

  useEffect(() => {
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (!messages) return;
    const count = messages.length;
    if (count > prevMsgCount.current && prevMsgCount.current > 0) {
      const newMsgs = (messages as Message[]).slice(prevMsgCount.current);
      if (newMsgs.some(m => m.senderId !== user?.id)) {
        play("message_received");
      }
    }
    prevMsgCount.current = count;
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    const content = text.trim();
    setText("");
    try {
      await sendMessageMutation.mutateAsync({ id: parseInt(id), data: { content } });
      play("message_received");
      refetch();
    } catch {
      setText(content);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const timeStr = new Date(item.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.messageSenderAvatar}>
            <Text style={styles.messageSenderAvatarText}>
              {otherUser?.name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerUser}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{otherUser?.name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={styles.headerName} numberOfLines={1}>{otherUser?.name ?? "..."}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={(messages ?? []) as Message[]}
            keyExtractor={item => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyText}>Henüz mesaj yok. İlk mesajı gönder!</Text>
              </View>
            }
          />
        )}

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextInput
            style={styles.input}
            placeholder="Mesaj yaz..."
            placeholderTextColor={Colors.light.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <Pressable
            style={({ pressed }) => [styles.sendBtn, !text.trim() && styles.sendBtnDisabled, pressed && { opacity: 0.8 }]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Feather name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
    backgroundColor: Colors.light.surface,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  headerUser: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, justifyContent: "center" },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center" },
  headerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.text, maxWidth: 160 },
  messageList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 8 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  messageRowMe: { justifyContent: "flex-end" },
  messageSenderAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.light.primary + "20", alignItems: "center", justifyContent: "center" },
  messageSenderAvatarText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 6 },
  bubbleMe: { backgroundColor: Colors.light.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.light.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.light.borderLight },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "right", marginTop: 4 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.7)" },
  emptyMessages: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  inputContainer: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.light.surface, borderTopWidth: 1, borderTopColor: Colors.light.borderLight,
  },
  input: {
    flex: 1, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 22,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text,
    maxHeight: 100, minHeight: 44,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: Colors.light.textMuted },
});
