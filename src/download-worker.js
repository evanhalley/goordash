const { workerData, parentPort } = require('worker_threads');
const GDriveUtil = require('./gdrive-util');

const gdriveUtil = new GDriveUtil(workerData.credentials, workerData.token);

parentPort.on('message', async (message) => {
  const { data } = message;

  if (data) {
    await gdriveUtil.getDownloadFileStream(data.id, data.name, data.outputDir);
  }
  parentPort.postMessage('idle');
});