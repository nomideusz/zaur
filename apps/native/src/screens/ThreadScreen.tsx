import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { mapEmailDetail } from '@zaur/mail-core/jmap/map';
import { plainTextExcerpt } from '@zaur/mail-core/email/text';
import type { MessageDetail } from '@zaur/mail-core/types/mail';
import { getClient } from '../auth/session';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Thread'>;

export function ThreadScreen({ route, navigation }: Props) {
	const { threadId } = route.params;
	const [messages, setMessages] = useState<MessageDetail[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const client = getClient();
			const emails = await client.getThreadEmails(threadId);
			const details = emails.map((email) => mapEmailDetail(email, ''));
			setMessages(details);
			// Mark the thread read; fire-and-forget.
			const unreadIds = details.filter((m) => m.unread).map((m) => m.id);
			if (unreadIds.length) void client.markManyAsRead(unreadIds).catch(() => {});
		} catch {
			setError('Could not load this conversation');
		} finally {
			setLoading(false);
		}
	}, [threadId]);

	useEffect(() => {
		void load();
	}, [load]);

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator color={colors.accent} size="large" />
			</View>
		);
	}
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

	return (
		<FlatList
			style={styles.screen}
			data={messages}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => (
				<Pressable
					style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
					onPress={() =>
						navigation.navigate('Message', {
							messageId: item.id,
							subject: item.subject || '(no subject)'
						})
					}
				>
					<View style={styles.cardTop}>
						<Text style={styles.sender} numberOfLines={1}>
							{item.from.name || item.from.email}
						</Text>
						<Text style={styles.when}>
							{new Date(item.receivedAt).toLocaleString(undefined, {
								month: 'short',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}
						</Text>
					</View>
					<Text style={styles.excerpt} numberOfLines={3}>
						{plainTextExcerpt(item.bodyText, 240) || item.preview}
					</Text>
					{item.attachments.length > 0 && (
						<Text style={styles.attachments}>
							📎 {item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}
						</Text>
					)}
				</Pressable>
			)}
			ItemSeparatorComponent={() => <View style={styles.separator} />}
			contentContainerStyle={styles.content}
		/>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { padding: 12 },
	center: {
		flex: 1,
		backgroundColor: colors.background,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12
	},
	errorText: { color: colors.danger, fontSize: 16 },
	retry: { color: colors.accent, fontSize: 16 },
	card: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 14,
		gap: 6
	},
	cardPressed: { backgroundColor: colors.surfaceRaised },
	cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
	sender: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
	when: { color: colors.textMuted, fontSize: 12 },
	excerpt: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
	attachments: { color: colors.textMuted, fontSize: 13 },
	separator: { height: 10 }
});
