import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

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

  async listFiles(resource: string) {
    const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
    const files = await drive.files.list({
      q: `'${resource}' in parents`,
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    });
    console.log(JSON.stringify(files.data.files));
  }
}

export type Credentials = {
  clientId: string;
  clientSecret: string,
  redirectUri: string,
}