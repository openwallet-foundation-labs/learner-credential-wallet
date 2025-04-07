import React from 'react';
import { View } from 'react-native';
import AnimatedEllipsis from 'rn-animated-ellipsis';
import { useDynamicStyles } from '../../hooks';

import dynamicStyleSheet from './LoadingIndicatorDots.styles';

export default function LoadingIndicatorDots(): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet);

  return (
    <View style={styles.loadingContainer}>
      <AnimatedEllipsis style={styles.loadingDots} minOpacity={0.4} animationDelay={200} useNativeDriver={true}/>
    </View>
  );
}
