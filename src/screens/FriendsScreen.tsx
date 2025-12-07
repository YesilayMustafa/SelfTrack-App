import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Share,
  Linking
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import { LogBox } from 'react-native';


LogBox.ignoreLogs([
  'This method is deprecated',
  'Method called was `collection`',
  'Module "firestore" has been deprecated',
]);

import ScreenContainer from '../components/ScreenContainer';

import { useTheme } from '../context/ThemeContext';

const FriendsScreen = () => {

  const { theme } = useTheme();

  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const user = auth().currentUser;

  useEffect(() => {
    if (user) {
      loadFriends();
      loadFriendRequests();

      const checkLink = async () => {
        const url = await Linking.getInitialURL();
        if (url) processLink(url);
      };
      checkLink();

      const listener = Linking.addEventListener('url', ({ url }) => processLink(url));
      return () => listener.remove();
    }
  }, [user]);

  const processLink = (url: string) => {
    if (url.startsWith('selftrack://add/')) {
      const friendId = url.split('/').pop();
      if (friendId && friendId !== user?.uid) {
        Alert.alert(
          'Arkadaş Ekle',
          'Bağlantıdan gelen kişiyi eklemek istiyor musunuz?',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ekle', onPress: () => sendRequestById(friendId) }
          ]
        );
      }
    }
  };

  const shareMyLink = async () => {
    if (!user || !user.uid) {
      Alert.alert('Hata', 'Kullanıcı bilgisi yüklenemedi.');
      return;
    }
    try {
      await Share.share({
        title: 'SelfTrack Daveti',
        message: `SelfTrack'te beni ekle! Linke tıkla: selftrack://add/${user.uid}`,
        url: `selftrack://add/${user.uid}`
      });
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const copyToClipboard = () => {
    if (!user?.uid) return;
    const link = `selftrack://add/${user.uid}`;
    Clipboard.setString(link);
    Alert.alert('Kopyalandı', 'Davet linki panoya kopyalandı!');
  };

  const loadFriends = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(user?.uid).get();
      const userData = userDoc.data();

      if (userData?.friends) {
        const friendsPromises = userData.friends.map(async (friendId: string) => {
          const friendDoc = await firestore().collection('users').doc(friendId).get();
          return {
            id: friendId,
            ...friendDoc.data(),
            status: 'friend'
          };
        });
        const friendsData = await Promise.all(friendsPromises);
        setFriends(friendsData);
      }
    } catch (error) {
      console.error('Hata:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const requestsQuery = await firestore()
        .collection('friendRequests')
        .where('toUserId', '==', user?.uid)
        .where('status', '==', 'pending')
        .get();

      const requestsData: any[] = [];
      for (const doc of requestsQuery.docs) {
        const request = doc.data();
        const fromUserDoc = await firestore().collection('users').doc(request.fromUserId).get();
        requestsData.push({
          id: doc.id,
          ...request,
          fromUser: { id: request.fromUserId, ...fromUserDoc.data() }
        });
      }
      setFriendRequests(requestsData);
    } catch (error) {
      console.error('Hata:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!searchUsername.trim()) {
      Alert.alert('Hata', 'Lütfen kullanıcı adı girin');
      return;
    }
    setLoading(true);
    try {
      const usersQuery = await firestore()
        .collection('users')
        .where('username', '==', searchUsername.trim().toLowerCase())
        .get();

      if (usersQuery.empty) {
        Alert.alert('Hata', 'Kullanıcı bulunamadı');
        setLoading(false);
        return;
      }

      const toUser = usersQuery.docs[0];
      const toUserId = toUser.id;

      if (toUserId === user?.uid) {
        Alert.alert('Hata', 'Kendinize istek gönderemezsiniz');
        setLoading(false);
        return;
      }

      const currentUserDoc = await firestore().collection('users').doc(user?.uid).get();
      if (currentUserDoc.data()?.friends?.includes(toUserId)) {
        Alert.alert('Hata', 'Zaten arkadaşsınız');
        setLoading(false);
        return;
      }

      await firestore().collection('friendRequests').add({
        fromUserId: user?.uid,
        fromUserEmail: user?.email,
        toUserId: toUserId,
        toUserEmail: toUser.data().email,
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Başarılı', `İstek gönderildi: ${toUser.data().username}`);
      setSearchUsername('');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
    setLoading(false);
  };

  const sendRequestById = async (targetUserId: string) => {
     try {
       await firestore().collection('friendRequests').add({
          fromUserId: user?.uid,
          fromUserEmail: user?.email,
          toUserId: targetUserId,
          status: 'pending',
          createdAt: firestore.FieldValue.serverTimestamp(),
       });
       Alert.alert('Başarılı', 'İstek gönderildi');
     } catch(e) { Alert.alert('Hata', 'İstek gönderilemedi'); }
  };

  const acceptFriendRequest = async (requestId: string, fromUserId: string) => {
    try {
      await firestore().collection('friendRequests').doc(requestId).update({
        status: 'accepted',
        acceptedAt: firestore.FieldValue.serverTimestamp(),
      });
      await firestore().collection('users').doc(user?.uid).update({
        friends: firestore.FieldValue.arrayUnion(fromUserId),
      });
      await firestore().collection('users').doc(fromUserId).update({
        friends: firestore.FieldValue.arrayUnion(user?.uid),
      });
      Alert.alert('Başarılı', 'Kabul edildi');
      loadFriends();
      loadFriendRequests();
    } catch (error) { Alert.alert('Hata', 'İşlem başarısız'); }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await firestore().collection('friendRequests').doc(requestId).update({ status: 'rejected' });
      Alert.alert('Başarılı', 'Reddedildi');
      loadFriendRequests();
    } catch (error) { Alert.alert('Hata', 'İşlem başarısız'); }
  };

  const removeFriend = async (friendId: string) => {
    Alert.alert('Arkadaşı Sil', 'Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet', onPress: async () => {
          try {
            await firestore().collection('users').doc(user?.uid).update({
              friends: firestore.FieldValue.arrayRemove(friendId),
            });
            await firestore().collection('users').doc(friendId).update({
              friends: firestore.FieldValue.arrayRemove(user?.uid),
            });
            Alert.alert('Başarılı', 'Silindi');
            loadFriends();
          } catch (error) { Alert.alert('Hata', 'Silinemedi'); }
        }
      }
    ]);
  };

  const renderFriendItem = ({ item }: { item: any }) => (

    <View style={[styles.friendItem, { backgroundColor: theme.card }]}>
      <View style={styles.friendAvatar}>
        <Text style={styles.avatarText}>{item.email?.charAt(0).toUpperCase() || 'K'}</Text>
      </View>
      <View style={styles.friendInfo}>

        <Text style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
          {item.name || item.email?.split('@')[0]}
        </Text>
        <Text style={[styles.friendEmail, { color: theme.subText }]} numberOfLines={1}>
          @{item.username || 'kullanici'}
        </Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => removeFriend(item.id)}>
        <Text style={styles.removeButtonText}>Kaldır</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={[styles.requestItem, { backgroundColor: theme.card }]}>
      <View style={styles.friendAvatar}>
        <Text style={styles.avatarText}>{item.fromUser?.email?.charAt(0).toUpperCase() || 'K'}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: theme.text }]}>
          {item.fromUser?.name || 'Kullanıcı'}
        </Text>
        <Text style={[styles.requestText, { color: theme.subText }]}>Arkadaşlık isteği</Text>
      </View>
      <View style={styles.requestButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => acceptFriendRequest(item.id, item.fromUserId)}>
          <Text style={styles.actionButtonText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => rejectFriendRequest(item.id)}>
          <Text style={styles.actionButtonText}>✗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Arkadaşlarım</Text>

        <TouchableOpacity style={styles.actionButtonPrimary} onPress={shareMyLink}>
             <Icon name="share-social" size={20} color="white" />
             <Text style={styles.actionButtonText}>Davet Linkimi Paylaş</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButtonSecondary} onPress={copyToClipboard}>
             <Icon name="copy-outline" size={20} color="white" />
             <Text style={styles.actionButtonText}>Linki Kopyala</Text>
        </TouchableOpacity>

        <View style={[styles.tabContainer, { backgroundColor: theme.card }]}>
          <TouchableOpacity style={[styles.tab, activeTab === 'friends' && { backgroundColor: theme.primary }]} onPress={() => setActiveTab('friends')}>
            <Text style={[styles.tabText, { color: theme.subText }, activeTab === 'friends' && { color: 'white' }]}>
              Arkadaşlar ({friends.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'requests' && { backgroundColor: theme.primary }]} onPress={() => setActiveTab('requests')}>
            <Text style={[styles.tabText, { color: theme.subText }, activeTab === 'requests' && { color: 'white' }]}>
              İstekler ({friendRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.addFriendContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Arkadaş Ekle</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Kullanıcı adı girin "
              placeholderTextColor={theme.subText}
              value={searchUsername}
              onChangeText={setSearchUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }, loading && styles.disabledButton]} onPress={sendFriendRequest} disabled={loading}>
              <Text style={styles.addButtonText}>{loading ? '...' : 'Ekle'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'friends' ? (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.subText }]}>Henüz arkadaşınız yok</Text>
              </View>
            }
            style={styles.list}
          />
        ) : (
          <FlatList
            data={friendRequests}
            renderItem={renderRequestItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.subText }]}>Bekleyen istek yok</Text>
              </View>
            }
            style={styles.list}
          />
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  contentContainer: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },

  actionButtonPrimary: {
    backgroundColor: '#9C27B0', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  actionButtonSecondary: {
    backgroundColor: '#FF9800', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  actionButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 16 },

  tabContainer: { flexDirection: 'row', borderRadius: 10, marginBottom: 20, overflow: 'hidden' },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  tabText: { fontWeight: '600' },

  addFriendContainer: { padding: 20, borderRadius: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  inputContainer: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, padding: 15, borderRadius: 10, marginRight: 10, borderWidth: 1 },

  addButton: { padding: 15, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  disabledButton: { opacity: 0.7 },
  addButtonText: { color: 'white', fontWeight: 'bold' },

  list: { flex: 1 },
  friendItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, marginBottom: 10 },
  requestItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, marginBottom: 10 },

  friendAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  friendEmail: { fontSize: 14 },
  requestText: { fontSize: 12 },

  removeButton: { backgroundColor: '#ffebee', padding: 8, borderRadius: 5 },
  removeButtonText: { color: '#f44336', fontSize: 12, fontWeight: '600' },
  requestButtons: { flexDirection: 'row' },
  actionButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  acceptButton: { backgroundColor: '#4CAF50' },
  rejectButton: { backgroundColor: '#f44336' },
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, marginBottom: 5 },
});

export default FriendsScreen;