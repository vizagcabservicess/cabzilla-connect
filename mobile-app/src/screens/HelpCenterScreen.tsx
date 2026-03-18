/**
 * HelpCenterScreen - native FAQ and help
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { HELP_FAQS } from '../data/staticContent';
import { colors } from '../theme/colors';

const PHONE = '+919966363662';

export function HelpCenterScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFaqs = HELP_FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          style={styles.search}
          placeholder="Search for help..."
          placeholderTextColor={colors.gray600}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {filteredFaqs.map((faq, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
              onPress={() => setExpandedIndex(isExpanded ? null : index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Feather
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.gray600}
                />
              </View>
              {isExpanded && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
            </TouchableOpacity>
          );
        })}
        {filteredFaqs.length === 0 && (
          <Text style={styles.noResults}>No results found. Try a different search term.</Text>
        )}
        <View style={styles.contactBanner}>
          <Text style={styles.contactTitle}>Still Need Help?</Text>
          <Text style={styles.contactSub}>
            Our support team is available 24/7.
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL(`tel:${PHONE}`)}
          >
            <Feather name="phone" size={20} color="#fff" />
            <Text style={styles.contactBtnText}>Call +91-9966363662</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 8, marginRight: 4 },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 12,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqItemExpanded: {
    borderColor: colors.primary,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.gray600,
    marginTop: 12,
    lineHeight: 22,
  },
  noResults: {
    fontSize: 15,
    color: colors.gray600,
    textAlign: 'center',
    paddingVertical: 24,
  },
  contactBanner: {
    backgroundColor: colors.foreground,
    borderRadius: 12,
    padding: 24,
    marginTop: 24,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  contactSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  contactBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
