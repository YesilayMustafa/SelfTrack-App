import React, { useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const FirebaseTest = () => {
  const testFirebaseConnection = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        Alert.alert('Hata', 'Kullanıcı girişi yok');
        return;
      }

      // Test verisi yaz
      const testData = {
        test: 'Firebase connection test',
        timestamp: firestore.FieldValue.serverTimestamp(),
        userId: user.uid
      };

      const docRef = await firestore().collection('test').add(testData);
      Alert.alert('Başarılı', `Firebase bağlantısı çalışıyor. Doküman ID: ${docRef.id}`);

      // Test verisini oku
      const doc = await firestore().collection('test').doc(docRef.id).get();
      Alert.alert('Test Verisi', `Okunan veri: ${JSON.stringify(doc.data())}`);

    } catch (error: any) {
      Alert.alert('Firebase Hatası', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Firebase Test" onPress={testFirebaseConnection} />
    </View>
  );
};

export default FirebaseTest;