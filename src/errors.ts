export class ImportError extends Error {
    get isImportError() {
        return true
    }
}
