import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import ScreenContainer from '../components/ScreenContainer';
import notifee, { TriggerType, RepeatFrequency, AndroidImportance } from '@notifee/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type HabitDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HabitDetail'>;
type HabitDetailScreenRouteProp = RouteProp<RootStackParamList, 'HabitDetail'>;

type Props = {
  navigation: HabitDetailScreenNavigationProp;
  route: HabitDetailScreenRouteProp;
};

type Habit = {
  id: string;
  name: string;
  description: string;
  frequency: string;
  targetType: 'binary' | 'pages' | 'minutes';
  targetValue: number;
  pointsPerUnit: number;
  notificationsEnabled: boolean;
  notificationTime: string;
  notificationMessage: string;
  users: string[];
  owner: string;
  createdAt: any;
};

type Progress = {
  id: string;
  date: string;
  completed: boolean;
  value: number;
  notes: string;
  points: number;
};

const HabitDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { habitId } = route.params;
  const { theme } = useTheme();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const user = auth().currentUser;

  useEffect(() => {
    if (habitId) {
      loadHabitData();
    }
  }, [habitId]);

const loadHabitData = async () => {
    try {
      setLoading(true);

      const habitDoc = await firestore().collection('habits').doc(habitId).get();
      if (habitDoc.exists) {
        setHabit({ id: habitDoc.id, ...habitDoc.data() } as Habit);

        const data = habitDoc.data() as Habit;
        setEditMessage(data.notificationMessage || '');
        if (data.notificationTime) {
          const [h, m] = data.notificationTime.split(':').map(Number);
          const d = new Date();
          d.setHours(h);
          d.setMinutes(m);
          setEditDate(d);
        }
      }

      if (user) {
        const progressQuery = await firestore()
          .collection('progress')
          .where('habitId', '==', habitId)
          .where('userId', '==', user.uid) // 🔥 KİLİT NOKTA: Kurala uyması için bunu ekledik
          .orderBy('date', 'desc')
          .limit(7)
          .get();

        const progressData: Progress[] = [];
        progressQuery.forEach(doc => {
          progressData.push({ id: doc.id, ...doc.data() } as Progress);
        });
        setProgress(progressData);
      }

    } catch (error: any) {
      console.error("Detay Yükleme Hatası:", error);
      if (error.message.includes('index')) {
        console.log("Lütfen terminaldeki linke tıklayıp index oluşturun.");
      }
      Alert.alert('Hata', 'Veriler yüklenirken sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async () => {
    if (!habit) return;

    try {
      const timeString = `${editDate.getHours().toString().padStart(2, '0')}:${editDate.getMinutes().toString().padStart(2, '0')}`;

      await firestore().collection('habits').doc(habitId).update({
        notificationMessage: editMessage,
        notificationTime: timeString,
        notificationsEnabled: true
      });

      await notifee.cancelNotification(habitId);

      const channelId = await notifee.createChannel({
        id: 'habit-reminders-high',
        name: 'Alışkanlık Bildirimleri',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      let triggerDate = new Date(Date.now());
      triggerDate.setHours(editDate.getHours());
      triggerDate.setMinutes(editDate.getMinutes());
      triggerDate.setSeconds(0);

      if (triggerDate.getTime() <= Date.now()) {
        triggerDate.setDate(triggerDate.getDate() + 1);
      }

      const trigger: any = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerDate.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
        alarmManager: true,
      };

      await notifee.createTriggerNotification(
        {
          id: habitId,
          title: '🔔 Alışkanlık Zamanı!',
          body: editMessage || `${habit.name} vakti geldi.`,
          android: { channelId, pressAction: { id: 'default' } },
        },
        trigger
      );

      Alert.alert('Başarılı', 'Bildirim ayarları güncellendi!');
      setIsEditing(false);
      loadHabitData();

    } catch (error: any) {
      Alert.alert('Hata', 'Güncelleme başarısız: ' + error.message);
    }
  };

  const markAsCompleted = async () => {
    if (!user || !habit) return;
    const today = new Date().toISOString().split('T')[0];
    const progressId = `${habitId}_${user.uid}_${today}`;

    try {
      let points = 0;
      let value = 0;
      if (habit.targetType === 'binary') {
        value = 1;
        points = habit.pointsPerUnit;
      }

      await firestore().collection('progress').doc(progressId).set({
        habitId,
        userId: user.uid,
        userName: user.email,
        date: today,
        completed: true,
        value,
        points,
        notes: '',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Harika! 🎉', 'Bugünkü görev tamamlandı.');
      loadHabitData();
    } catch (error: any) {
      console.error("Tamamlama Hatası:", error);
      Alert.alert('Hata', 'İlerleme kaydedilemedi: ' + error.message);
    }
  };

  const deleteHabit = () => {
    Alert.alert(
      'Alışkanlığı Sil',
      'Bu işlem geri alınamaz. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {

              await notifee.cancelNotification(habitId);
              await firestore().collection('habits').doc(habitId).delete();
              navigation.goBack();
            } catch (error) {
              Alert.alert('Hata', 'Silinirken bir hata oluştu');
            }
          },
        }
      ]
    );
  };


  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setEditDate(selectedDate);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!habit) return null;

  return (
    <ScreenContainer>
      <ScrollView style={styles.container}>

        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>{habit.name}</Text>
          {habit.description ? (
            <Text style={[styles.description, { color: theme.subText }]}>{habit.description}</Text>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
              🔔 Bildirim Ayarları
            </Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Icon name={isEditing ? "close-circle" : "create-outline"} size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <View style={{ marginTop: 15 }}>
              <Text style={[styles.label, { color: theme.text }]}>Saat:</Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontWeight:'bold' }}>
                  {editDate.getHours().toString().padStart(2,'0')}:{editDate.getMinutes().toString().padStart(2,'0')}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={editDate}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onTimeChange}
                />
              )}

              <Text style={[styles.label, { color: theme.text, marginTop: 10 }]}>Mesaj:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={editMessage}
                onChangeText={setEditMessage}
                placeholder="Bildirim mesajı..."
                placeholderTextColor={theme.subText}
              />

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={updateNotificationSettings}
              >
                <Text style={styles.saveButtonText}>Ayarları Kaydet</Text>
              </TouchableOpacity>
            </View>
          ) : (

            <View style={{ marginTop: 10 }}>
              <Text style={{ color: theme.subText }}>
                Saat: <Text style={{ color: theme.text, fontWeight:'bold' }}>{habit.notificationTime || 'Ayarlanmadı'}</Text>
              </Text>
              <Text style={{ color: theme.subText, marginTop: 5 }}>
                Mesaj: <Text style={{ color: theme.text }}>{habit.notificationMessage || 'Varsayılan'}</Text>
              </Text>
            </View>
          )}
        </View>


        <TouchableOpacity style={[styles.completeButton, { backgroundColor: theme.primary }]} onPress={markAsCompleted}>
          <Icon name="checkmark-circle" size={24} color="white" />
          <Text style={styles.completeButtonText}>Bugünü Tamamla</Text>
        </TouchableOpacity>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Son 7 Gün</Text>
          <View style={styles.progressGrid}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - i);
              const dateStr = date.toISOString().split('T')[0];
              const dayProgress = progress.find(p => p.date === dateStr);

              return (
                <View key={i} style={styles.dayContainer}>
                  <Text style={[styles.dayName, { color: theme.subText }]}>
                    {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][date.getDay()]}
                  </Text>
                  <View style={[
                    styles.dayCircle,
                    { backgroundColor: theme.background },
                    dayProgress?.completed && { backgroundColor: theme.primary }
                  ]}>
                    <Text style={[styles.dayText, { color: dayProgress?.completed ? 'white' : theme.text }]}>
                      {dayProgress?.completed ? '✓' : date.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={[styles.deleteButton, { backgroundColor: '#ffebee' }]} onPress={deleteHabit}>
          <Text style={styles.deleteButtonText}>Alışkanlığı Sil</Text>
        </TouchableOpacity>

        <View style={{height: 40}} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  description: { fontSize: 16 },
  section: { margin: 15, padding: 20, borderRadius: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { marginBottom: 5, fontWeight: '500' },
  input: { padding: 12, borderRadius: 8, borderWidth: 1 },
  saveButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  completeButton: { margin: 15, padding: 20, borderRadius: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  completeButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  progressGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  dayContainer: { alignItems: 'center' },
  dayName: { fontSize: 12, marginBottom: 5 },
  dayCircle: { width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontWeight: 'bold', fontSize: 12 },
  deleteButton: { margin: 15, padding: 15, borderRadius: 10, alignItems: 'center' },
  deleteButtonText: { color: '#f44336', fontWeight: 'bold' },
});

export default HabitDetailScreen;