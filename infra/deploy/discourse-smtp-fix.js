#!/usr/bin/env node
/**
 * Point Discourse (web + sidekiq) at Stalwart's SMTPS submission port.
 *
 * Stalwart exposes submissions on 465 (implicit TLS) — there is no 587
 * listener, and the overlay name srv-captain--mail would fail TLS hostname
 * verification, so we use the public mail.zaur.app:465. Bitnami's Discourse
 * image never sets smtp_force_tls (needed for implicit TLS), so it is
 * injected via DISCOURSE_EXTRA_CONF_CONTENT.
 *
 * Run inside the captain-captain container:
 *   docker cp discourse-smtp-fix.js captain-captain:/captain/data/
 *   docker exec captain-captain node /captain/data/discourse-smtp-fix.js
 */
const fs = require('fs');

process.chdir('/usr/src/app');

const Authenticator = require('/usr/src/app/built/user/Authenticator').default;
const { UserManagerProvider } = require('/usr/src/app/built/user/UserManagerProvider');

const salt = fs.readFileSync('/run/secrets/captain-salt', 'utf8').trim();
Authenticator.setMainSalt(salt);

const um = UserManagerProvider.get('captain');
um.datastore.setEncryptionSalt(salt);
const store = um.datastore.getAppsDataStore();

const SMTP_ENV = {
	SMTP_HOST: 'mail.zaur.app',
	SMTP_PORT: '465',
	SMTP_PROTOCOL: 'ssl',
	DISCOURSE_EXTRA_CONF_CONTENT: 'smtp_force_tls = true'
};

async function patchAppEnv(appName) {
	const current = await store.getAppDefinition(appName);

	const envVars = current.envVars.filter((item) => !(item.key in SMTP_ENV));
	for (const [key, value] of Object.entries(SMTP_ENV)) {
		envVars.push({ key, value });
	}

	await store.updateAppDefinitionInDb(
		appName,
		current.projectId || '',
		current.description || '',
		current.instanceCount ?? 1,
		current.captainDefinitionRelativeFilePath || './captain-definition',
		envVars,
		current.volumes ?? [],
		current.tags?.length ? current.tags : [{ tagName: appName }],
		current.nodeId,
		current.notExposeAsWebApp,
		current.containerHttpPort,
		current.httpAuth,
		current.forceSsl || false,
		current.ports || [],
		current.repoInfo || { repo: '', branch: '', user: '', password: '' },
		um.authenticator,
		current.customNginxConfig || '',
		current.redirectDomain || '',
		current.preDeployFunction || '',
		current.serviceUpdateOverride || '',
		current.websocketSupport || false,
		current.appDeployTokenConfig || { enabled: false }
	);
	console.log(`Updated env for ${appName}`);
}

(async () => {
	await patchAppEnv('discourse');
	await patchAppEnv('discourse-sidekiq');
	console.log('Done — apply live with docker service update or redeploy from CapRover.');
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
