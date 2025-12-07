import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { LogBox } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

// Firebase uyarılarını görmezden gel
LogBox.ignoreLogs([
  'This method is deprecated',
  'Method called was `collection`',
  'Module "firestore" has been deprecated',
]);
type ProgressScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Progress'>;
type ProgressScreenRouteProp = RouteProp<RootStackParamList, 'Progress'>;

type Props = {
  navigation: ProgressScreenNavigationProp;
  route: ProgressScreenRouteProp;
};

type Progress = {
  id: string;
  habitId: string;
  userId: string;
  userName: string;
  date: string;
  completed: boolean;
  createdAt: any;
};

type UserProgress = {
  [date: string]: {
    [userId: string]: boolean;
  };
};

const ProgressScreen: React.FC<Props> = ({ navigation, route }) => {
  const { habitId } = route.params;
  const { theme } = useTheme();
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [groupProgress, setGroupProgress] = useState<UserProgress>({});
  const [habitUsers, setHabitUsers] = useState<any[]>([]);
  const user = auth().currentUser;

  useEffect(() => {
    loadHabitUsers();
    checkTodayProgress();
    loadGroupProgress();
  }, [habitId]);

  const loadHabitUsers = async () => {
    try {
      const habitDoc = await firestore().collection('habits').doc(habitId).get();
      const habitData = habitDoc.data();

      if (habitData?.users) {
        const userPromises = habitData.users.map(async (userId: string) => {
          const userDoc = await firestore().collection('users').doc(userId).get();
          return { id: userId, ...userDoc.data() };
        });

        const usersData = await Promise.all(userPromises);
        setHabitUsers(usersData);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    }
  };


  const loadGroupProgress = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateString = sevenDaysAgo.toISOString().split('T')[0];

      const querySnapshot = await firestore()
        .collection('progress')
        .where('habitId', '==', habitId)
        .where('date', '>=', dateString)
        .get();

      const progressData: UserProgress = {};

      querySnapshot.forEach((doc) => {
        const progress = doc.data();
        const date = progress.date;
        const userId = progress.userId;

        if (!progressData[date]) {
          progressData[date] = {};
        }

        progressData[date][userId] = progress.completed;
      });

      setGroupProgress(progressData);
    } catch (error) {
      console.error('Grup ilerlemesi yüklenirken hata:', error);
    }
  };

  const checkTodayProgress = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    try {
      const querySnapshot = await firestore()
        .collection('progress')
        .where('habitId', '==', habitId)
        .where('userId', '==', user.uid)
        .where('date', '==', today)
        .get();

      setTodayCompleted(!querySnapshot.empty);
    } catch (error) {
      console.error('Bugünkü ilerleme kontrol hatası:', error);
    }
  };

  const toggleProgress = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const progressId = `${habitId}_${user.uid}_${today}`;

    try {
      if (todayCompleted) {

        await firestore().collection('progress').doc(progressId).delete();
        setTodayCompleted(false);
      } else {

        await firestore().collection('progress').doc(progressId).set({
          habitId,
          userId: user.uid,
          userName: user.email,
          date: today,
          completed: true,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        setTodayCompleted(true);
      }


      loadGroupProgress();
    } catch (error) {
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    }
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const renderProgressGrid = () => {
    const dates = getLast7Days();

    return (
      <View style={styles.gridContainer}>
        <Text style={styles.gridTitle}>Son 7 Gün - Grup İlerlemesi</Text>


        <View style={styles.gridHeader}>
          <Text style={styles.gridHeaderCell}>Tarih</Text>
          {habitUsers.map(user => (
            <Text key={user.id} style={styles.gridHeaderCell}>
              {user.email?.split('@')[0]}
            </Text>
          ))}
        </View>


        {dates.map(date => (
          <View key={date} style={styles.gridRow}>
            <Text style={styles.dateCell}>{date.split('-').reverse().slice(0, 2).join('/')}</Text>
            {habitUsers.map(user => (
              <View key={`${date}_${user.id}`} style={styles.statusCell}>
                {groupProgress[date]?.[user.id] ? (
                  <Text style={styles.completed}>✅</Text>
                ) : (
                  <Text style={styles.pending}>❌</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text }]}>Grup İlerleme Takibi</Text>

      <TouchableOpacity
        style={[styles.toggleButton, todayCompleted && styles.completedButton, { backgroundColor: theme.primary }]}
        onPress={toggleProgress}
      >
        <Text style={styles.toggleButtonText}>
          {todayCompleted ? 'Bugün Tamamlandı ✓' : 'Bugünü Tamamla'}
        </Text>
      </TouchableOpacity>

      {renderProgressGrid()}

      <Text style={[styles.infoText, { color: theme.subText }]}>
        ✅ = Tamamlandı, ❌ = Tamamlanmadı
      </Text>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  toggleButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  completedButton: {
    opacity: 0.7,
  },
  toggleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  gridContainer: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  gridHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingBottom: 10,
    marginBottom: 10,
  },
  gridHeaderCell: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dateCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  statusCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completed: {
    color: '#4CAF50',
    fontSize: 16,
  },
  pending: {
    color: '#f44336',
    fontSize: 16,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
  },
});

export default ProgressScreen;