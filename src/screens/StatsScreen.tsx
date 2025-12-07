import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { useHabits } from '../context/HabitContext';
import ScreenContainer from '../components/ScreenContainer';

const StatsScreen = () => {
  const { habits } = useHabits();
  const { theme } = useTheme();
  const user = auth().currentUser;

  const [stats, setStats] = useState({
    completedToday: 0,
    weeklyCompletion: 0,
    currentStreak: 0,
    totalCompletions: 0
  });

  useFocusEffect(
    useCallback(() => {
      if (user) {
        calculateRealStats();
      }
    }, [user, habits])
  );

  const calculateRealStats = async () => {
    try {
      // 1. Kullanıcının tüm geçmişini çek
      const progressQuery = await firestore()
        .collection('progress')
        .where('userId', '==', user?.uid)
        .get();

      const allProgressDocs = progressQuery.docs.map(doc => doc.data());

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // --- 1. BUGÜN KAÇ TANE YAPILDI? ---
      // Sadece bugünün tarihine sahip ve 'completed' olanları say
      const completedToday = allProgressDocs.filter(p => p.date === todayStr && p.completed).length;

      // --- 2. HAFTALIK BAŞARI (MATRIX HESAPLAMA) 🔥 ---
      // Burası çok önemli: Her bir alışkanlığı, son 7 günün her biriyle tek tek kıyaslayacağız.

      let totalValidDays = 0; // Payda (Olması gereken toplam tik sayısı)
      let totalCompletedInWeek = 0; // Pay (Atılan gerçek tik sayısı)

      // Son 7 günün tarihlerini oluştur
      const last7Days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
      }

      // Her bir alışkanlık için döngüye gir
      habits.forEach(habit => {
        // Alışkanlığın oluşturulma tarihini al
        let createdAtStr = "";
        if (habit.createdAt?.toDate) {
          createdAtStr = habit.createdAt.toDate().toISOString().split('T')[0];
        } else if (habit.createdAt?.seconds) {
          createdAtStr = new Date(habit.createdAt.seconds * 1000).toISOString().split('T')[0];
        } else {
          // Eğer tarih yoksa (eski veri) bugünü kabul et
          createdAtStr = todayStr;
        }

        // Son 7 günün her biri için kontrol et
        last7Days.forEach(dateStr => {
          // KURAL: Eğer o gün, alışkanlık henüz oluşturulmamışsa hesaba katma.
          // Yani: dateStr (Kontrol edilen gün) >= createdAtStr (Oluşturulma günü) olmalı.
          if (dateStr >= createdAtStr) {
            totalValidDays++; // Bu gün bu alışkanlık yapılmalıydı (Payda +1)

            // Peki yapılmış mı?
            // İLERLEME VERİSİNDE BU HABIT_ID VE BU TARİH VAR MI?
            const isDone = allProgressDocs.some(p =>
              p.habitId === habit.id && // Doğru alışkanlık
              p.date === dateStr &&     // Doğru gün
              p.completed               // Tamamlanmış
            );

            if (isDone) {
              totalCompletedInWeek++; // Evet yapılmış (Pay +1)
            }
          }
        });
      });

      // Yüzdeyi Hesapla
      let weeklyRate = 0;
      if (totalValidDays > 0) {
        weeklyRate = Math.round((totalCompletedInWeek / totalValidDays) * 100);
      }

      // --- 3. SERİ (STREAK) ---
      // (Burası zaten düzgündü, aynen koruyoruz)
      let streak = 0;
      let checkDate = new Date();

      // Bugün herhangi bir şey yapıldı mı?
      const hasActivityToday = allProgressDocs.some(p => p.date === todayStr && p.completed);
      if (hasActivityToday) streak++;

      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const dateStr = checkDate.toISOString().split('T')[0];
        // O tarihte HERHANGİ BİRİ yapıldı mı?
        const hasActivityOnDate = allProgressDocs.some(p => p.date === dateStr && p.completed);

        if (hasActivityOnDate) streak++;
        else break;
      }

      setStats({
        completedToday,
        weeklyCompletion: weeklyRate,
        currentStreak: streak,
        totalCompletions: allProgressDocs.length
      });

    } catch (error) {
      console.error('İstatistik hatası:', error);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>İstatistiklerim</Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{habits.length}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Toplam Alışkanlık</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.completedToday}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Bugün Tamamlanan</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>%{stats.weeklyCompletion}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Haftalık Başarı</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>🔥 {stats.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Günlük Seri</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Rozetler</Text>
          <View style={styles.badgesContainer}>
            <View style={[styles.badge, stats.totalCompletions < 1 && styles.badgeLocked]}>
              <Text style={styles.badgeEmoji}>{stats.totalCompletions >= 1 ? '🏆' : '🔒'}</Text>
              <Text style={[styles.badgeText, { color: theme.subText }]}>Başlangıç</Text>
            </View>
            <View style={[styles.badge, stats.currentStreak < 3 && styles.badgeLocked]}>
              <Text style={styles.badgeEmoji}>{stats.currentStreak >= 3 ? '💪' : '🔒'}</Text>
              <Text style={[styles.badgeText, { color: theme.subText }]}>İstikrar (3 Gün)</Text>
            </View>
            <View style={[styles.badge, stats.totalCompletions < 100 && styles.badgeLocked]}>
              <Text style={styles.badgeEmoji}>{stats.totalCompletions >= 100 ? '⭐' : '🔒'}</Text>
              <Text style={[styles.badgeText, { color: theme.subText }]}>Usta (100+)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { width: '48%', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statNumber: { fontSize: 32, fontWeight: 'bold', marginBottom: 5 },
  statLabel: { fontSize: 14, textAlign: 'center' },
  section: { padding: 20, borderRadius: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
  badgesContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  badge: { alignItems: 'center', width: 80 },
  badgeLocked: { opacity: 0.3 },
  badgeEmoji: { fontSize: 30, marginBottom: 5 },
  badgeText: { fontSize: 12, textAlign: 'center' },
});

export default StatsScreen;