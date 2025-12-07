import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useHabits, Habit } from '../context/HabitContext';
import { LogBox } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
// Firebase uyarılarını görmezden gel
LogBox.ignoreLogs([
  'This method is deprecated',
  'Method called was `collection`',
  'Module "firestore" has been deprecated',
]);

import ScreenContainer from '../components/ScreenContainer';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { habits, loading } = useHabits();
  const [todayProgress, setTodayProgress] = useState<{[key: string]: boolean}>({});
  const user = auth().currentUser;

  async function checkAndroidPermissions() {
    if (Platform.OS !== 'android') return;

    const settings = await notifee.requestPermission();
    if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
      Alert.alert('İzin Gerekli', 'Hatırlatıcılar için bildirim izni vermelisiniz.');
    }


    const notificationSettings = await notifee.getNotificationSettings();


    if (notificationSettings.android.alarm === AndroidNotificationSetting.DISABLED) {
      Alert.alert(
        'Alarm İzni Gerekli',
        'Bildirimlerin tam saatinde gelmesi için "Alarmlar ve Hatırlatıcılar" iznini açmanız gerekiyor.',
        [
          { text: 'Daha Sonra', style: 'cancel' },
          {
            text: 'Ayarları Aç',
            onPress: async () => {
              await notifee.openAlarmPermissionSettings();
            }
          }
        ]
      );
    }
  }

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      if (user && isMounted) {
        loadTodayProgress();
        checkAndroidPermissions();
      }

      return () => {
        isMounted = false;
      };
    }, [user, habits])
  );

  const loadTodayProgress = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const querySnapshot = await firestore()
        .collection('progress')
        .where('userId', '==', user.uid)
        .where('date', '==', today)
        .get();
      const progress: {[key: string]: boolean} = {};
      querySnapshot.forEach((doc) => {
        progress[doc.data().habitId] = doc.data().completed;
      });
      setTodayProgress(progress);
    } catch (error) { console.error(error); }
  };

  const toggleHabitProgress = async (habitId: string) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const progressId = `${habitId}_${user.uid}_${today}`;
    const isCompleted = !!todayProgress[habitId];
    setTodayProgress(prev => ({...prev, [habitId]: !isCompleted}));

    try {
      if (isCompleted) {
        await firestore().collection('progress').doc(progressId).delete();
      } else {
        await firestore().collection('progress').doc(progressId).set({
          habitId,
          userId: user.uid,
          userName: user.email,
          date: today,
          completed: true,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      setTodayProgress(prev => ({...prev, [habitId]: isCompleted}));
      Alert.alert('Hata', 'İşlem kaydedilemedi');
    }
  };

  const deleteHabit = async (habitId: string) => {
    Alert.alert('Sil', 'Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
          try { await firestore().collection('habits').doc(habitId).delete(); }
          catch (e) { Alert.alert('Hata', 'Silinemedi'); }
      }}
    ]);
  };


  const renderHabitItem = ({ item }: { item: Habit }) => (
    <View style={[styles.habitCard, { backgroundColor: theme.card }]}>
      <TouchableOpacity onPress={() => navigation.navigate('HabitDetail', { habitId: item.id })} style={styles.habitContent}>
        <View style={styles.habitHeader}>
          <Text style={[styles.habitName, { color: theme.text }]}>{item.name}</Text>
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); deleteHabit(item.id); }} style={styles.deleteButton}>
            <Icon name="trash" size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
        {item.description ? <Text style={[styles.habitDescription, { color: theme.subText }]}>{item.description}</Text> : null}
        <View style={styles.habitFooter}>
          <Text style={styles.habitFrequency}>
            {item.frequency === 'daily' ? 'Günlük' : item.frequency === 'weekly' ? 'Haftalık' : 'Aylık'}
          </Text>
          <TouchableOpacity
            style={[styles.progressButton, todayProgress[item.id] && styles.completedButton]}
            onPress={(e) => { e.stopPropagation(); toggleHabitProgress(item.id); }}>
            <Text style={styles.progressButtonText}>✓</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Alışkanlıklarım</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          {habits.length} alışkanlık • {Object.values(todayProgress).filter(Boolean).length} tamamlandı
        </Text>
      </View>

      <FlatList
        data={habits}
        renderItem={renderHabitItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="add-circle" size={60} color={theme.subText} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>Henüz alışkanlığınız yok</Text>
          </View>
        }
      />

     <TouchableOpacity
       style={[styles.addButton, { backgroundColor: theme.primary }]}
       onPress={() => navigation.navigate('CreateHabit')}
     >
       <Icon name="add" size={30} color="white" />
       <Text style={styles.addButtonText}>Yeni Alışkanlık</Text>
     </TouchableOpacity>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 14 },
  listContent: { padding: 15, paddingBottom: 80 },
  habitCard: { padding: 20, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  habitContent: {},
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  habitName: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  deleteButton: { padding: 5 },
  habitDescription: { marginBottom: 15, lineHeight: 20 },
  habitFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  habitFrequency: { fontWeight: '600', fontSize: 14, color: '#4CAF50' },
  progressButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  completedButton: { backgroundColor: '#4CAF50' },
  progressButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', padding: 40, marginTop: 50 },
  emptyText: { fontSize: 18, marginTop: 15 },
  addButton: { position: 'absolute', bottom: 20, right: 20, left: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});

export default HomeScreen;