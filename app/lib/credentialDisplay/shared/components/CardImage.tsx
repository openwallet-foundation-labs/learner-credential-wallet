import { MaterialCommunityIcons } from '@expo/vector-icons'
import React, { ComponentProps } from 'react'
import { Image, ImageSourcePropType, View } from 'react-native'
import { useDynamicStyles } from '../../../../hooks'
import { Color } from '../../../../styles'
import { createDynamicStyleSheet } from '../../../dynamicStyles'

type CardImageProps = {
  source: string | ImageSourcePropType | null
  accessibilityLabel?: string | null
  defaultIcon?: ComponentProps<typeof MaterialCommunityIcons>['name']
  size?: number
}

export default function CardImage({
  source,
  accessibilityLabel,
  defaultIcon = 'certificate',
  size
}: CardImageProps): React.ReactElement | null {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet)

  if (size === undefined) {
    size = theme.issuerIconSize
  }

  const containerStyle = { width: size, height: size }

  if (source === null) {
    return (
      <View style={[styles.imageContainer, containerStyle]}>
        <MaterialCommunityIcons
          name={defaultIcon}
          size={size - 4}
          color={Color.Gray800}
        />
      </View>
    )
  }

  // Determine if source is a string or already a valid image source
  const imageSource: ImageSourcePropType =
    typeof source === 'string' ? { uri: source } : source

  return (
    <View style={[styles.imageContainer, containerStyle]}>
      <Image
        source={imageSource}
        style={styles.image}
        accessible={true}
        accessibilityLabel={accessibilityLabel || 'issuer'}
        accessibilityRole="image"
      />
    </View>
  )
}

const dynamicStyleSheet = createDynamicStyleSheet(({ theme }) => ({
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain'
  },
  imageContainer: {
    width: theme.issuerIconSize,
    height: theme.issuerIconSize,
    backgroundColor: Color.White,
    borderRadius: 3,
    marginRight: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center'
  }
}))
