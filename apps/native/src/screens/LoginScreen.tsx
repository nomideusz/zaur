import { useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Linking,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View
} from 'react-native';
import { login } from '../auth/session';
import { config } from '../config';
import { colors } from '../theme';

export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [totp, setTotp] = useState('');
	const [needsTotp, setNeedsTotp] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit() {
		if (!email.trim() || !password) return;
		setBusy(true);
		setError(null);
		try {
			const result = await login(email.trim(), password, needsTotp ? totp.trim() : undefined);
			if (result === 'ok') {
				onSignedIn();
				return;
			}
			if (result === 'mfa_required') {
				setNeedsTotp(true);
				setError(needsTotp ? 'Invalid verification code' : null);
				return;
			}
			setError('Wrong email or password');
		} catch {
			setError('Could not reach the mail server');
		} finally {
			setBusy(false);
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.screen}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<View style={styles.card}>
				<Text style={styles.title}>Zaur Mail</Text>
				<TextInput
					style={styles.input}
					placeholder="Email"
					placeholderTextColor={colors.textMuted}
					autoCapitalize="none"
					autoCorrect={false}
					keyboardType="email-address"
					autoComplete="email"
					value={email}
					onChangeText={setEmail}
					editable={!busy}
				/>
				<TextInput
					style={styles.input}
					placeholder="Password"
					placeholderTextColor={colors.textMuted}
					secureTextEntry
					autoComplete="password"
					value={password}
					onChangeText={setPassword}
					editable={!busy}
					onSubmitEditing={needsTotp ? undefined : submit}
				/>
				{needsTotp && (
					<TextInput
						style={styles.input}
						placeholder="Verification code"
						placeholderTextColor={colors.textMuted}
						keyboardType="number-pad"
						autoComplete="one-time-code"
						value={totp}
						onChangeText={setTotp}
						editable={!busy}
						onSubmitEditing={submit}
						autoFocus
					/>
				)}
				{error && <Text style={styles.error}>{error}</Text>}
				<Pressable
					style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
					onPress={submit}
					disabled={busy}
				>
					{busy ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>{needsTotp ? 'Verify' : 'Sign in'}</Text>
					)}
				</Pressable>
				<Pressable onPress={() => Linking.openURL(config.registerUrl)}>
					<Text style={styles.registerLink}>Need an address? Get one at register.zaur.app</Text>
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.background,
		justifyContent: 'center',
		padding: 24
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		padding: 24,
		gap: 12
	},
	title: {
		color: colors.text,
		fontSize: 28,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 12
	},
	input: {
		backgroundColor: colors.surfaceRaised,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		color: colors.text,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 16
	},
	error: {
		color: colors.danger,
		textAlign: 'center'
	},
	button: {
		backgroundColor: colors.accent,
		borderRadius: 10,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 4
	},
	buttonPressed: { opacity: 0.8 },
	buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
	registerLink: {
		color: colors.textMuted,
		textAlign: 'center',
		marginTop: 8,
		fontSize: 13
	}
});
