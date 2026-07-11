import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { restoreSession, onUnauthorized } from './src/auth/session';
import { LoginScreen } from './src/screens/LoginScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { ThreadScreen } from './src/screens/ThreadScreen';
import { MessageScreen } from './src/screens/MessageScreen';
import { ComposeScreen } from './src/screens/ComposeScreen';
import { colors } from './src/theme';
import type { RootStackParamList } from './src/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
	...DarkTheme,
	colors: {
		...DarkTheme.colors,
		background: colors.background,
		card: colors.background,
		text: colors.text,
		border: colors.border,
		primary: colors.accent
	}
};

type AuthState = 'loading' | 'signedOut' | 'signedIn';

export default function App() {
	const [authState, setAuthState] = useState<AuthState>('loading');

	useEffect(() => {
		onUnauthorized(() => setAuthState('signedOut'));
		restoreSession()
			.then((ok) => setAuthState(ok ? 'signedIn' : 'signedOut'))
			.catch(() => setAuthState('signedOut'));
	}, []);

	const handleSignedOut = useCallback(() => setAuthState('signedOut'), []);

	if (authState === 'loading') {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: colors.background,
					alignItems: 'center',
					justifyContent: 'center'
				}}
			>
				<ActivityIndicator color={colors.accent} size="large" />
				<StatusBar style="light" />
			</View>
		);
	}

	if (authState === 'signedOut') {
		return (
			<>
				<LoginScreen onSignedIn={() => setAuthState('signedIn')} />
				<StatusBar style="light" />
			</>
		);
	}

	return (
		<NavigationContainer theme={theme}>
			<Stack.Navigator
				screenOptions={{
					headerStyle: { backgroundColor: colors.background },
					headerTintColor: colors.text,
					headerTitleStyle: { color: colors.text }
				}}
			>
				<Stack.Screen name="Inbox" options={{ headerShown: false }}>
					{(props) => <InboxScreen {...props} onSignedOut={handleSignedOut} />}
				</Stack.Screen>
				<Stack.Screen
					name="Thread"
					component={ThreadScreen}
					options={({ route }) => ({ title: route.params.subject })}
				/>
				<Stack.Screen
					name="Message"
					component={MessageScreen}
					options={({ route }) => ({ title: route.params.subject })}
				/>
				<Stack.Screen
					name="Compose"
					component={ComposeScreen}
					options={{ title: 'New message', presentation: 'modal', headerShown: false }}
				/>
			</Stack.Navigator>
			<StatusBar style="light" />
		</NavigationContainer>
	);
}
