import React, { useState } from 'react'
import { Text, View } from 'react-native'
import DropDownPicker, {
  DropDownPickerProps,
  ValueType
} from 'react-native-dropdown-picker'

import { useDynamicStyles } from '../../hooks'
import dynamicStyleSheet from './SelectPicker.styles'

type SelectPickerProps<T> = DropDownPickerProps<T> & {
  label: string
  onChangeValue: DropDownPickerProps<T>['setValue']
  multiple?: never
}

export default function SelectPicker<T extends ValueType>({
  items: initialItems,
  value,
  onChangeValue,
  label
}: SelectPickerProps<T>): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState(initialItems)

  return (
    <View style={styles.headerComponentContainer}>
      <Text style={styles.dropDownLabel}>{label}</Text>
      <DropDownPicker
        theme="DARK"
        zIndex={1}
        style={styles.dropDownPicker}
        dropDownContainerStyle={styles.dropDownPickerDrawer}
        textStyle={styles.dropDownPickerText}
        listItemContainerStyle={styles.dropDownItem}
        selectedItemContainerStyle={styles.dropDownItemSelected}
        open={isOpen}
        value={value}
        items={items}
        setOpen={setIsOpen}
        setValue={onChangeValue}
        setItems={setItems}
      />
    </View>
  )
}
