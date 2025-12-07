import React, { ReactNode } from 'react';
import { StyleSheet, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

type Props = {
  children: ReactNode;
  style?: ViewStyle;

  edges?: Edge[];
};

const ScreenContainer = ({ children, style, edges = ['top', 'left', 'right'] }: Props) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }, style]}
      edges={edges}
    >
      <StatusBar
        barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenContainer;