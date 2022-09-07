# Takeout Express

takeout-express is a command line interface tool, written with Nodejs, that downloads your Google Takeout backup from Google Drive. It utilizes worker threads to download more than one archive file at a time that may speed up the time it takes to finish your download.
## Install

You must have Nodejs v14.14+ to execute takeout-express.

Run `npm install -g takeout-express` to install.

You can also download and install `takeout-express` from source.

1. Clone this repository (`git clone git@github.com:evanhalley/takeout-express.git`).
2. Execute `cd takeout-express`.
3. Run `npm install` to install the dependencies.
4. Install takeout-express locally running `npm link`.
5. Execute `takeout-express --version` and verify a version number is printed to the terminal.

## Setup

Getting takeout-express ready to run is a two-step process.

### Authorization

takeout-express needs access to your Google Drive account to download your Google Takeout archive.  

1.  Visit the [Google Cloud platform console](https://console.cloud.google.com/) to setup an API project.
2. Enable the [Google Drive API](https://console.cloud.google.com/apis/library).
3. Create `OAuth client ID` credentials.
  * Application type: Web application
  * Name: takeout-express
4. Download the resulting JSON file.
5. In your home directory, create a hidden folder called `.takeout-express`.  Save the credentials file in your hidden folder as `credential.json`.
6. Open a terminal window and execute `takeout-express auth`.  A URL will be printed in the terminal window

```
Open the following URL in a web browser:

https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.metadata.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.readonly&response_type=code&client_id=...&redirect_uri=...

After authorization, copy the code from the resulting URL and execute:

takeout-express init [authorization code]
```

7. Sign in to your Google account and grant takeout-express the requested access.  You'll then be directed to a non-existant page (localhost).  The `authorization_code` will be in the URL bar in your browser.  Copy that value to your clipboard.

### Initialization

8. Return to your terminal window and execute `takeout-express init [authorization_code]`.  This will initialize takeout-express to have permanent access to your Google Drive account, by saving a series of tokens to `.takeout-express/token.json`.  You can remove this file at any time to terminate takeout-express' access to your Google Drive account.

After completing these steps, you can run takeout-express.

## Usage

```
Usage: takeout-express download [options] <resource>

Options:
  -o, --output-dir <output directory>   Directory to download the files
  -w, --worker-threads <batch size>     Number of threads downloading files (default: "5")
  -c, --credentials <credentials file>  Credentials JSON file (default: "[/home_directory]/.takeout-express/credentials.json")
  -t, --token <token file>              Token (default: "[/home_directory]/.takeout-express/token.json")
  -h, --help                            display help for command

```

`<resource>` is the Google Drive ID of the folder containing your Google Takeout archive.  For example, for the following URL in Google Drive (when viewing my Google Takeout archive):

```
https://drive.google.com/drive/folders/kljahakjhsd98as-324-sadf-23ads
```

The `resource` value is `kljahakjhsd98as-324-sadf-23ads`.

Executing the following command will download the Google Takeout archive with the ID `kljahakjhsd98as-324-sadf-23ads`.

```
takeout-express download \
  --output-dir my-archive/ \
  kljahakjhsd98as-324-sadf-23ads
```

Depending on the size of your archive, your internet connection, and the speed of your storage device, it may take takeout-express a few hours to days to download your archive. By default, takeout-express will use 5 threads to download 5 files in parallel at a time.  You can increase (or decrease) this value with the `--worker-threads` parameter to fit your situation.