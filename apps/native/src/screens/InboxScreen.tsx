import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { mapEmailPreview } from '@zaur/mail-core/jmap/map';
import type { JMAPMailbox } from '@zaur/mail-core/jmap/types';
import type { MessagePreview } from '@zaur/mail-core/types/mail';
import { getClient, getUsername, logout } from '../auth/session';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation';

const PAGE_SIZE = 50;

type Props = NativeStackScreenProps<RootStackParamList, 'Inbox'> & {
	onSignedOut: () => void;
};

function formatWhen(iso: string): string {
	const date = new Date(iso);
	const now = new Date();
	if (date.toDateString() === now.toDateString()) {
		return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function InboxScreen({ navigation, onSignedOut }: Props) {
	const [mailboxes, setMailboxes] = useState<JMAPMailbox[]>([]);
	const [mailboxId, setMailboxId] = useState<string | null>(null);
	const [messages, setMessages] = useState<MessagePreview[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const currentMailbox = useMemo(
		() => mailboxes.find((mb) => mb.id === mailboxId) ?? null,
		[mailboxes, mailboxId]
	);

	const loadPage = useCallback(async (boxId: string, position: number) => {
		const client = getClient();
		const result = await client.queryEmails(boxId, PAGE_SIZE, position);
		const previews = result.emails.map((email) => mapEmailPreview(email, boxId));
		setMessages((prev) => (position === 0 ? previews : [...prev, ...previews]));
		setHasMore(result.hasMore);
	}, []);

	const initialise = useCallback(async () => {
		setError(null);
		try {
			const client = getClient();
			const boxes = await client.getMailboxes();
			setMailboxes(boxes);
			const inbox = boxes.find((mb) => mb.role === 'inbox') ?? boxes[0];
			if (!inbox) throw new Error('No mailboxes');
			setMailboxId(inbox.id);
			await loadPage(inbox.id, 0);
		} catch {
			setError('Could not load your mail');
		} finally {
			setLoading(false);
		}
	}, [loadPage]);

	useEffect(() => {
		void initialise();
	}, [initialise]);

	// Refresh the list whenever the screen regains focus (e.g. back from compose).
	useEffect(() => {
		return navigation.addListener('focus', () => {
			if (mailboxId) void loadPage(mailboxId, 0).catch(() => {});
		});
	}, [navigation, mailboxId, loadPage]);

	async function refresh() {
		if (!mailboxId) return;
		setRefreshing(true);
		try {
			await loadPage(mailboxId, 0);
		} catch {
			setError('Refresh failed');
		} finally {
			setRefreshing(false);
		}
	}

	async function selectMailbox(box: JMAPMailbox) {
		setPickerOpen(false);
		setMailboxId(box.id);
		setLoading(true);
		setMessages([]);
		try {
			await loadPage(box.id, 0);
		} catch {
			setError('Could not load this folder');
		} finally {
			setLoading(false);
		}
	}

	async function signOut() {
		await logout();
		onSignedOut();
	}

	function openThread(message: MessagePreview) {
		navigation.navigate('Thread', {
			threadId: message.threadId,
			subject: message.subject || '(no subject)'
		});
	}

	return (
		<View style={styles.screen}>
			<View style={styles.header}>
				<Pressable style={styles.mailboxButton} onPress={() => setPickerOpen(true)}>
					<Text style={styles.mailboxName}>{currentMailbox?.name ?? 'Mail'}</Text>
					<Text style={styles.mailboxCaret}>▾</Text>
				</Pressable>
				<Pressable onPress={signOut} hitSlop={12}>
					<Text style={styles.signOut}>Sign out</Text>
				</Pressable>
			</View>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator color={colors.accent} size="large" />
				</View>
			) : error ? (
				<View style={styles.center}>
					<Text style={styles.errorText}>{error}</Text>
					<Pressable onPress={initialise}>
						<Text style={styles.retry}>Retry</Text>
					</Pressable>
				</View>
			) : (
				<FlashList
					data={messages}
					keyExtractor={(item) => item.id}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={refresh}
							tintColor={colors.accent}
						/>
					}
					onEndReached={() => {
						if (hasMore && mailboxId) void loadPage(mailboxId, messages.length).catch(() => {});
					}}
					onEndReachedThreshold={0.4}
					ItemSeparatorComponent={() => <View style={styles.separator} />}
					ListEmptyComponent={
						<Text style={styles.empty}>Nothing here — enjoy the silence.</Text>
					}
					renderItem={({ item }) => (
						<Pressable
							style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
							onPress={() => openThread(item)}
						>
							<View style={styles.rowDot}>
								{item.unread && <View style={styles.unreadDot} />}
							</View>
							<View style={styles.rowBody}>
								<View style={styles.rowTop}>
									<Text
										style={[styles.sender, item.unread && styles.senderUnread]}
										numberOfLines={1}
									>
										{item.from.name || item.from.email}
									</Text>
									<Text style={styles.when}>{formatWhen(item.receivedAt)}</Text>
								</View>
								<Text
									style={[styles.subject, item.unread && styles.subjectUnread]}
									numberOfLines={1}
								>
									{item.subject || '(no subject)'}
								</Text>
								<Text style={styles.preview} numberOfLines={1}>
									{item.preview}
								</Text>
							</View>
						</Pressable>
					)}
				/>
			)}

			<Pressable
				style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
				onPress={() => navigation.navigate('Compose', {})}
			>
				<Text style={styles.fabText}>＋</Text>
			</Pressable>

			<Modal visible={pickerOpen} transparent animationType="fade">
				<Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
					<View style={styles.pickerSheet}>
						<Text style={styles.pickerAccount}>{getUsername()}</Text>
						{mailboxes.map((box) => (
							<Pressable
								key={box.id}
								style={[styles.pickerRow, box.id === mailboxId && styles.pickerRowActive]}
								onPress={() => void selectMailbox(box)}
							>
								<Text style={styles.pickerName}>{box.name}</Text>
								{box.unreadEmails ? (
									<Text style={styles.pickerUnread}>{box.unreadEmails}</Text>
								) : null}
							</Pressable>
						))}
					</View>
				</Pressable>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12
	},
	mailboxButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	mailboxName: { color: colors.text, fontSize: 22, fontWeight: '700' },
	mailboxCaret: { color: colors.textMuted, fontSize: 16 },
	signOut: { color: colors.textMuted, fontSize: 14 },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
	errorText: { color: colors.danger, fontSize: 16 },
	retry: { color: colors.accent, fontSize: 16 },
	separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
	empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48 },
	row: {
		flexDirection: 'row',
		paddingVertical: 12,
		paddingRight: 16
	},
	rowPressed: { backgroundColor: colors.surface },
	rowDot: { width: 28, alignItems: 'center', paddingTop: 6 },
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.unreadDot
	},
	rowBody: { flex: 1, gap: 2 },
	rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
	sender: { color: colors.textMuted, fontSize: 15, flex: 1 },
	senderUnread: { color: colors.text, fontWeight: '700' },
	when: { color: colors.textMuted, fontSize: 12 },
	subject: { color: colors.textMuted, fontSize: 15 },
	subjectUnread: { color: colors.text, fontWeight: '600' },
	preview: { color: colors.textMuted, fontSize: 13 },
	fab: {
		position: 'absolute',
		right: 20,
		bottom: 28,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 4
	},
	fabPressed: { opacity: 0.85 },
	fabText: { color: '#fff', fontSize: 26, lineHeight: 30 },
	pickerBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end'
	},
	pickerSheet: {
		backgroundColor: colors.surface,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		paddingVertical: 12,
		paddingBottom: 32
	},
	pickerAccount: {
		color: colors.textMuted,
		fontSize: 13,
		paddingHorizontal: 20,
		paddingBottom: 8
	},
	pickerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 12
	},
	pickerRowActive: { backgroundColor: colors.surfaceRaised },
	pickerName: { color: colors.text, fontSize: 16 },
	pickerUnread: { color: colors.accent, fontSize: 14, fontWeight: '600' }
});
