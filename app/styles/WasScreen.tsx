/* eslint-disable react-native/no-color-literals */
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    color: 'white',
  },
  cameraContainer: { flex: 1 },
  scanner: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: 'white',
  },
  dataContainer: {
    flex: 1,
    width: '100%',
    padding: 10,
    color: 'white',
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'green',
    marginBottom: 20,
    textAlign: 'center',
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  dataItem: {
    fontSize: 16,
    marginBottom: 8,
  },
  dataKey: {
    fontWeight: 'bold',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});