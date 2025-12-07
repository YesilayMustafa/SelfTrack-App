import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface ProgressGridProps {
  habitUsers: User[];
  groupProgress: { [date: string]: { [userId: string]: boolean } };
}

const ProgressGrid: React.FC<ProgressGridProps> = ({ habitUsers, groupProgress }) => {
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

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
          <Text style={styles.dateCell}>
            {new Date(date).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit'
            })}
          </Text>
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

const styles = StyleSheet.create({
  gridContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  gridHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
    paddingBottom: 10,
    marginBottom: 10,
  },
  gridHeaderCell: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 10,
  },
  gridRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
  statusCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completed: {
    color: '#4CAF50',
    fontSize: 14,
  },
  pending: {
    color: '#f44336',
    fontSize: 14,
  },
});

export default ProgressGrid;