import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../theme/colors';
import {
  loadSavedLead,
  loadVthMessages,
  openVthAi,
  sendVthMessage,
  startVthChat,
  subscribeVthAi,
  VTH_AI_NAME,
  VTH_QUICK_REPLIES,
  type VthMessage,
  type VthSender,
} from '../lib/vthAi';

const ACCENT = '#6D28D9';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function senderLabel(sender: VthSender, guestName: string): string {
  switch (sender) {
    case 'visitor':
      return guestName || 'You';
    case 'ai':
      return VTH_AI_NAME;
    case 'operator':
      return 'Support';
    case 'system':
      return VTH_AI_NAME;
    default: {
      const unexpected: never = sender;
      return unexpected;
    }
  }
}

export function VthAiAssistant() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<VthMessage[]>([]);

  useEffect(() => subscribeVthAi(() => setOpen(true)), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadSavedLead().then((lead) => {
      if (cancelled) return;
      setName(lead.name);
      setPhone(lead.phone);
      setReady(lead.ready);
      if (!lead.ready) return;
      setConnecting(true);
      void loadVthMessages()
        .then((rows) => {
          if (!cancelled) setMessages(rows);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setConnecting(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [open, messages, connecting, sending]);

  const begin = async () => {
    const trimmed = name.trim();
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (trimmed.length < 2) {
      setError('Please enter your name');
      return;
    }
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setConnecting(true);
    try {
      await startVthChat(trimmed, digits);
      setName(trimmed);
      setPhone(digits);
      setReady(true);
      setMessages(await loadVthMessages());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the assistant');
    } finally {
      setConnecting(false);
    }
  };

  const send = async (text: string) => {
    const body = text.trim();
    if (!body || sending) return;
    setDraft('');
    setError('');
    setSending(true);
    const optimistic: VthMessage = {
      id: `local-${Date.now()}`,
      sender: 'visitor',
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    try {
      setMessages(await sendVthMessage(body));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message could not be sent');
    } finally {
      setSending(false);
    }
  };

  const guestHasSpoken = messages.some((message) => message.sender === 'visitor');

  return (
    <>
      {!open ? (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 72 }]}
          onPress={() => openVthAi()}
          accessibilityLabel={`Open ${VTH_AI_NAME}`}
        >
          <Ionicons name="sparkles" size={18} color="#fff" />
          <View>
            <Text style={styles.fabTitle}>{VTH_AI_NAME}</Text>
            <Text style={styles.fabSub}>AI travel assistant</Text>
          </View>
        </TouchableOpacity>
      ) : null}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheetWrap, { marginBottom: Math.max(insets.bottom, 8) }]}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={18} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>
                  {VTH_AI_NAME} <Text style={styles.beta}>beta</Text>
                </Text>
                <Text style={styles.subtitle}>Vizag Taxi Hub assistance for you</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel="Close assistant">
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {!ready ? (
              <ScrollView contentContainerStyle={styles.gate} keyboardShouldPersistTaps="handled">
                <Text style={styles.gateTitle}>Before we chat</Text>
                <Text style={styles.gateHelp}>
                  Please share your name and mobile number so we can assist you better.
                </Text>
                <Text style={styles.label}>Your name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
                <Text style={styles.label}>Mobile number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity style={styles.startBtn} onPress={() => { void begin(); }} disabled={connecting}>
                  {connecting ? <ActivityIndicator color="#fff" /> : <Text style={styles.startText}>Start chatting</Text>}
                </TouchableOpacity>
                <Text style={styles.fine}>We use this only to help with your booking enquiry.</Text>
              </ScrollView>
            ) : (
              <View style={styles.chat}>
                <ScrollView ref={scrollRef} style={styles.threadScroll} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
                  <Text style={styles.welcome}>
                    {greeting()} Traveler! I'm {VTH_AI_NAME}, your Vizag Taxi Hub assistant. I can help with airport transfers, local packages, outstation trips, Araku tours, and more.
                  </Text>
                  {connecting ? <ActivityIndicator color={ACCENT} style={styles.spinner} /> : null}
                  {messages.map((message) => {
                    const mine = message.sender === 'visitor';
                    return (
                      <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                        <Text style={[styles.who, mine && styles.whoMine]}>{senderLabel(message.sender, name)}</Text>
                        <Text style={[styles.body, mine && styles.bodyMine]}>{message.body}</Text>
                      </View>
                    );
                  })}
                  {sending ? <Text style={styles.typing}>{VTH_AI_NAME} is replying…</Text> : null}
                  {!guestHasSpoken && !connecting ? (
                    <View style={styles.replies}>
                      <Text style={styles.replyPrompt}>Tell us how we can help you today!</Text>
                      {VTH_QUICK_REPLIES.map((reply) => (
                        <TouchableOpacity key={reply.id} style={styles.reply} onPress={() => { void send(reply.message); }} disabled={sending}>
                          <Text style={styles.replyText}>{reply.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                </ScrollView>
                <View style={styles.composer}>
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Type a message"
                    value={draft}
                    onChangeText={setDraft}
                    editable={!sending}
                    onSubmitEditing={() => { void send(draft); }}
                  />
                  <TouchableOpacity style={styles.send} onPress={() => { void send(draft); }} disabled={sending || !draft.trim()}>
                    <Ionicons name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.disclaimer}>AI can make mistakes. Check important info</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 16,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 8,
    shadowColor: '#6D28D9',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabTitle: { color: '#fff', fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 16 },
  fabSub: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.regular, fontSize: 10, lineHeight: 13 },
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheetWrap: { height: '78%' },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  badge: { width: 40, height: 40, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { color: ACCENT, fontFamily: fonts.bold, fontSize: 15 },
  beta: { color: '#94a3b8', fontFamily: fonts.semiBold, fontSize: 10, letterSpacing: 0.4 },
  subtitle: { color: '#64748b', fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  gate: { padding: 16, gap: 8 },
  gateTitle: { color: '#0f172a', fontFamily: fonts.semiBold, fontSize: 16 },
  gateHelp: { color: '#475569', fontFamily: fonts.regular, fontSize: 14, marginBottom: 8 },
  label: { color: '#334155', fontFamily: fonts.semiBold, fontSize: 13, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  startBtn: { marginTop: 8, backgroundColor: ACCENT, borderRadius: 999, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  startText: { color: '#fff', fontFamily: fonts.semiBold },
  fine: { color: '#94a3b8', fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', marginTop: 4 },
  chat: { flex: 1 },
  threadScroll: { flex: 1 },
  thread: { padding: 16, gap: 10 },
  welcome: { color: '#334155', fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  spinner: { marginVertical: 8 },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: ACCENT, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  who: { color: ACCENT, fontFamily: fonts.semiBold, fontSize: 10, marginBottom: 2 },
  whoMine: { color: 'rgba(255,255,255,0.8)' },
  body: { color: '#1e293b', fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodyMine: { color: '#fff' },
  typing: { color: '#94a3b8', fontFamily: fonts.regular, fontSize: 12 },
  replies: { gap: 8, marginTop: 4 },
  replyPrompt: { color: '#475569', fontFamily: fonts.regular, fontSize: 14 },
  reply: { borderWidth: 1.5, borderColor: '#c4b5fd', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  replyText: { color: '#334155', fontFamily: fonts.medium, fontSize: 14 },
  error: { color: '#e11d48', fontFamily: fonts.regular, fontSize: 12 },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    color: '#0f172a',
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { color: '#94a3b8', fontFamily: fonts.regular, fontSize: 10, textAlign: 'right', paddingHorizontal: 16, paddingTop: 6 },
});
