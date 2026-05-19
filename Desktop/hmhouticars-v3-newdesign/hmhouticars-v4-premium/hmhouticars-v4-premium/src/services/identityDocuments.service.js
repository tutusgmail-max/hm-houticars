/** @deprecated — use documentUpload.service.js */
export {
  DOCUMENTS_BUCKET,
  parseDocuments as parseIdentityDocuments,
  areDocumentsComplete as isIdentityComplete,
  getDocumentUrlsMap as getIdentityPathsMap,
  getDocumentUrlsMap as getIdentityUrlsMap,
  resolveDocumentUrls as resolveIdentityDocuments,
  uploadDocument as uploadIdentityDocument,
  uploadSingleDocument as saveIdentityDocument,
  uploadAllReservationDocuments as saveIdentityDocuments,
  uploadReservationDocuments,
  fetchUserDocuments,
  resolveDocumentLinks,
  docsToReservationUrlColumns,
  validateDocumentFile,
  storagePath,
} from './documentUpload.service'
