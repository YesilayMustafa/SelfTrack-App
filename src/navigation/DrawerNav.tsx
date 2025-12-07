function DrawerNav() {
  const { theme } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background, elevation: 0, shadowOpacity: 0 },
        headerTintColor: theme.text,
        headerTitle: '',
        drawerStyle: { backgroundColor: theme.card },
      }}
    >
      <Drawer.Screen name="AppTabs" component={MainTabs} />
      <Drawer.Screen name="CreateHabit" component={CreateHabitScreen} />
    </Drawer.Navigator>
  );
}
