#!/usr/bin/env node

const { Command } = require('commander');
const { Worker } = require('worker_threads');
const { version, description } = require('../package.json');
const fs = require('fs').promises;
const os = require('os');
const GDriveUtil = require('./gdrive-util');

const TOKEN_FILE = `${os.homedir()}/.takeout-express/token.json`;
const CREDENTIALS_FILE = `${os.homedir()}/.takeout-express/credentials.json`;

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
  console.info(`Open the following URL in a web browser:\n\n${authUrl}\n\nAfter authorization, copy the code from the resulting URL and execute:\n\ntakeout-express init [authorization code]`);
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
  const pool = await getWorkerThreadPool(options.workerThreads, 
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
    const threadId = worker.threadId;
    console.info(`Creating worker ${threadId}`);

    worker.on('message', async (message) => {

      switch (message.status) {
        case 'idle':
          const work = queueFn();

          if (work) {
            worker.postMessage({ data: { ...work }});
          } else {
            console.info(`Terminating worker ${threadId}`);
            await worker.terminate();
          }
          break;
      }
    });

    worker.on('error', (error) => {
      console.error(`Error in worker ${threadId}: `, error);
    })
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
    .option('-w, --worker-threads <batch size>', 'Number of threads downloading files', '5')
    .option('-c, --credentials <credentials file>', 'Credentials JSON file', CREDENTIALS_FILE)
    .option('-t, --token <token file>', 'Token', TOKEN_FILE)
    .action(async (resource, options) => await download(resource, options));

  try {
    program.parse(process.argv);
  } catch (error) {
    console.error(`\n >> Error ${error.message}`)
  }
})();