const { Command } = require('commander');
const fs = require('fs').promises;
const { Worker } = require('worker_threads');
const os = require('os');
const { version, description } = require('../package.json');
const GDriveUtil = require('./gdrive-util');

const TOKEN_FILE = `${os.homedir()}/.goordash/token.json`;
const CREDENTIALS_FILE = `${os.homedir()}/.goordash/credentials.json`;

async function getCredentials(credentialsFile) {
  const buffer = await fs.readFile(credentialsFile);
  const creds = JSON.parse(buffer.toString());
  const credentials = {
    clientId: creds.installed.client_id,
    clientSecret: creds.installed.client_secret,
    redirectUri: creds.installed.redirect_uris[0]
  };
  return credentials;
}

async function getToken(tokenFile) {
  const buffer = await fs.readFile(tokenFile);
  const token = JSON.parse(buffer.toString());
  return token;
}

async function auth(options) {
  const credentials = await getCredentials(options['credentials']);
  const gdriveUtil = new GDriveUtil(credentials);
  const authUrl = gdriveUtil.getAuthorizationUrl();
  console.log(`Open the following URL in a web browser:\n\n${authUrl}\n\nAfter authorization, copy the code from the resulting URL and execute:\n\ngoordash init [authorization code]`);
}

async function init(code, options) {
  const credentials = await getCredentials(options['credentials']);
  const gdriveUtil = new GDriveUtil(credentials);
  const token = await gdriveUtil.getToken(code);
  await fs.writeFile(TOKEN_FILE, JSON.stringify(token, null, 2));
}

async function download(resource, options) {
  const credentials = await getCredentials(options['credentials']);
  const token = await getToken(options['token']);
  const gdriveUtil = new GDriveUtil(credentials, token);
  const files = await gdriveUtil.getFiles(resource);
  const queueFn = () => {
    return files.length > 0 ? 
      { ...files.pop(), outputDir: options.outputDir } : 
      null;
  };
  const pool = await getWorkerThreadPool(10, 
    { workerData: { credentials: credentials, token: token } },
    queueFn);

    for (const worker of pool) {
      worker.postMessage({});
    }
}

async function getWorkerThreadPool(numberOfWorkers, workerData, queueFn) {
  const pool = [];

  for (let i = 0; i < numberOfWorkers; i++) {
    const worker = new Worker('./src/download-worker.js', workerData);
    worker.on('message', async (message) => {

      switch (message) {
        case 'idle':
          const work = queueFn();

          if (work) {
            worker.postMessage({ data: { ...work }});
          } else {
            console.log('terminating');
            await worker.terminate();
          }
          break;
      }

    });
    pool.push(worker);
  }
  return pool;
}

(async() => {

  const program = new Command();

  program
    .version(version)
    .description(description);
    
  program
    .command('auth')
    .option('-c, --credentials <credentials file>', 'Credentials JSON file', CREDENTIALS_FILE)
    .action(async (options) => await auth(options));

  program
    .command('init <code>')
    .option('-c, --credentials <credentials file>', 'Credentials JSON file', CREDENTIALS_FILE)
    .action(async (code, options) => await init(code, options));
    
  program
    .command('download <resource>')
    .option('-o, --output-dir <output directory>', 'Directory to download the files')
    .option('-b, --batch-size <batch size>', 'Number of files to download in parallel', '5')
    .option('-c, --credentials <credentials file>', 'Credentials JSON file', CREDENTIALS_FILE)
    .option('-t, --token <token file>', 'Token', TOKEN_FILE)
    .action(async (resource, options) => await download(resource, options));

  try {
    program.parse(process.argv);
  } catch (error) {
    console.error(`\n >> Error ${error.message}`)
  }
})();