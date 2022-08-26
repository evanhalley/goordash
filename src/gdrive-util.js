const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.readonly'];
const PAGE_SIZE = 100;

module.exports = class GDriveUtil {

  constructor(credentials, token) {
    this.oAuth2Client = new OAuth2Client(
      credentials.clientId, credentials.clientSecret, 
      credentials.redirectUri);

    if (token) {
      this.oAuth2Client.setCredentials(token);
    }
  }

  getAuthorizationUrl() {
    const authUrl = this.oAuth2Client.generateAuthUrl({ 
      access_type: 'offline',
      scope: SCOPES
    });
    return authUrl;
  }

  async getToken(code) {
    const token = await this.oAuth2Client.getToken(code);
    return token.tokens;
  }

  async getFiles(resource) {
    console.info(`Getting list of files @ ${resource}`);
    const files = [];
    const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
    let nextPageToken = null;

    do {
      const params = {
        q: `'${resource}' in parents`,
        pageSize: PAGE_SIZE,
        fields: 'nextPageToken, files(id, name)',
        pageToken: nextPageToken
      };
      const response = await drive.files.list(params);
      
      if (response.data.nextPageToken) {
        nextPageToken = response.data.nextPageToken
      }

      for (const { id, name } of response.data.files) {
        files.push({ id: id, name: name });
      }
    } while (nextPageToken);
    console.info(`${files.length} files found`);
    return files;
  }

  async getDownloadFileStream(sourceFileId, sourceFileName, 
      destinationDir) {
    const destinationFile = path.join(destinationDir, sourceFileName);
    
    console.info(`Downloading: ${sourceFileName} (${sourceFileId}) => ${destinationFile}`);
    const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
    const params = {
      fileId: sourceFileId,
      alt: 'media'
    };
    const options = {
      responseType: 'stream'
    };
    let destinationStream = null;

    try {
      const response = await drive.files.get(params, options);
      const sourceStream = response.data;
      destinationStream = fs.createWriteStream(destinationFile);

      return await new Promise((resolve, reject) => {
        sourceStream
          .on('end', () => {
            console.info(`Finished: ${sourceFileName} (${sourceFileId}) => ${destinationFile}`);
            resolve(destinationFile)
          })
          .on('error', err => {
            console.info(`Error: ${sourceFileName} (${sourceFileId}) => ${destinationFile}`);
            reject(err);
          })
          .pipe(destinationStream);
      });
    } catch (err) {
      console.error(JSON.stringify(err));
    } finally {
      destinationStream.close();
    }
  }
}