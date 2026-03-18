/**
 * AdminComingSoonScreen - native placeholder for admin features not yet built in-app.
 * No WebView, no loading - instant native screen. Full features available on web admin.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'AdminComingSoon'>;

export function AdminComingSoonScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<Route>();
  const feature = params?.feature ?? 'This feature';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {feature}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={64} color={colors.primary} />
        </View>
        <Text style={styles.heading}>Coming Soon</Text>
        <Text style={styles.desc}>
          Full {feature} functionality is being built natively. For now, use the web admin panel for
          complete features.
        </Text>
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={20} color={colors.gray600} />
          <Text style={styles.hint}>Native admin features are being added in upcoming updates.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { padding: 4, minWidth: 32 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  hint: {
    flex: 1,
    fontSize: 13,
    color: colors.gray600,
  },
});
