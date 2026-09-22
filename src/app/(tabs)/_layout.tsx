import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, PlusCircle, User, PawPrint } from 'lucide-react-native';
import { PetConnectColors } from '../../constants/colors';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomMargin = Platform.OS === 'ios' ? insets.bottom + 6 : 14;

  return (
    <View style={[styles.tabBarContainer, { bottom: bottomMargin }]} pointerEvents="box-none">
      <View style={styles.tabBarPill}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let icon = null;
          if (route.name === 'index') {
            icon = (
              <Home
                size={22}
                color={isFocused ? '#FFFFFF' : '#56423C'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
            );
          } else if (route.name === 'search') {
            icon = (
              <Search
                size={22}
                color={isFocused ? '#FFFFFF' : '#56423C'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
            );
          } else if (route.name === 'add-pet') {
            icon = (
              <PlusCircle
                size={24}
                color={isFocused ? '#FFFFFF' : '#56423C'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
            );
          } else if (route.name === 'profile') {
            icon = (
              <User
                size={22}
                color={isFocused ? '#FFFFFF' : '#56423C'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={[styles.tabButton, isFocused && styles.activeTabButton]}
              activeOpacity={0.7}
            >
              {icon}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarAccessibilityLabel: 'Search tab',
        }}
      />
      <Tabs.Screen
        name="add-pet"
        options={{
          title: 'Add Pet',
          tabBarAccessibilityLabel: 'Add pet tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile tab',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 50,
  },
  tabBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 400,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 32,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  tabButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: PetConnectColors.primaryContainer,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
});

