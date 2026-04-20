import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';

export default function App() {
  const [screen, setScreen] = useState('login');

  return (
    <>
      <StatusBar style="light" />
      {screen === 'login' ? (
        <LoginScreen onGoToSignup={() => setScreen('signup')} />
      ) : (
        <SignupScreen onGoToLogin={() => setScreen('login')} />
      )}
    </>
  );
}
