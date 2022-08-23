import { Command } from 'commander';
import { version, description } from '../package.json';
import { GDriveUtil, Credentials } from './gdrive-util';
import { promises as fsPromises } from 'fs';
import os from 'os';

async function getCredentials(credentialsFile: string): Promise<Credentials> {
  const buffer = await fsPromises.readFile(credentialsFile);
  const creds = JSON.parse(buffer.toString());
  const credentials: Credentials = {
    clientId: creds.installed.client_id,
    clientSecret: creds.installed.client_secret,
    redirectUri: creds.installed.redirect_uris[0]
  };
  return credentials;
}

async function getToken(tokenFile: string): Promise<any> {
  const buffer = await fsPromises.readFile(tokenFile);
  const token = JSON.parse(buffer.toString());
  return token;
}

async function auth(options) {
  const credentials = await getCredentials(options['credentials']);
  const gdriveUtil = new GDriveUtil(credentials);
  const authUrl = gdriveUtil.getAuthorizationUrl();
  console.log(authUrl);
}

async function init(code: string, options) {
  const credentials = await getCredentials(options['credentials']);
  const gdriveUtil = new GDriveUtil(credentials);
  const token = await gdriveUtil.getToken(code);
  await fsPromises.writeFile(`${os.homedir()}/.goordash/token.json`, JSON.stringify(token));
  console.log(JSON.stringify(token));
}

async function download(resource, options) {
  const credentials = await getCredentials(options['credentials']);
  const token = await getToken(options['token']);
  const gdriveUtil = new GDriveUtil(credentials, token);
  const files = await gdriveUtil.getFiles(resource);
  const batchSize = parseInt(options['batchSize']);
  let promises = [];

  while (files.length > 0) {
    const file = files.pop();

    if (promises.length < batchSize) {
      promises.push(gdriveUtil.downloadFile(file.id, file.name, options.outputDir));
    } 
    
    if (promises.length == batchSize || files.length == 0) {
      await Promise.allSettled(promises);
      promises = [];
    }
  }
}

(async() => {

  const program = new Command();

  program
    .version(version)
    .description(description);
    
  program
    .command('auth')
    .option('-c, --credentials <credentials file>', 'Credentials JSON file', `${os.homedir()}/.goordash/credentials.json`)
    .action(async (options) => await auth(options));

  program
    .command('init <code>')
    .option('-c, --credentials <credentials file>', 'Credentials JSON file', `${os.homedir()}/.goordash/credentials.json`)
    .action(async (code, options) => await init(code, options));
    
  program
    .command('download <resource>')
    .option('-o, --output-dir <output directory>', 'Directory to download the files')
    .option('-b, --batch-size <batch size>', 'Number of files to download in parallel', '5')
    .option('-c, --credentials <credentials file>', 'Credentials JSON file', `${os.homedir()}/.goordash/credentials.json`)
    .option('-t, --token <token file>', 'Token', `${os.homedir()}/.goordash/token.json`)
    .action(async (resource, options) => await download(resource, options));

  try {
    program.parse(process.argv);
  } catch (error) {
    console.error(`\n >> Error ${error.message}`)
  }
})();