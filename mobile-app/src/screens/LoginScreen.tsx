/**
 * Login screen - mirrors web app LoginPage
 * Google: uses social-login.php (unified - auto-creates user on first login)
 * Phone prompt: if Google user has no phone, prompt before navigating
 */
import React, { useState } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useAuth } from '../providers/AuthProvider';
import { GoogleSignInButtonLazy } from '../components/GoogleSignInButtonLazy';
import { isGoogleNativeSignInConfigured } from '../config';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Login: { message?: string } }, 'Login'>>();
  const { login, socialLogin, updateProfile } = useAuth();
  const message = route.params?.message;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phonePromptLoading, setPhonePromptLoading] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  const handleGoogleSuccess = async (socialUser: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    idToken?: string;
  }) => {
    setError('');
    setGoogleLoading(true);
    try {
      const socialData = {
        provider: 'google' as const,
        providerId: socialUser.id,
        email: socialUser.email,
        name: socialUser.name,
        picture: socialUser.picture,
        ...(socialUser.idToken ? { id_token: socialUser.idToken } : {}),
      };
      const response = await socialLogin(socialData);
      if (response.success && response.user) {
        const needsPhone = !response.user.phone || String(response.user.phone).trim() === '';
        if (needsPhone) {
          setShowPhonePrompt(true);
        } else {
          navigation.navigate('ProfileHome');
        }
      } else {
        setError(response.error || response.message || 'Google login failed');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Google login failed';
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePhoneSubmit = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert('Invalid', 'Please enter a valid phone number (at least 10 digits)');
      return;
    }
    setPhonePromptLoading(true);
    try {
      await updateProfile({ phone: phoneInput.trim() });
      setShowPhonePrompt(false);
      setPhoneInput('');
      navigation.navigate('ProfileHome');
    } catch {
      Alert.alert('Error', 'Failed to save phone number');
    } finally {
      setPhonePromptLoading(false);
    }
  };

  const handlePhoneSkip = () => {
    setShowPhonePrompt(false);
    setPhoneInput('');
    navigation.navigate('ProfileHome');
  };

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
        navigation.navigate('ProfileHome');
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
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={styles.title}>Log in to your account</Text>
          <Text style={styles.sub}>
            {message || 'Welcome back! Please enter your details'}
          </Text>

          <View style={styles.form}>
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
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.gray600}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR CONTINUE WITH</Text>
              <View style={styles.orLine} />
            </View>

            <GoogleSignInButtonLazy
              onSuccess={handleGoogleSuccess}
              onError={(e) => setError(e.message)}
              disabled={loading || googleLoading}
              label="Continue with Google"
              style={styles.googleBtn}
            />
            {Platform.OS !== 'web' &&
            Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
            !isGoogleNativeSignInConfigured() ? (
              <Text style={styles.googleHint}>
                Google sign-in needs EXPO_PUBLIC_GOOGLE_CLIENT_ID (Web) and EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in
                .env or EAS secrets, then a new build. Add the EAS keystore SHA-1 to the Android OAuth client in
                Google Cloud.
              </Text>
            ) : null}
            {Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? (
              <Text style={styles.googleHint}>
                Google sign-in and remote push are not available in Expo Go. Use an EAS development or preview build
                (expo-dev-client).
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.signupRow}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.signupLabel}>Don't have an account? </Text>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPhonePrompt} transparent animationType="fade">
        <View style={styles.phoneModalOverlay}>
          <View style={styles.phoneModalContent}>
            <Text style={styles.phoneModalTitle}>Add your phone number</Text>
            <Text style={styles.phoneModalDesc}>
              Please add your phone number to complete your profile. This helps us contact you about your bookings.
            </Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="e.g. 9876543210"
              placeholderTextColor={colors.gray600}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              maxLength={15}
            />
            <View style={styles.phoneModalBtns}>
              <TouchableOpacity style={styles.phoneSkipBtn} onPress={handlePhoneSkip} disabled={phonePromptLoading}>
                <Text style={styles.phoneSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.phoneSaveBtn, phonePromptLoading && styles.btnDisabled]}
                onPress={handlePhoneSubmit}
                disabled={phonePromptLoading}
              >
                {phonePromptLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.phoneSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 8 },
  backBtn: { marginBottom: 24 },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  sub: { fontSize: 14, color: colors.gray600, marginBottom: 24 },
  form: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  forgotRow: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 4 },
  forgotLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  input: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: '#dc2626',
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupLabel: { fontSize: 14, color: colors.gray600 },
  signupLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  googleBtn: { marginTop: 0 },
  googleHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: colors.gray600,
  },
  phoneModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  phoneModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  phoneModalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  phoneModalDesc: { fontSize: 14, color: colors.gray600, marginBottom: 16 },
  phoneInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 20,
  },
  phoneModalBtns: { flexDirection: 'row', gap: 12 },
  phoneSkipBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  phoneSkipText: { fontSize: 16, fontWeight: '600', color: colors.gray600 },
  phoneSaveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneSaveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
