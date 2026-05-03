import * as WebBrowser from 'expo-web-browser';

import AppShell from './navigation/AppShell';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  return <AppShell />;
}
