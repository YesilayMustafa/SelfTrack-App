import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Keyboard,
  ActivityIndicator,
  Platform
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../components/ScreenContainer';
import { useTheme } from '../context/ThemeContext';
import notifee, { TriggerType, RepeatFrequency, AndroidImportance } from '@notifee/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type CreateHabitScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateHabit'>;

type Props = {
  navigation: CreateHabitScreenNavigationProp;
};

const CreateHabitScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();


  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [targetType, setTargetType] = useState<'binary' | 'pages' | 'minutes'>('binary');
  const [targetValue, setTargetValue] = useState('1');
  const [pointsPerUnit, setPointsPerUnit] = useState('1');
  const [loading, setLoading] = useState(false);


  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationDate, setNotificationDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const user = auth().currentUser;

  useFocusEffect(
    useCallback(() => {
      return () => {
        setLoading(false);
        setName('');
        setDescription('');
      };
    }, [])
  );

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setNotificationDate(selectedDate);
    }
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };


  async function scheduleHabitNotification(habitId: string, habitName: string, dateObj: Date, customMessage?: string) {
    try {
      if (Platform.OS === 'android') {
        const settings = await notifee.getNotificationSettings();
        if (settings.android.alarm === 0) {
          Alert.alert(
            'Alarm İzni Gerekli',
            'Bildirim için izin vermeniz gerekiyor.',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Ayarları Aç', onPress: async () => await notifee.openAlarmPermissionSettings() }
            ]
          );
          return;
        }
      }

      const channelId = await notifee.createChannel({
        id: 'habit-reminders-high',
        name: 'Alışkanlık Bildirimleri',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      let triggerDate = new Date(Date.now());
      triggerDate.setHours(dateObj.getHours());
      triggerDate.setMinutes(dateObj.getMinutes());
      triggerDate.setSeconds(0);

      if (triggerDate.getTime() <= Date.now()) {
        triggerDate.setDate(triggerDate.getDate() + 1);
      }

      const trigger: any = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerDate.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
        alarmManager: { allowWhileIdle: true },
      };

      await notifee.createTriggerNotification(
        {
          id: habitId,
          title: '🔔 Alışkanlık Zamanı!',

          body: customMessage ? customMessage : `${habitName} vakti geldi.`,
          android: {
            channelId,
            pressAction: { id: 'default' },
          },
        },
        trigger,
      );

    } catch (error: any) {
      console.error("Bildirim Hatası:", error);
      Alert.alert('Bildirim Hatası', error.message);
    }
  }

  const createHabit = async () => {
    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen alışkanlık adını girin');
      return;
    }

    if (!user) return;

    try {
      setLoading(true);

      const timeString = formatTime(notificationDate);

      const habitData = {
        name: name.trim(),
        description: description.trim(),
        frequency,
        targetType,
        targetValue: parseInt(targetValue) || 1,
        pointsPerUnit: parseInt(pointsPerUnit) || 1,
        notificationsEnabled: notificationsEnabled,
        notificationTime: notificationsEnabled ? timeString : '',
        notificationMessage: notificationsEnabled ? notificationMessage : '',
        users: [user.uid],
        owner: user.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await firestore().collection('habits').add(habitData);

      if (notificationsEnabled) {
        await scheduleHabitNotification(docRef.id, name, notificationDate, notificationMessage);
      }

      navigation.goBack();

    } catch (error: any) {
      setLoading(false);
      Alert.alert('Hata', error.message);
    }
  };

  const renderTargetInput = () => {
    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.label, {color: theme.text}]}>
          {targetType === 'pages' ? 'Sayfa Sayısı' : targetType === 'minutes' ? 'Dakika' : 'Puan'}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          value={targetType === 'binary' ? pointsPerUnit : targetValue}
          onChangeText={targetType === 'binary' ? setPointsPerUnit : setTargetValue}
          keyboardType="numeric"
          placeholderTextColor={theme.subText}
          placeholder="Değer giriniz"
        />
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Yeni Alışkanlık</Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>Hedeflerine yaklaş</Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Temel Bilgiler</Text>

          <Text style={[styles.label, { color: theme.text }]}>Alışkanlık Adı *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Örn: Kitap Okuma"
            placeholderTextColor={theme.subText}
          />

          <Text style={[styles.label, { color: theme.text }]}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Kısa bilgi..."
            placeholderTextColor={theme.subText}
            multiline
          />

          <Text style={[styles.label, { color: theme.text }]}>Sıklık</Text>
          <View style={styles.frequencyButtons}>
            {['daily', 'weekly', 'monthly'].map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  { backgroundColor: theme.background },
                  frequency === freq && { backgroundColor: theme.primary }
                ]}
                onPress={() => setFrequency(freq as any)}
              >
                <Text style={[
                  styles.frequencyText,
                  { color: theme.subText },
                  frequency === freq && { color: 'white', fontWeight: 'bold' }
                ]}>
                  {freq === 'daily' ? 'Günlük' : freq === 'weekly' ? 'Haftalık' : 'Aylık'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Hedef Türü</Text>
          <View style={styles.targetTypeButtons}>
            {['binary', 'pages', 'minutes'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.targetTypeButton,
                  { backgroundColor: theme.background, borderColor: theme.border },
                  targetType === type && { borderColor: theme.primary, backgroundColor: theme.background }
                ]}
                onPress={() => setTargetType(type as any)}
              >
                <Text style={{color: targetType === type ? theme.primary : theme.subText, fontWeight:'bold'}}>
                  {type === 'binary' ? '✓/✗' : type === 'pages' ? 'Sayfa' : 'Dakika'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderTargetInput()}
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.switchContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Bildirimler</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={'#f4f3f4'}
            />
          </View>

          {notificationsEnabled && (
            <View style={{ marginTop: 15 }}>
              <Text style={[styles.label, { color: theme.text }]}>Bildirim Saati</Text>

              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={[styles.timeButton, { backgroundColor: theme.background, borderColor: theme.border }]}
              >
                <Icon name="time-outline" size={24} color={theme.primary} />
                <Text style={[styles.timeButtonText, { color: theme.text }]}>
                  {formatTime(notificationDate)}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={notificationDate}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onTimeChange}
                />
              )}

              <Text style={[styles.label, { color: theme.text, marginTop: 15 }]}>Mesaj (İsteğe Bağlı)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={notificationMessage}
                onChangeText={setNotificationMessage}
                placeholder="Örn: Su içme vakti!"
                placeholderTextColor={theme.subText}
              />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]}
          onPress={createHabit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.createButtonText}>Oluştur</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 16 },
  section: { margin: 15, padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 8, marginTop: 15 },
  input: { padding: 15, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  inputGroup: { marginTop: 15 },
  frequencyButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  frequencyButton: { flex: 1, padding: 12, marginHorizontal: 5, borderRadius: 8, alignItems: 'center' },
  frequencyText: { fontSize: 14 },
  targetTypeButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  targetTypeButton: { flex: 1, padding: 15, marginHorizontal: 5, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  createButton: { margin: 20, padding: 20, borderRadius: 15, alignItems: 'center' },
  createButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeButton: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, borderWidth: 1, marginTop: 5 },
  timeButtonText: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
});

export default CreateHabitScreen;