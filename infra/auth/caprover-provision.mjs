#!/usr/bin/env node
/**
 * Run inside the captain-captain container:
 *   docker cp caprover-provision.mjs captain-captain:/captain/data/
 *   docker exec captain-captain node /captain/data/caprover-provision.mjs
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

function randomSecret(bytes = 24) {
	return crypto.randomBytes(bytes).toString('base64url');
}

function masterKey() {
	return crypto.randomBytes(16).toString('hex');
}

const secrets = {
	postgresPassword: randomSecret(18),
	zitadelMasterKey: masterKey(),
	zitadelAdminPassword: randomSecret(18)
};

const store = um.datastore.getAppsDataStore();

async function ensureApp(appName, { hasPersistentData, notExposeAsWebApp, containerHttpPort, envVars, volumes }) {
	const existing = store.getAppDefinition(appName);
	if (!existing) {
		console.log(`Registering app ${appName}...`);
		await store.registerAppDefinition(appName, '', hasPersistentData);
	}

	const current = store.getAppDefinition(appName);
	await um.serviceManager.updateAppDefinition(
		appName,
		current.projectId || '',
		current.description || '',
		1,
		current.captainDefinitionRelativeFilePath || './captain-definition',
		envVars,
		volumes ?? current.volumes ?? [],
		current.tags || [{ tagName: appName }],
		NODE_ID,
		notExposeAsWebApp,
		containerHttpPort,
		current.httpAuth,
		true,
		current.ports || [],
		current.repoInfo,
		current.customNginxConfig || '',
		current.redirectDomain || '',
		current.preDeployFunction || '',
		current.serviceUpdateOverride || '',
		current.websocketSupport || false,
		{ enabled: true, appDeployToken: randomSecret(32) }
	);

	console.log(`Ensuring service for ${appName}...`);
	await um.serviceManager.ensureServiceInitedAndUpdated(appName);

	const updated = store.getAppDefinition(appName);
	console.log(`Deploy token for ${appName}:`, updated.appDeployTokenConfig?.appDeployToken);
	return updated.appDeployTokenConfig?.appDeployToken;
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

	const zitadelToken = await ensureApp('zitadel', {
		hasPersistentData: true,
		notExposeAsWebApp: false,
		containerHttpPort: 8080,
		volumes: [{ containerPath: '/zitadel/bootstrap', volumeName: 'zitadel-bootstrap' }],
		envVars: [
			{ key: 'ZITADEL_MASTERKEY', value: secrets.zitadelMasterKey },
			{ key: 'ZITADEL_PORT', value: '8080' },
			{ key: 'ZITADEL_EXTERNALDOMAIN', value: DOMAIN },
			{ key: 'ZITADEL_EXTERNALPORT', value: '443' },
			{ key: 'ZITADEL_EXTERNALSECURE', value: 'true' },
			{ key: 'ZITADEL_TLS_ENABLED', value: 'false' },
			{ key: 'ZITADEL_DATABASE_POSTGRES_DSN', value: dsn },
			{ key: 'ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORDCHANGEREQUIRED', value: 'false' },
			{ key: 'ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED', value: 'true' },
			{ key: 'ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_BASEURI', value: `${loginBase}/` },
			{ key: 'ZITADEL_OIDC_DEFAULTLOGINURLV2', value: `${loginBase}/login?authRequest=` },
			{ key: 'ZITADEL_OIDC_DEFAULTLOGOUTURLV2', value: `${loginBase}/logout?post_logout_redirect=` },
			{ key: 'ZITADEL_SAML_DEFAULTLOGINURLV2', value: `${loginBase}/login?samlRequest=` },
			{ key: 'ZITADEL_LOGSTORE_ACCESS_STDOUT_ENABLED', value: 'true' }
		]
	});

	const zitadelApp = store.getAppDefinition('zitadel');
	const domains = zitadelApp.customDomain || [];
	if (!domains.some((d) => d.publicDomain === DOMAIN)) {
		console.log(`Adding custom domain ${DOMAIN}...`);
		await um.serviceManager.addCustomDomain('zitadel', DOMAIN);
	}
	console.log(`Enabling SSL for ${DOMAIN}...`);
	await um.serviceManager.enableCustomDomainSsl('zitadel', DOMAIN);

	fs.writeFileSync(
		'/captain/data/zaur-zitadel-secrets.json',
		JSON.stringify(
			{
				...secrets,
				deployTokens: { 'zitadel-db': dbToken, zitadel: zitadelToken },
				dsn
			},
			null,
			2
		),
		{ mode: 0o600 }
	);

	console.log('Saved /captain/data/zaur-zitadel-secrets.json');
	console.log(JSON.stringify({ dbToken, zitadelToken, domain: DOMAIN }, null, 2));
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
