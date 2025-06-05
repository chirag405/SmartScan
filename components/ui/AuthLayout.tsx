import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import GoogleSignInButton from '../GoogleSignInButton';

export const AuthLayout = () => {
  const { loading, user } = useAuthStore();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (user) {
    return null; // User is authenticated, render app content instead
  }

  return (
    <View style={styles.container}>
      <GoogleSignInButton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
