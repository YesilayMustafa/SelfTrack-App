import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { RootStackParamList } from '../../App';
import ScreenContainer from '../components/ScreenContainer';
import { LogBox } from 'react-native';

// Firebase uyarılarını görmezden gel
LogBox.ignoreLogs([
  'This method is deprecated',
  'Method called was `collection`',
  'Module "firestore" has been deprecated',
]);

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !name || !username) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    const formattedUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_]+$/.test(formattedUsername)) {
        Alert.alert('Hata', 'Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir.');
        return;
    }

    setLoading(true);
    try {

      const usernameCheck = await firestore()
        .collection('users')
        .where('username', '==', formattedUsername)
        .get();

      if (!usernameCheck.empty) {
        Alert.alert('Hata', 'Bu kullanıcı adı zaten alınmış.');
        setLoading(false);
        return;
      }


      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      await firestore().collection('users').doc(userCredential.user.uid).set({
        name: name,
        email: email,
        username: formattedUsername,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });


    } catch (error: any) {
      Alert.alert('Kayıt Hatası', error.message);
    }
    setLoading(false);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        <Text style={styles.title}>Hesap Oluştur</Text>

        <TextInput
          style={styles.input}
          placeholder="Adınız Soyadınız"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />


        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          placeholderTextColor="#666"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="E-posta adresiniz"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Şifreniz"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre Tekrar"
          placeholderTextColor="#666"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>Hesap Oluştur</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Zaten hesabınız var mı? Giriş Yapın</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#000',
  },
  button: {
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#90CAF9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#2196F3',
    fontSize: 16,
  },
});

export default RegisterScreen;