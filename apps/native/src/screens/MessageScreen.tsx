import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { mapEmailDetail } from '@zaur/mail-core/jmap/map';
import { plainTextToSafeHtml } from '@zaur/mail-core/email/text';
import type { MessageDetail } from '@zaur/mail-core/types/mail';
import { getClient } from '../auth/session';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Message'>;

// Reader CSS in the spirit of webmail's email frame (frame.ts), sized for mobile.
const FRAME_CSS = `
	:root { color-scheme: dark; }
	body {
		margin: 0;
		padding: 16px;
		background: ${colors.background};
		color: ${colors.text};
		font: 15px/1.55 -apple-system, Roboto, 'Segoe UI', sans-serif;
		word-break: break-word;
		overflow-wrap: anywhere;
	}
	img { max-width: 100%; height: auto; }
	table { max-width: 100% !important; }
	a { color: ${colors.accent}; }
	blockquote, .z-email-quote {
		margin: 8px 0;
		padding: 2px 0 2px 12px;
		border-left: 3px solid ${colors.border};
		color: ${colors.textMuted};
	}
	pre { white-space: pre-wrap; }
`;

function buildFrameHtml(body: string): string {
	return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${FRAME_CSS}</style></head><body>${body}</body></html>`;
}

function formatRecipients(list: { name: string; email: string }[]): string {
	return list.map((r) => r.name || r.email).join(', ');
}

export function MessageScreen({ route, navigation }: Props) {
	const { messageId } = route.params;
	const [message, setMessage] = useState<MessageDetail | null>(null);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const client = getClient();
			const email = await client.getEmail(messageId);
			if (!email) throw new Error('gone');
			setMessage(mapEmailDetail(email, ''));
		} catch {
			setError('Could not load this message');
		}
	}, [messageId]);

	useEffect(() => {
		void load();
	}, [load]);

	const frameHtml = useMemo(() => {
		if (!message) return '';
		// JS stays disabled in the WebView, so scripts in HTML mail never run.
		// ponytail: no DOMPurify pass (needs a DOM); JS-off + navigation
		// interception is the v1 containment. Server-side sanitize when
		// milestone 2 adds the offline store.
		const body = message.bodyHtml?.trim()
			? message.bodyHtml
			: plainTextToSafeHtml(message.bodyText);
		return buildFrameHtml(body);
	}, [message]);

	if (error) {
		return (
			<View style={styles.center}>
				<Text style={styles.errorText}>{error}</Text>
				<Pressable onPress={load}>
					<Text style={styles.retry}>Retry</Text>
				</Pressable>
			</View>
		);
	}
	if (!message) {
		return (
			<View style={styles.center}>
				<ActivityIndicator color={colors.accent} size="large" />
			</View>
		);
	}

	return (
		<View style={styles.screen}>
			<View style={styles.headerCard}>
				<Text style={styles.subject}>{message.subject || '(no subject)'}</Text>
				<Text style={styles.meta} numberOfLines={1}>
					From {message.from.name || message.from.email}
				</Text>
				{message.to.length > 0 && (
					<Text style={styles.meta} numberOfLines={2}>
						To {formatRecipients(message.to)}
					</Text>
				)}
				<Text style={styles.meta}>{new Date(message.receivedAt).toLocaleString()}</Text>
			</View>

			<WebView
				style={styles.webview}
				originWhitelist={['about:blank']}
				source={{ html: frameHtml }}
				javaScriptEnabled={false}
				domStorageEnabled={false}
				allowFileAccess={false}
				setSupportMultipleWindows={false}
				onShouldStartLoadWithRequest={(request) => {
					if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
						void Linking.openURL(request.url).catch(() => {});
						return false;
					}
					return request.url === 'about:blank' || request.url.startsWith('data:');
				}}
			/>

			{message.attachments.length > 0 && (
				<ScrollView horizontal style={styles.attachmentBar} contentContainerStyle={styles.attachmentBarContent}>
					{message.attachments.map((attachment) => (
						<View key={attachment.blobId} style={styles.attachmentChip}>
							<Text style={styles.attachmentName} numberOfLines={1}>
								📎 {attachment.name}
							</Text>
						</View>
					))}
				</ScrollView>
			)}

			<Pressable
				style={({ pressed }) => [styles.replyButton, pressed && styles.replyPressed]}
				onPress={() =>
					navigation.navigate('Compose', {
						to: message.from.email,
						subject: message.subject.startsWith('Re:')
							? message.subject
							: `Re: ${message.subject}`,
						quotedText: message.bodyText
					})
				}
			>
				<Text style={styles.replyText}>Reply</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	center: {
		flex: 1,
		backgroundColor: colors.background,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12
	},
	errorText: { color: colors.danger, fontSize: 16 },
	retry: { color: colors.accent, fontSize: 16 },
	headerCard: {
		padding: 16,
		gap: 4,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border
	},
	subject: { color: colors.text, fontSize: 18, fontWeight: '700' },
	meta: { color: colors.textMuted, fontSize: 13 },
	webview: { flex: 1, backgroundColor: colors.background },
	attachmentBar: {
		maxHeight: 52,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border
	},
	attachmentBarContent: { padding: 8, gap: 8 },
	attachmentChip: {
		backgroundColor: colors.surfaceRaised,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		maxWidth: 220
	},
	attachmentName: { color: colors.text, fontSize: 13 },
	replyButton: {
		margin: 12,
		backgroundColor: colors.accent,
		borderRadius: 10,
		paddingVertical: 13,
		alignItems: 'center'
	},
	replyPressed: { opacity: 0.85 },
	replyText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
