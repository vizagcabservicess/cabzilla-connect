/**
 * Signup screen - mirrors web app SignupPage
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
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';
import { GoogleSignInButtonLazy } from '../components/GoogleSignInButtonLazy';

export function SignupScreen() {
  const navigation = useNavigation<any>();
  const { signup, socialSignup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignup = async (socialUser: { id: string; email: string; name: string; picture?: string }) => {
    setError('');
    setGoogleLoading(true);
    try {
      const response = await socialSignup({
        provider: 'google',
        providerId: socialUser.id,
        email: socialUser.email,
        name: socialUser.name,
        picture: socialUser.picture,
      });
      if (response.success) {
        navigation.navigate('ProfileHome');
      } else {
        setError(response.error || response.message || 'Google signup failed');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Google signup failed';
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedEmail || !trimmedPhone || !password) {
      setError('Please fill all fields');
      return;
    }
    if (trimmedPhone.length < 10) {
      setError('Phone must be at least 10 digits');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await signup({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
        role: 'customer',
      });
      if (response?.email_verification_required) {
        setError('');
        Alert.alert(
          'Verify your email',
          "We've sent a verification link to your email address. Please check your inbox and click the link to verify your account. Once verified, you can log in.",
          [{ text: 'OK', onPress: () => navigation.navigate('Login', { message: 'Verify your email to log in.' }) }]
        );
      } else if (response?.success || response?.message?.includes('successful')) {
        Alert.alert(
          'Verify your email',
          "We've sent a verification link to your email address. Please check your inbox and click the link to verify your account. Once verified, you can log in.",
          [{ text: 'OK', onPress: () => navigation.navigate('Login', { message: 'Verify your email to log in.' }) }]
        );
      } else {
        setError(response?.error || response?.message || 'Signup failed');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Signup failed';
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

          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.sub}>
            Sign up to manage your bookings and get special offers
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor={colors.gray600}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Email</Text>
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

            <Text style={[styles.label, { marginTop: 16 }]}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="1234567890"
              placeholderTextColor={colors.gray600}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.gray600}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR CONTINUE WITH</Text>
              <View style={styles.orLine} />
            </View>

            <GoogleSignInButtonLazy
              onSuccess={handleGoogleSignup}
              onError={(e) => setError(e.message)}
              disabled={loading || googleLoading}
              label="Continue with Google"
              style={styles.googleBtn}
            />
          </View>

          <TouchableOpacity
            style={styles.loginRow}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLabel}>Already have an account? </Text>
            <Text style={styles.loginLink}>Log in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 8, paddingBottom: 32 },
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLabel: { fontSize: 14, color: colors.gray600 },
  loginLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
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
});
