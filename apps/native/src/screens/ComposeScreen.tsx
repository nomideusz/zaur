import { useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { parseAddressList, isAddressValid } from '@zaur/mail-core/utils/addresses';
import { getClient } from '../auth/session';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Compose'>;

function quote(text: string): string {
	return `\n\n${text
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n')}`;
}

export function ComposeScreen({ route, navigation }: Props) {
	const [to, setTo] = useState(route.params.to ?? '');
	const [subject, setSubject] = useState(route.params.subject ?? '');
	const [body, setBody] = useState(
		route.params.quotedText ? quote(route.params.quotedText) : ''
	);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function send() {
		const recipients = parseAddressList(to);
		if (!recipients.length || recipients.some((r) => !isAddressValid(r))) {
			setError('Enter at least one valid recipient');
			return;
		}
		setSending(true);
		setError(null);
		try {
			await getClient().sendEmail(recipients, subject.trim(), body);
			navigation.goBack();
		} catch {
			setError('Sending failed — try again');
			setSending(false);
		}
	}

	function confirmDiscard() {
		if (!to && !subject && !body.trim()) {
			navigation.goBack();
			return;
		}
		Alert.alert('Discard message?', undefined, [
			{ text: 'Keep editing', style: 'cancel' },
			{ text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
		]);
	}

	return (
		<KeyboardAvoidingView
			style={styles.screen}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<View style={styles.toolbar}>
				<Pressable onPress={confirmDiscard} hitSlop={12}>
					<Text style={styles.cancel}>Cancel</Text>
				</Pressable>
				<Pressable
					style={({ pressed }) => [styles.sendButton, pressed && styles.sendPressed]}
					onPress={send}
					disabled={sending}
				>
					{sending ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={styles.sendText}>Send</Text>
					)}
				</Pressable>
			</View>

			<ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
				<TextInput
					style={styles.field}
					placeholder="To"
					placeholderTextColor={colors.textMuted}
					autoCapitalize="none"
					autoCorrect={false}
					keyboardType="email-address"
					value={to}
					onChangeText={setTo}
					editable={!sending}
				/>
				<TextInput
					style={styles.field}
					placeholder="Subject"
					placeholderTextColor={colors.textMuted}
					value={subject}
					onChangeText={setSubject}
					editable={!sending}
				/>
				{error && <Text style={styles.error}>{error}</Text>}
				<TextInput
					style={styles.body}
					placeholder="Write your message…"
					placeholderTextColor={colors.textMuted}
					multiline
					textAlignVertical="top"
					value={body}
					onChangeText={setBody}
					editable={!sending}
					autoFocus={!route.params.quotedText}
				/>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	toolbar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 10
	},
	cancel: { color: colors.textMuted, fontSize: 16 },
	sendButton: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingHorizontal: 20,
		paddingVertical: 8,
		minWidth: 76,
		alignItems: 'center'
	},
	sendPressed: { opacity: 0.85 },
	sendText: { color: '#fff', fontSize: 15, fontWeight: '600' },
	form: { flex: 1, paddingHorizontal: 16 },
	field: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
		color: colors.text,
		fontSize: 16,
		paddingVertical: 12
	},
	error: { color: colors.danger, paddingTop: 8 },
	body: {
		color: colors.text,
		fontSize: 16,
		lineHeight: 22,
		paddingTop: 14,
		minHeight: 280
	}
});
