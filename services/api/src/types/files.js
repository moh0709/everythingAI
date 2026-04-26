/**
 * @typedef {'indexed' | 'failed'} IndexStatus
 *
 * @typedef {Object} IndexedFileRecord
 * @property {string} id
 * @property {string} filename
 * @property {string} absolute_path
 * @property {string} relative_path
 * @property {string} extension
 * @property {string | null} mime_type
 * @property {number | null} size_bytes
 * @property {string | null} created_at
 * @property {string | null} modified_at
 * @property {string | null} content_hash
 * @property {IndexStatus} index_status
 * @property {string} last_indexed_at
 * @property {string | null} error_message
 */

export {};
