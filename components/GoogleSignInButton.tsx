import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { GoogleLogo } from './ui/GoogleLogo';

const GoogleSignInButton = () => {
  const { signInWithGoogle, loading, error } = useAuthStore();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, loading && styles.disabled]}
        onPress={loading ? undefined : signInWithGoogle}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <GoogleLogo />
            <Text style={styles.buttonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
  },
  disabled: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 10,
    width: 20,
    height: 20,
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 10,
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 14,
  },
});


export default GoogleSignInButton;
