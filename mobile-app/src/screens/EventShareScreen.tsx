import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EventLiveBoard } from '../components/events/EventLiveBoard';
import type { AppRootParamList } from '../navigation/appRootTypes';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<AppRootParamList, 'EventShare'>;

export function EventShareScreen({ route }: Props) {
  const { token } = route.params;
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Event vehicles</Text>
      </View>
      <EventLiveBoard token={token} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 17, fontWeight: '700', color: colors.foreground },
});
