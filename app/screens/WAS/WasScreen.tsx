import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavHeader } from '../../components';
import { navigationRef } from '../../navigation';

const WASScreen = () => {
  return (
    <>
      <NavHeader
        title="W.A.S"
        goBack={navigationRef.goBack}
      />
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.text}>Hello!</Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    color: 'white',
  },
});

export default WASScreen;
