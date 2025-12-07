

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { useTheme, THEMES } from '../context/ThemeContext';

const CustomDrawer = (props: any) => {
  const { theme, changeTheme } = useTheme();
  const user = auth().currentUser;

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.card }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ backgroundColor: theme.primary }}>

        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.card }]}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.primary }}>
              {user?.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.email?.split('@')[0]}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <View style={[styles.drawerContent, { backgroundColor: theme.card }]}>
          <DrawerItem
            label="Ana Sayfa"
            icon={({ color, size }) => <Icon name="home-outline" color={theme.text} size={size} />}
            labelStyle={{ color: theme.text }}
            onPress={() => props.navigation.navigate('AnaSayfa')}
          />
          <DrawerItem
            label="Ayarlar"
            icon={({ color, size }) => <Icon name="settings-outline" color={theme.text} size={size} />}
            labelStyle={{ color: theme.text }}
            onPress={() => {}}
          />
          <DrawerItem
            label="Bildirimler"
            icon={({ color, size }) => <Icon name="notifications-outline" color={theme.text} size={size} />}
            labelStyle={{ color: theme.text }}
            onPress={() => {}}
          />
           <DrawerItem
            label="Yardım"
            icon={({ color, size }) => <Icon name="help-circle-outline" color={theme.text} size={size} />}
            labelStyle={{ color: theme.text }}
            onPress={() => {}}
          />
        </View>
      </DrawerContentScrollView>

      <View style={[styles.bottomSection, { borderTopColor: theme.border }]}>
        <Text style={[styles.themeTitle, { color: theme.subText }]}>Tema Seç</Text>


        <View style={styles.themeSelector}>
          {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.colorCircle,

                { backgroundColor: THEMES[key].circleColor },
                theme.name === THEMES[key].name && { borderWidth: 2, borderColor: theme.text }
              ]}
              onPress={() => changeTheme(key)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="log-out-outline" size={22} color="#f44336" />
            <Text style={{ marginLeft: 10, color: '#f44336', fontWeight: 'bold' }}>Çıkış Yap</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 30,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 10,
  },
  bottomSection: {
    padding: 20,
    borderTopWidth: 1,
  },
  themeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  themeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  logoutButton: {
    paddingVertical: 10,
  }
});

export default CustomDrawer;