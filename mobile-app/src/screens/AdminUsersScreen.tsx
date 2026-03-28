/**
 * Admin Users - full user management (mirrors web UserManagement)
 * Add user, list with role/auth/bookings, update role, delete, view dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminExtendedAPI, AdminUser } from '../services/adminExtendedAPI';

const ROLES = [
  { value: 'guest', label: 'Guest' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'driver', label: 'Driver' },
] as const;

export function AdminUsersScreen() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'guest' as const,
  });
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  /** Android Alert.alert allows at most 3 buttons — use a modal so Driver and all roles appear. */
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);

  const load = async () => {
    try {
      setError(null);
      const list = await adminExtendedAPI.usersList();
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleAddUser = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      Alert.alert('Validation', 'Name and email are required');
      return;
    }
    try {
      setAddLoading(true);
      await adminExtendedAPI.usersCreate({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim() || undefined,
        role: addForm.role,
      });
      setShowAddModal(false);
      setAddForm({ name: '', email: '', phone: '', role: 'guest' });
      load();
      Alert.alert('Success', 'User created successfully');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateRole = (u: AdminUser) => {
    setRoleModalUser(u);
  };

  const applyRoleFromModal = async (role: (typeof ROLES)[number]['value']) => {
    const u = roleModalUser;
    if (!u) return;
    const current = (u.role || 'guest') as string;
    if (role === current) {
      setRoleModalUser(null);
      return;
    }
    setRoleModalUser(null);
    await updateRole(u.id, role);
  };

  const updateRole = async (userId: number, role: string) => {
    try {
      setActionLoadingId(userId);
      await adminExtendedAPI.usersUpdateRole(userId, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = (u: AdminUser) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${u.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteUser(u.id) },
      ]
    );
  };

  const deleteUser = async (userId: number) => {
    try {
      setActionLoadingId(userId);
      await adminExtendedAPI.usersDelete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      Alert.alert('Success', 'User deleted');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewDashboard = (u: AdminUser) => {
    navigation.navigate('Dashboard', { viewAs: u.id, viewAsName: u.name });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>User Management</Text>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add User</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={18} color={colors.primary} />
          )}
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray600} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              load();
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {users.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.gray200} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            users.map((u) => (
              <View key={u.id} style={styles.card}>
                <View style={styles.cardMain}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="person-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{u.name}</Text>
                    <Text style={styles.cardSub}>{u.email}</Text>
                    {u.phone ? (
                      <Text style={styles.cardSub}>{u.phone}</Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>
                          {(u.role ?? '—').replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <Text style={styles.authText}>
                        {u.authProvider === 'google' ? 'Google' : 'Email'}
                      </Text>
                      <Text style={styles.bookingsText}>
                        {u.bookingsCount ?? 0} bookings
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleViewDashboard(u)}
                    disabled={!!actionLoadingId}
                  >
                    <Ionicons name="eye-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleUpdateRole(u)}
                    disabled={!!actionLoadingId}
                  >
                    {actionLoadingId === u.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(u)}
                    disabled={!!actionLoadingId}
                  >
                    <Ionicons name="person-remove-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={addForm.name}
                onChangeText={(t) => setAddForm((f) => ({ ...f, name: t }))}
                autoCapitalize="words"
              />
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                value={addForm.email}
                onChangeText={(t) => setAddForm((f) => ({ ...f, email: t }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                value={addForm.phone}
                onChangeText={(t) => setAddForm((f) => ({ ...f, phone: t }))}
                keyboardType="phone-pad"
              />
              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.rolePicker}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.roleOption,
                      addForm.role === r.value && styles.roleOptionActive,
                    ]}
                    onPress={() => setAddForm((f) => ({ ...f, role: r.value }))}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        addForm.role === r.value && styles.roleOptionTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddUser}
                disabled={addLoading}
              >
                {addLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={roleModalUser !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalUser(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setRoleModalUser(null)}
          />
          <View style={[styles.modalContent, styles.roleModalSheet]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Update Role</Text>
                {roleModalUser ? (
                  <Text style={styles.roleModalSubtitle} numberOfLines={2}>
                    {roleModalUser.name}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setRoleModalUser(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Select role</Text>
            <View style={styles.rolePicker}>
              {ROLES.map((r) => {
                const active = (roleModalUser?.role || 'guest') === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roleOption, active && styles.roleOptionActive]}
                    onPress={() => applyRoleFromModal(r.value)}
                    disabled={!!actionLoadingId && actionLoadingId === roleModalUser?.id}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        active && styles.roleOptionTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.roleModalCancel}
              onPress={() => setRoleModalUser(null)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  refreshBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cardSub: { fontSize: 13, color: colors.gray600, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  roleText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
  authText: { fontSize: 11, color: colors.gray600 },
  bookingsText: { fontSize: 11, color: colors.gray600 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  deleteBtn: { backgroundColor: '#fef2f2' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12 },
  errorText: {
    fontSize: 15,
    color: colors.gray600,
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  modalForm: { padding: 16, maxHeight: 320 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.foreground,
  },
  rolePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  roleOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  roleOptionText: { fontSize: 14, color: colors.gray600 },
  roleOptionTextActive: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  roleModalSheet: { maxHeight: '70%' as const },
  roleModalSubtitle: {
    fontSize: 14,
    color: colors.gray600,
    marginTop: 4,
    fontWeight: '500',
  },
  roleModalCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.gray600 },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
