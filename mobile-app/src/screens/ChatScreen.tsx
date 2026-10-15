import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getResolvedApiOrigin } from '../config';
import { colors } from '../theme/colors';

type Bubble = { id: string; from: 'assistant' | 'guest'; text: string };

const WELCOME: Bubble = {
  id: 'welcome',
  from: 'assistant',
  text: 'Hi, I am the Vizag Taxi Hub assistant. Tell me the trip you want: airport, outstation, hourly rental, or a tour.',
};

function replyFor(text: string): { text: string; trip?: 'airport' | 'outstation' | 'local' | 'tour' } {
  const lower = text.toLowerCase();
  if (lower.includes('airport')) {
    return { text: 'Airport transfer is ready in the app. Open it and choose your pickup time.', trip: 'airport' };
  }
  if (lower.includes('tour') || lower.includes('package')) {
    return { text: 'Tour packages are in the app. I can open them for you.', trip: 'tour' };
  }
  if (lower.includes('hour') || lower.includes('local') || lower.includes('rental')) {
    return { text: 'Hourly rentals are in the app. Choose the package that fits the day.', trip: 'local' };
  }
  return { text: 'Outstation trips are in the app. Add the pickup, drop, and date to see vehicles.', trip: 'outstation' };
}

export function ChatScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Bubble[]>([WELCOME]);
  const [leadSent, setLeadSent] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (!text || name.trim().length < 2 || phone.replace(/\D/g, '').length < 10) return;
    const guest: Bubble = { id: `${Date.now()}`, from: 'guest', text };
    const answer = replyFor(text);
    const assistant: Bubble = { id: `${Date.now()}-a`, from: 'assistant', text: answer.text };
    setMessages((prev) => [...prev, guest, assistant]);
    setDraft('');
    if (!leadSent) {
      setLeadSent(true);
      const origin = getResolvedApiOrigin() || 'https://www.vizagtaxihub.com';
      void fetch(`${origin}/api/track-vth-ai-lead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), page: '/app/chat' }),
      }).catch(() => undefined);
    }
    if (answer.trip) {
      (navigation.navigate as (name: string, params?: object) => void)('Main', {
        screen: 'Home',
        params: { initialTripType: answer.trip },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Chat</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.thread}>
          <View style={styles.guestCard}>
            <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </View>
          {messages.map((message) => (
            <View key={message.id} style={[styles.bubble, message.from === 'guest' ? styles.guest : styles.assistant]}>
              <Text style={[styles.bubbleText, message.from === 'guest' && styles.guestText]}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a trip"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => { void send(); }}
          />
          <TouchableOpacity style={styles.send} onPress={() => { void send(); }}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  thread: { padding: 16, gap: 10 },
  guestCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  assistant: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  guest: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  bubbleText: { color: '#0f172a', fontSize: 15, lineHeight: 21 },
  guestText: { color: '#fff' },
  composer: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  messageInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
});
