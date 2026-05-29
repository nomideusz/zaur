#!/usr/bin/env node
/**
 * Run inside the captain-captain container:
 *   docker cp caprover-provision.js captain-captain:/captain/data/
 *   docker exec captain-captain node /captain/data/caprover-provision.js
 *
 * CapRover apps:
 *   auth-db     → Postgres for Logto
 *   auth        → Logto OIDC + sign-in @ auth.zaur.app (port 3001)
 *   auth-admin  → nginx proxy to Logto admin console @ auth-admin.zaur.app (port 3002)
 */
const fs = require('fs');
const crypto = require('crypto');

process.chdir('/usr/src/app');

const Authenticator = require('/usr/src/app/built/user/Authenticator').default;
const { UserManagerProvider } = require('/usr/src/app/built/user/UserManagerProvider');

const salt = fs.readFileSync('/run/secrets/captain-salt', 'utf8').trim();
Authenticator.setMainSalt(salt);

const um = UserManagerProvider.get('captain');
um.datastore.setEncryptionSalt(salt);

const NODE_ID = 'xad2vqynt8qz6mmq8t7ekq0j6';
const ENDPOINT = 'https://auth.zaur.app';
const ADMIN_ENDPOINT = 'https://auth-admin.zaur.app';
const AUTH_NGINX_PATH = '/captain/data/auth-caprover-nginx.ejs';

function randomSecret(bytes = 24) {
	return crypto.randomBytes(bytes).toString('base64url');
}

const secrets = {
	postgresPassword: randomSecret(18)
};

const store = um.datastore.getAppsDataStore();

async function getAppOrNull(appName) {
	try {
		return await store.getAppDefinition(appName);
	} catch {
		return null;
	}
}

async function ensureApp(
	appName,
	{
		hasPersistentData,
		notExposeAsWebApp,
		containerHttpPort,
		envVars,
		volumes,
		customNginxConfig = '',
		websocketSupport = false,
		forceSsl = false
	}
) {
	let current = await getAppOrNull(appName);
	if (!current) {
		console.log(`Registering app ${appName}...`);
		await store.registerAppDefinition(appName, '', hasPersistentData);
		current = await store.getAppDefinition(appName);
	}

	const tokenConfig = current.appDeployTokenConfig?.enabled
		? current.appDeployTokenConfig
		: { enabled: true, appDeployToken: randomSecret(32) };

	await store.updateAppDefinitionInDb(
		appName,
		current.projectId || '',
		current.description || '',
		1,
		current.captainDefinitionRelativeFilePath || './captain-definition',
		envVars,
		volumes ?? current.volumes ?? [],
		current.tags?.length ? current.tags : [{ tagName: appName }],
		current.nodeId || NODE_ID,
		notExposeAsWebApp,
		containerHttpPort,
		current.httpAuth,
		forceSsl || current.forceSsl || false,
		current.ports || [],
		current.repoInfo || { repo: '', branch: '', user: '', password: '' },
		um.authenticator,
		customNginxConfig,
		current.redirectDomain || '',
		current.preDeployFunction || '',
		current.serviceUpdateOverride || '',
		websocketSupport,
		tokenConfig
	);

	const updated = await store.getAppDefinition(appName);
	console.log(`Deploy token for ${appName}:`, updated.appDeployTokenConfig?.appDeployToken);
	return updated.appDeployTokenConfig?.appDeployToken;
}

const SECRETS_PATH = '/captain/data/zaur-auth-secrets.json';
if (fs.existsSync(SECRETS_PATH)) {
	const saved = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf8'));
	if (saved.postgresPassword) secrets.postgresPassword = saved.postgresPassword;
	console.log('Reusing secrets from', SECRETS_PATH);
}

async function deleteAppIfExists(appName) {
	const current = await getAppOrNull(appName);
	if (!current) return;
	console.log(`Deleting stale app ${appName}...`);
	await store.deleteAppDefinition(appName);
}

const STALE_APPS = ['auth-login', 'zitadel-db'];

(async () => {
	for (const appName of STALE_APPS) {
		await deleteAppIfExists(appName);
	}

	const dbToken = await ensureApp('auth-db', {
		hasPersistentData: true,
		notExposeAsWebApp: true,
		containerHttpPort: 80,
		volumes: [{ containerPath: '/var/lib/postgresql/data', volumeName: 'auth-db-data' }],
		envVars: [
			{ key: 'POSTGRES_USER', value: 'postgres' },
			{ key: 'POSTGRES_PASSWORD', value: secrets.postgresPassword },
			{ key: 'POSTGRES_DB', value: 'logto' }
		]
	});

	const dbUrl = `postgresql://postgres:${encodeURIComponent(secrets.postgresPassword)}@srv-captain--auth-db:5432/logto`;

	const authNginxConfig = fs.existsSync(AUTH_NGINX_PATH)
		? fs.readFileSync(AUTH_NGINX_PATH, 'utf8')
		: '';

	const authToken = await ensureApp('auth', {
		hasPersistentData: false,
		notExposeAsWebApp: false,
		containerHttpPort: 3001,
		customNginxConfig: authNginxConfig,
		websocketSupport: true,
		forceSsl: false,
		volumes: [],
		envVars: [
			{ key: 'TRUST_PROXY_HEADER', value: '1' },
			{ key: 'PORT', value: '3001' },
			{ key: 'ADMIN_PORT', value: '3002' },
			{ key: 'ENDPOINT', value: ENDPOINT },
			{ key: 'ADMIN_ENDPOINT', value: ADMIN_ENDPOINT },
			{ key: 'DB_URL', value: dbUrl }
		]
	});

	// CapRover only sets hasPersistentData at register time; clear stale Zitadel volume metadata.
	const authDef = await store.getAppDefinition('auth');
	if (authDef.hasPersistentData || (authDef.volumes && authDef.volumes.length > 0)) {
		authDef.hasPersistentData = false;
		authDef.volumes = [];
		await store.saveApp('auth', authDef);
		console.log('Cleared stale Zitadel persistent volume from auth app');
	}

	const adminToken = await ensureApp('auth-admin', {
		hasPersistentData: false,
		notExposeAsWebApp: false,
		containerHttpPort: 80,
		websocketSupport: true,
		forceSsl: false,
		envVars: []
	});

	fs.writeFileSync(
		SECRETS_PATH,
		JSON.stringify(
			{
				...secrets,
				dbUrl,
				endpoint: ENDPOINT,
				adminEndpoint: ADMIN_ENDPOINT,
				oidcIssuer: `${ENDPOINT}/oidc`,
				deployTokens: { 'auth-db': dbToken, auth: authToken, 'auth-admin': adminToken }
			},
			null,
			2
		),
		{ mode: 0o600 }
	);

	console.log('Saved', SECRETS_PATH);
	console.log(
		JSON.stringify(
			{ dbToken, authToken, adminToken, endpoint: ENDPOINT, adminEndpoint: ADMIN_ENDPOINT },
			null,
			2
		)
	);

	process.exit(0);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
