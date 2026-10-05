// Groups for the Railway templates table, in display order. A template whose
// name isn't listed lands in the last group, so new cards never need this file.
export const kinds: [kind: string, names: string[]][] = [
	[
		'AI and agents',
		['Claude Code', 'OpenCode', 'Codewhale', 'Hermes Agent', 'AionUi', 'LobeHub (Lobe Chat)', 'Dify', 'Flowise', 'Langfuse 4', 'Laya']
	],
	[
		'Developer and ops',
		['Infisical', 'Windmill', 'Appwrite', 'n8n Queue Mode', 'Evolution API + n8n', 'Dependency-Track 5', 'HyperDX', 'Uptrace', 'GoAlert', 'SvelteKit + Better Auth Starter']
	],
	[
		'Business',
		['Odoo 19', 'ERPNext 16', 'EspoCRM', 'Twenty CRM', 'Invoice Ninja 5', 'Medusa v2', 'Zammad 7', 'Chatwoot', 'Dittofeed', 'OpenEMR']
	],
	[
		'Work and chat',
		['AFFiNE', 'Teable', 'Plane Community', 'Moodle 5.2', 'Rocket.Chat', 'Fluxer', 'Stalwart', 'Stalwart Webmail']
	],
	[
		'Media and community',
		['SUB/WAVE', 'Navidrome', 'Funkwhale', 'AzuraCast', 'Owncast', 'PeerTube', 'MediaCMS', 'Invidious', 'TubeArchivist', 'Audiobookshelf', 'Pixelfed', 'Chevereto']
	],
	[
		'Browsers in the cloud',
		['Google Chrome', 'Chromium', 'Ungoogled Chromium', 'Brave', 'Firefox', 'LibreWolf', 'Mullvad Browser', 'Microsoft Edge', 'Vivaldi', 'Opera']
	],
	[
		'Desktop apps in the cloud',
		['VSCodium', 'Obsidian', 'LibreOffice', 'Thunderbird', 'GIMP', 'Blender', 'FileZilla']
	],
	[
		'Linux machines',
		['Linux Terminal (Ubuntu)', 'Linux Desktop', 'Linux Desktop (KDE Plasma)', 'Linux Desktop (MATE)', 'Linux Desktop (i3)', 'Linux Desktop (LXQt)', 'Linux Desktop (Arch)', 'Linux Desktop (Debian)', 'Linux Desktop (Alpine)']
	],
	['Sites, games and more', ['WordPress Pro', 'Cockpit CMS', 'Minecraft Server', 'LNbits', 'Baby Buddy']]
];

const lookup = new Map(kinds.flatMap(([kind, names]) => names.map((n) => [n, kind] as const)));
const fallback = kinds[kinds.length - 1][0];

export const kindOf = (name: string) => lookup.get(name) ?? fallback;
