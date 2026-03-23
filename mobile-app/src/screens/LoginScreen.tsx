/**
 * Login screen - mirrors web app LoginPage
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';
import { GoogleSignInButtonLazy } from '../components/GoogleSignInButtonLazy';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Login: { message?: string } }, 'Login'>>();
  const { login, socialLogin, socialSignup } = useAuth();
  const message = route.params?.message;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (socialUser: { id: string; email: string; name: string; picture?: string }) => {
    setError('');
    setGoogleLoading(true);
    try {
      const socialData = {
        provider: 'google' as const,
        providerId: socialUser.id,
        email: socialUser.email,
        name: socialUser.name,
        picture: socialUser.picture,
      };
      const response = await socialLogin(socialData);
      if (response.success) {
        navigation.navigate('ProfileHome');
      } else if (response.redirect_to_signup && response.social_data) {
        const signupResponse = await socialSignup({
          provider: 'google',
          providerId: response.social_data.providerId,
          email: response.social_data.email,
          name: response.social_data.name,
          picture: response.social_data.picture,
        });
        if (signupResponse.success) {
          navigation.navigate('ProfileHome');
        } else {
          setError(signupResponse.error || 'Sign up failed');
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
});
