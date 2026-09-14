import path from 'node:path';

const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const DEFAULT_EXCLUDE_PATTERNS = ['**/.git/**', '**/node_modules/**'];

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalPath(value) {
  const normalized = normalizeString(value);
  if (!normalized) return '';
  return path.resolve(normalized);
}

function isSameOrNestedPath(parentPath, candidatePath) {
  const parent = canonicalPath(parentPath);
  const candidate = canonicalPath(candidatePath);
  if (!parent || !candidate) return false;
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeSourceRoot(source = {}) {
  const sourcePath = canonicalPath(source.path);
  return {
    path: sourcePath,
    watch_enabled: source.watch_enabled !== false,
    recursive: source.recursive !== false,
    full_drive: source.full_drive === true,
    include_hidden: source.include_hidden === true,
    include_patterns: Array.isArray(source.include_patterns) && source.include_patterns.length > 0
      ? source.include_patterns.map(normalizeString).filter(Boolean)
      : ['**/*'],
    exclude_patterns: Array.isArray(source.exclude_patterns)
      ? source.exclude_patterns.map(normalizeString).filter(Boolean)
      : DEFAULT_EXCLUDE_PATTERNS,
    max_file_size_bytes: Number.isInteger(source.max_file_size_bytes) && source.max_file_size_bytes > 0
      ? source.max_file_size_bytes
      : DEFAULT_MAX_FILE_SIZE_BYTES,
  };
}

export function normalizeArchiveProfile(input = {}) {
  const sourceRoots = Array.isArray(input.source_roots)
    ? input.source_roots.map(normalizeSourceRoot)
    : [];

  return {
    id: normalizeString(input.id),
    name: normalizeString(input.name),
    source_roots: sourceRoots,
    archive_destination: canonicalPath(input.archive_destination),
    copy_policy: normalizeString(input.copy_policy) || 'copy_first',
    overwrite_policy: normalizeString(input.overwrite_policy) || 'never_without_explicit_approval',
    metadata_enrichment_enabled: input.metadata_enrichment_enabled !== false,
    approval_policy: normalizeString(input.approval_policy) || 'manual_before_execution',
    archive_inside_source_acknowledged: input.archive_inside_source_acknowledged === true,
    full_drive_warning_acknowledged: input.full_drive_warning_acknowledged === true,
  };
}

export function validateArchiveProfile(input = {}) {
  const profile = normalizeArchiveProfile(input);
  const errors = [];

  if (!profile.name) errors.push({ field: 'name', code: 'REQUIRED' });
  if (profile.source_roots.length === 0) errors.push({ field: 'source_roots', code: 'REQUIRED' });
  if (!profile.archive_destination) errors.push({ field: 'archive_destination', code: 'REQUIRED' });

  for (const [index, source] of profile.source_roots.entries()) {
    if (!source.path) {
      errors.push({ field: `source_roots[${index}].path`, code: 'REQUIRED' });
      continue;
    }

    if (profile.archive_destination && canonicalPath(source.path) === profile.archive_destination) {
      errors.push({ field: 'archive_destination', code: 'SOURCE_DESTINATION_MUST_DIFFER' });
    }

    if (
      profile.archive_destination
      && isSameOrNestedPath(source.path, profile.archive_destination)
      && !profile.archive_inside_source_acknowledged
    ) {
      errors.push({ field: 'archive_destination', code: 'DESTINATION_INSIDE_SOURCE_REQUIRES_ACKNOWLEDGEMENT' });
    }

    if (source.full_drive && !profile.full_drive_warning_acknowledged) {
      errors.push({ field: `source_roots[${index}].full_drive`, code: 'FULL_DRIVE_REQUIRES_ACKNOWLEDGEMENT' });
    }
  }

  if (profile.copy_policy !== 'copy_first') {
    errors.push({ field: 'copy_policy', code: 'COPY_FIRST_REQUIRED' });
  }

  if (profile.overwrite_policy !== 'never_without_explicit_approval') {
    errors.push({ field: 'overwrite_policy', code: 'NO_OVERWRITE_POLICY_REQUIRED' });
  }

  if (profile.approval_policy !== 'manual_before_execution') {
    errors.push({ field: 'approval_policy', code: 'MANUAL_APPROVAL_REQUIRED' });
  }

  return {
    valid: errors.length === 0,
    errors,
    profile,
  };
}

export const archiveProfileDefaults = Object.freeze({
  max_file_size_bytes: DEFAULT_MAX_FILE_SIZE_BYTES,
  exclude_patterns: [...DEFAULT_EXCLUDE_PATTERNS],
  copy_policy: 'copy_first',
  overwrite_policy: 'never_without_explicit_approval',
  approval_policy: 'manual_before_execution',
});
