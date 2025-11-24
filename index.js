import './shim.js'
import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'
import 'react-native-gesture-handler'
import { registerRootComponent } from 'expo'

import App from './App'

/**
 * Realm won't work unless it exists globally.
 */
import Realm from 'realm'
global.Realm = Realm
globalThis.Realm = Realm

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
