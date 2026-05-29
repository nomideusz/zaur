#!/usr/bin/env node
/** Apply auth nginx template after auth-login service exists. Run inside captain-captain. */
const fs = require('fs');
process.chdir('/usr/src/app');
const Authenticator = require('/usr/src/app/built/user/Authenticator').default;
const { UserManagerProvider } = require('/usr/src/app/built/user/UserManagerProvider');
const salt = fs.readFileSync('/run/secrets/captain-salt', 'utf8').trim();
Authenticator.setMainSalt(salt);
const um = UserManagerProvider.get('captain');
um.datastore.setEncryptionSalt(salt);
const store = um.datastore.getAppsDataStore();
const nginx = fs.readFileSync('/captain/data/caprover-auth-nginx.ejs', 'utf8');

(async () => {
	const a = await store.getAppDefinition('auth');
	await store.updateAppDefinitionInDb(
		'auth',
		a.projectId || '',
		a.description || '',
		a.instanceCount,
		a.captainDefinitionRelativeFilePath,
		a.envVars,
		a.volumes,
		a.tags || [],
		a.nodeId || '',
		a.notExposeAsWebApp,
		a.containerHttpPort,
		a.httpAuth,
		a.forceSsl,
		a.ports,
		a.repoInfo || { repo: '', branch: '', user: '', password: '' },
		um.authenticator,
		nginx,
		a.redirectDomain || '',
		a.preDeployFunction || '',
		a.serviceUpdateOverride || '',
		a.websocketSupport,
		a.appDeployTokenConfig || { enabled: false }
	);
	await um.serviceManager.reloadLoadBalancer();
	console.log('auth nginx applied');
})().catch((e) => {
	console.error(e);
	process.exit(1);
});
