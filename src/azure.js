const azureStorage  = require('azure-storage');
const blobService = azureStorage.createBlobService()
const containerName = 'images'
const containerNameDocs = 'docs'

const getBlobName = originalName => {
    const identifier = Math.random().toString().replace(/0\./, ''); // remove "0." from start of string
    return `${identifier}-${originalName}`;
};

blobService.createBlockBlobFromLocalFile

const getStorageAccountName = () => {
    const matches = /AccountName=(.*?);/.exec(process.env.AZURE_STORAGE_CONNECTION_STRING);
    return matches[1];
}

const getFileUrl = (fileName) => {
    const account = getStorageAccountName();
    const hostName = `https://${account}.blob.core.windows.net`;

    const url = blobService.getUrl(containerName, fileName, null, hostName);
    return url
}

const getDocURL = (fileName) => {
    const account = getStorageAccountName();
    const hostName = `https://${account}.blob.core.windows.net`;

    const url = blobService.getUrl(containerNameDocs, fileName, null, hostName);
    return url
}

module.exports = {
    getBlobName,
    containerName,
    blobService,
    getFileUrl,
    getDocURL,
    containerNameDocs
}