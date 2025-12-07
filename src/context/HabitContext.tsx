

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export type Habit = {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  targetType: 'binary' | 'pages' | 'minutes';
  targetValue: number;
  pointsPerUnit: number;
  notificationsEnabled: boolean;
  notificationTime: string;
  notificationMessage: string;
  users: string[];
  owner: string;
  createdAt: any;
  updatedAt?: any;
};

type HabitContextType = {
  habits: Habit[];
  loading: boolean;
  refreshHabits: () => void;
};

const HabitContext = createContext<HabitContextType | undefined>(undefined);

export const HabitProvider = ({ children }: { children: ReactNode }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth().currentUser;

  useEffect(() => {
    let unsubscribe: () => void;

    if (user) {
      setLoading(true);
      unsubscribe = firestore()
        .collection('habits')
        .where('users', 'array-contains', user.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          (querySnapshot) => {
            const habitsData: Habit[] = [];
            querySnapshot.forEach((documentSnapshot) => {
              habitsData.push({
                id: documentSnapshot.id,
                ...documentSnapshot.data(),
              } as Habit);
            });

            setHabits(habitsData);
            setLoading(false);
          },
          (error) => {
            console.error('Context Hatası:', error);
            setLoading(false);
          }
        );
    } else {
      setHabits([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  return (
    <HabitContext.Provider value={{ habits, loading, refreshHabits: () => {} }}>
      {children}
    </HabitContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within a HabitProvider');
  }
  return context;
};