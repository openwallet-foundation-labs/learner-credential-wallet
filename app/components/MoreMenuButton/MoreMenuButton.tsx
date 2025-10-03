import React, { Children, cloneElement, ElementType, isValidElement, ReactElement, ReactNode, useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Modal, TouchableOpacity, Dimensions } from 'react-native';

import dynamicStyleSheet from './MoreMenuButton.styles';
import { useDynamicStyles } from '../../hooks';

type MoreMenuButtonProps = {
  children: ReactNode;
}

export default function MoreMenuButton({ children }: MoreMenuButtonProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet);
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<View>(null);

  function onPressButton() {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((pageX, pageY, width, height) => {
        // Check if we have valid numbers (not undefined, not NaN)
        const validX = typeof pageX === 'number' && !isNaN(pageX);
        const validY = typeof pageY === 'number' && !isNaN(pageY);
        const validWidth = typeof width === 'number' && !isNaN(width);
        const validHeight = typeof height === 'number' && !isNaN(height);
        
        if (validX && validY && validWidth && validHeight) {
          const screenHeight = Dimensions.get('window').height;
          // Menu has 4 items * 60px height + padding/margins = ~280px
          const menuHeight = 280;
          const spaceBelow = screenHeight - (pageY + height);
          
          // If not enough space below, position menu above the button
          const menuTop = spaceBelow < menuHeight 
            ? pageY - menuHeight 
            : pageY + height;
          
          setPosition({ 
            top: Math.max(0, menuTop), 
            left: Math.max(0, pageX + width - 140)
          });
        } else {
          // Fallback to default position if measurement fails
          setPosition({ 
            top: 100, 
            left: 100
          });
        }
        setMenuIsOpen(true);
      });
    } else {
      // If ref is not available, use fallback
      setPosition({ top: 100, left: 100 });
      setMenuIsOpen(true);
    }
  }

  function closeMenu() {
    setMenuIsOpen(false);
  }

  const mappedChildren = Children.map(children, (child) => {
    if (isValidElement(child) && hasOnPressProp(child)) {
      const { onPress, ...restProps } = child.props;

      return cloneElement(child, {
        ...restProps,
        onPress: () => {
          closeMenu();
          onPress();
        },
      });
    }

    return child;
  });

  return (
    <>
      <View style={styles.menuWrapper}>
        <TouchableOpacity
          ref={buttonRef}
          style={[styles.buttonContainer, menuIsOpen && styles.buttonContainerActive]}
          accessibilityLabel="More options"
          accessibilityRole="button"
          accessibilityState={{ expanded: menuIsOpen }}
          onPress={onPressButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="more-vert"
            style={mixins.headerIcon}
          />
        </TouchableOpacity>
      </View>
      
      {menuIsOpen && position.top > 0 && (
        <Modal
          visible={true}
          transparent={true}
          animationType="none"
          onRequestClose={closeMenu}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={closeMenu}
          >
            <View 
              style={[
                mixins.shadow,
                styles.menuContainerPortal,
                { top: position.top, left: position.left }
              ]}
              onStartShouldSetResponder={() => true}
            >
              {mappedChildren}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

type ElementWithOnPress = ElementType & {
  props: {
    onPress: () => void;
  }
}

function hasOnPressProp(child: unknown): child is ElementWithOnPress {
  return React.isValidElement(child) && (child as ReactElement<{ onPress?: () => void }>).props.onPress !== undefined;
}
