import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../components/ScreenContainer';
import { useTheme } from '../context/ThemeContext';
import { useHabits } from '../context/HabitContext';
import { useFocusEffect } from '@react-navigation/native';

const ProfileScreen = () => {
  const { theme } = useTheme();
  const { habits } = useHabits();

  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const [totalCompleted, setTotalCompleted] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  const currentUser = auth().currentUser;


  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        setUser(currentUser);
        loadUserData();
        calculateProfileStats();
      }
    }, [currentUser, habits])
  );

  const loadUserData = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(currentUser?.uid).get();
      if (userDoc.exists) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Kullanıcı verileri hatası:', error);
    }
  };


  const calculateProfileStats = async () => {
    try {
      const progressQuery = await firestore()
        .collection('progress')
        .where('userId', '==', currentUser?.uid)
        .orderBy('date', 'desc')
        .get();

      const allProgressDocs = progressQuery.docs.map(doc => doc.data());

      setTotalCompleted(allProgressDocs.length);

      let streak = 0;
      let checkDate = new Date();
      const todayStr = checkDate.toISOString().split('T')[0];


      const hasActivityToday = allProgressDocs.some(p => p.date === todayStr && p.completed);
      if (hasActivityToday) streak++;

      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasActivityOnDate = allProgressDocs.some(p => p.date === dateStr && p.completed);

        if (hasActivityOnDate) streak++;
        else break;
      }

      setCurrentStreak(streak);

    } catch (error) {
      console.error('Profil istatistik hatası:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          onPress: async () => {
            try {
              await auth().signOut();
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>


      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Profil</Text>
      </View>


      <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
        <View style={[styles.avatar, { backgroundColor: theme.background }]}>
          <Icon name="person" size={60} color={theme.subText} />
        </View>

        <Text style={[styles.name, { color: theme.text }]}>
          {userData?.name || 'Kullanıcı'}
        </Text>

        <Text style={[styles.username, { color: theme.primary }]}>
          @{userData?.username || 'kullanici_adi'}
        </Text>

        <Text style={[styles.email, { color: theme.subText }]}>
          {user?.email}
        </Text>


        <View style={styles.statsContainer}>
          <View style={styles.statItem}>

            <Text style={[styles.statNumber, { color: theme.primary }]}>{habits.length}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Hedef</Text>
          </View>

          <View style={styles.statItem}>

            <Text style={[styles.statNumber, { color: theme.primary }]}>{totalCompleted}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Tamamlanan</Text>
          </View>

          <View style={styles.statItem}>

            <Text style={[styles.statNumber, { color: theme.primary }]}>{currentStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Gün Streak</Text>
          </View>
        </View>
      </View>


      <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]}>
          <Icon name="settings" size={24} color={theme.text} />
          <Text style={[styles.menuText, { color: theme.text }]}>Ayarlar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]}>
          <Icon name="notifications" size={24} color={theme.text} />
          <Text style={[styles.menuText, { color: theme.text }]}>Bildirimler</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]}>
          <Icon name="help-circle" size={24} color={theme.text} />
          <Text style={[styles.menuText, { color: theme.text }]}>Yardım</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: 'transparent' }]} onPress={handleLogout}>
          <Icon name="log-out" size={24} color="#f44336" />
          <Text style={[styles.menuText, styles.logoutText]}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileCard: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  menuContainer: {
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  logoutText: {
    color: '#f44336',
  },
});

export default ProfileScreen;