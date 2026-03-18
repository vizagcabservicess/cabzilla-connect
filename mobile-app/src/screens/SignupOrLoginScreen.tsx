/**
 * Signup or Login screen - MakeMyTrip-style auth entry
 * Hero section, white card, email/password form, Google (coming soon), legal links
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';

type RouteParams = { SignupOrLogin: { message?: string } };
const PROMO_TEXT = 'Join thousands of happy travellers';

export function SignupOrLoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'SignupOrLogin'>>();
  const { login } = useAuth();
  const message = route.params?.message;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await login(email.trim(), password);
      if (response.success) {
        navigation.goBack();
      } else if (response.email_verification_required) {
        setError('Please verify your email before logging in. Check your inbox.');
      } else {
        setError(response.error || response.message || 'Login failed');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.hero}>
            <Text style={styles.heroText}>{PROMO_TEXT}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Signup or Login</Text>
            {message ? (
              <Text style={styles.message}>{message}</Text>
            ) : null}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.gray600}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.gray600}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              onSubmitEditing={handleSubmit}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>CONFIRM</Text>
              )}
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, styles.socialBtnDisabled]}
                onPress={() => {}}
                disabled
              >
                <Text style={styles.googleText}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => {}}
              >
                <Feather name="mail" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.signupRow}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.signupLabel}>Don't have an account? </Text>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => navigation.navigate('StaticContent', { contentKey: 'terms' })}
          >
            <Text style={styles.legalText}>
              By proceeding, you agree to our{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>,{' '}
              <Text style={styles.legalLink}>User Agreement</Text>, and{' '}
              <Text style={styles.legalLink}>T&Cs</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  backBtn: { position: 'absolute', top: 8, left: 16, zIndex: 10 },
  hero: {
    backgroundColor: '#0ea5e9',
    paddingTop: 64,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -16,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  message: { fontSize: 14, color: colors.gray600, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
  },
  error: { marginTop: 12, fontSize: 14, color: '#dc2626' },
  confirmBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.7 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { marginHorizontal: 12, fontSize: 12, color: colors.gray600 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 24 },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnDisabled: { opacity: 0.5 },
  googleText: { fontSize: 18, fontWeight: '700', color: colors.gray600 },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupLabel: { fontSize: 14, color: colors.gray600 },
  signupLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  legalRow: { paddingHorizontal: 24, marginTop: 24 },
  legalText: { fontSize: 12, color: colors.gray600, textAlign: 'center' },
  legalLink: { color: colors.primary, fontWeight: '500' },
});
