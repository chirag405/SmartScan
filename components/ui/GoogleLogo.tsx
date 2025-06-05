import { View, StyleSheet } from 'react-native';

export const GoogleLogo = () => {
  return (
    <View style={styles.logo}>
      <View style={styles.g} />
      <View style={styles.o} />
      <View style={styles.o2} />
      <View style={styles.g2} />
      <View style={styles.e} />
    </View>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 2,
    overflow: 'hidden',
  },
  g: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#4285F4',
    borderRadius: 2,
    top: 9,
    left: 9,
  },
  o: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#DB4437',
    borderRadius: 2,
    top: 9,
    right: 9,
  },
  o2: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#DB4437',
    borderRadius: 2,
    bottom: 9,
    left: 9,
  },
  g2: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#4285F4',
    borderRadius: 2,
    bottom: 9,
    right: 9,
  },
  e: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: '#F4B400',
    borderRadius: 1,
    top: 16,
    left: 6,
  },
});
