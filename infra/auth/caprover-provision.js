#!/usr/bin/env node
/**
 * Run inside the captain-captain container:
 *   docker cp caprover-provision.js captain-captain:/captain/data/
 *   docker exec captain-captain node /captain/data/caprover-provision.js
 *
 * CapRover app `auth` → auth.zaur.app (Zitadel API + custom nginx for login UI)
 * CapRover app `auth-login` → internal (Zitadel Login v2)
 * CapRover app `zitadel-db` → internal (Postgres)
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
const DOMAIN = 'auth.zaur.app';
const BOOTSTRAP_VOLUME = 'zitadel-bootstrap';

function randomSecret(bytes = 24) {
	return crypto.randomBytes(bytes).toString('base64url');
}

function masterKey() {
	return crypto.randomBytes(16).toString('hex');
}

const secrets = {
	postgresPassword: randomSecret(18),
	zitadelMasterKey: masterKey(),
	zitadelAdminPassword: 'ZaurIdp2026!'
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
	{ hasPersistentData, notExposeAsWebApp, containerHttpPort, envVars, volumes, customNginxConfig = '' }
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
		current.forceSsl || false,
		current.ports || [],
		current.repoInfo || { repo: '', branch: '', user: '', password: '' },
		um.authenticator,
		customNginxConfig || current.customNginxConfig || '',
		current.redirectDomain || '',
		current.preDeployFunction || '',
		current.serviceUpdateOverride || '',
		current.websocketSupport || false,
		tokenConfig
	);

	const updated = await store.getAppDefinition(appName);
	console.log(`Deploy token for ${appName}:`, updated.appDeployTokenConfig?.appDeployToken);
	return updated.appDeployTokenConfig?.appDeployToken;
}

const SECRETS_PATH = '/captain/data/zaur-zitadel-secrets.json';
if (fs.existsSync(SECRETS_PATH)) {
	const saved = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf8'));
	if (saved.postgresPassword) secrets.postgresPassword = saved.postgresPassword;
	if (saved.zitadelMasterKey) secrets.zitadelMasterKey = saved.zitadelMasterKey;
	// Do not reuse admin password — must satisfy Zitadel complexity on first instance.
	console.log('Reusing secrets from', SECRETS_PATH);
}

(async () => {
	const dbToken = await ensureApp('zitadel-db', {
		hasPersistentData: true,
		notExposeAsWebApp: true,
		containerHttpPort: 80,
		volumes: [{ containerPath: '/var/lib/postgresql/data', volumeName: 'zitadel-db-data' }],
		envVars: [
			{ key: 'POSTGRES_USER', value: 'postgres' },
			{ key: 'POSTGRES_PASSWORD', value: secrets.postgresPassword },
			{ key: 'POSTGRES_DB', value: 'zitadel' }
		]
	});

	const dsn = `postgresql://postgres:${encodeURIComponent(secrets.postgresPassword)}@srv-captain--zitadel-db:5432/zitadel?sslmode=disable`;
	const loginBase = `https://${DOMAIN}/ui/v2/login`;
	const adminLogin = `zitadel-admin@zitadel.${DOMAIN}`;

	const authToken = await ensureApp('auth', {
		hasPersistentData: true,
		notExposeAsWebApp: false,
		containerHttpPort: 8080,
		customNginxConfig: '',
		volumes: [{ containerPath: '/zitadel/bootstrap', volumeName: BOOTSTRAP_VOLUME }],
		envVars: [
			{ key: 'ZITADEL_MASTERKEY', value: secrets.zitadelMasterKey },
			{ key: 'ZITADEL_PORT', value: '8080' },
			{ key: 'ZITADEL_EXTERNALDOMAIN', value: DOMAIN },
			{ key: 'ZITADEL_EXTERNALPORT', value: '443' },
			{ key: 'ZITADEL_EXTERNALSECURE', value: 'true' },
			{ key: 'ZITADEL_TLS_ENABLED', value: 'false' },
			{ key: 'ZITADEL_DATABASE_POSTGRES_DSN', value: dsn },
			{ key: 'ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORDCHANGEREQUIRED', value: 'false' },
			{ key: 'ZITADEL_FIRSTINSTANCE_ORG_HUMAN_USERNAME', value: 'zitadel-admin' },
			{ key: 'ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORD', value: secrets.zitadelAdminPassword },
			{ key: 'ZITADEL_FIRSTINSTANCE_ORG_HUMAN_EMAIL_ADDRESS', value: adminLogin },
			{ key: 'ZITADEL_FIRSTINSTANCE_ORG_HUMAN_EMAIL_VERIFIED', value: 'true' },
			{ key: 'ZITADEL_FIRSTINSTANCE_LOGINCLIENTPATPATH', value: '/zitadel/bootstrap/login-client.pat' },
			{
				key: 'ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_MACHINE_USERNAME',
				value: 'login-client'
			},
			{
				key: 'ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_MACHINE_NAME',
				value: 'Automatically Initialized IAM_LOGIN_CLIENT'
			},
			{
				key: 'ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_PAT_EXPIRATIONDATE',
				value: '2099-01-01T00:00:00Z'
			},
			{ key: 'ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED', value: 'true' },
			{ key: 'ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_BASEURI', value: `${loginBase}/` },
			{ key: 'ZITADEL_OIDC_DEFAULTLOGINURLV2', value: `${loginBase}/login?authRequest=` },
			{ key: 'ZITADEL_OIDC_DEFAULTLOGOUTURLV2', value: `${loginBase}/logout?post_logout_redirect=` },
			{ key: 'ZITADEL_SAML_DEFAULTLOGINURLV2', value: `${loginBase}/login?samlRequest=` },
			{ key: 'ZITADEL_LOGSTORE_ACCESS_STDOUT_ENABLED', value: 'true' }
		]
	});

	const loginToken = await ensureApp('auth-login', {
		hasPersistentData: false,
		notExposeAsWebApp: true,
		containerHttpPort: 3000,
		volumes: [{ containerPath: '/zitadel/bootstrap', volumeName: BOOTSTRAP_VOLUME }],
		envVars: [
			{ key: 'ZITADEL_API_URL', value: 'http://srv-captain--auth:8080' },
			{ key: 'NEXT_PUBLIC_BASE_PATH', value: '/ui/v2/login' },
			{ key: 'ZITADEL_SERVICE_USER_TOKEN_FILE', value: '/zitadel/bootstrap/login-client.pat' },
			{ key: 'CUSTOM_REQUEST_HEADERS', value: `Host:${DOMAIN},X-Forwarded-Proto:https` }
		]
	});

	fs.writeFileSync(
		SECRETS_PATH,
		JSON.stringify(
			{
				...secrets,
				adminLogin,
				deployTokens: { 'zitadel-db': dbToken, auth: authToken, 'auth-login': loginToken },
				dsn,
				domain: DOMAIN
			},
			null,
			2
		),
		{ mode: 0o600 }
	);

	console.log('Saved', SECRETS_PATH);
	console.log(JSON.stringify({ dbToken, authToken, loginToken, domain: DOMAIN, adminLogin }, null, 2));
	process.exit(0);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
