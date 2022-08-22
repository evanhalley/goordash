import { OAuth2Client } from "google-auth-library";
import { google, drive_v3 } from "googleapis";
import path from 'path';
import fs from 'fs';
import { MethodOptions } from "googleapis-common";
import { Readable } from "stream";

const SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.readonly'];
const PAGE_SIZE = 100;

export class GDriveUtil {

  private oAuth2Client: OAuth2Client;

  constructor(credentials: Credentials, token: any = null) {
    this.oAuth2Client = new OAuth2Client(
      credentials.clientId, credentials.clientSecret, 
      credentials.redirectUri);

    if (token) {
      this.oAuth2Client.setCredentials(token);
    }
  }

  getAuthorizationUrl(): string {
    const authUrl = this.oAuth2Client.generateAuthUrl({ 
      access_type: 'offline',
      scope: SCOPES
    });
    return authUrl;
  }

  async getToken(code: string): Promise<any> {
    const token = await this.oAuth2Client.getToken(code);
    return token.tokens;
  }

  async getFiles(resource: string): Promise<Array<any>> {
    const files = new Array<any>();
    const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
    let nextPageToken = null;

    do {
      const params: drive_v3.Params$Resource$Files$List = {
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
    } while (nextPageToken)
    return files;
  }

  async downloadFile(sourceFileId: string, sourceFileName: string, 
      destinationDir: string): Promise<string> {
    const destinationFile = path.join(destinationDir, sourceFileName);
    const destinationStream = fs.createWriteStream(destinationFile);
    
    console.info(`Downloading: ${sourceFileName} (${sourceFileId}) => ${destinationFile}`);
    const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
    const params: drive_v3.Params$Resource$Files$Get = {
      fileId: sourceFileId,
      alt: 'media'
    };
    const options: MethodOptions = {
      responseType: 'stream'
    };

    try {
      const res = await drive.files.get(params, options);
      const stream = res.data as Readable;

      return await new Promise((resolve, reject) => {
        stream
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

export type Credentials = {
  clientId: string;
  clientSecret: string,
  redirectUri: string,
}