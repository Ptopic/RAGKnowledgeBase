import { BadRequestException } from '@nestjs/common';
import * as validator from 'validator';

/**
 * Validate and convert search_space_id to integer.
 */
export function validateSearchSpaceId(searchSpaceId: any): number {
  if (searchSpaceId === null || searchSpaceId === undefined) {
    throw new BadRequestException('search_space_id is required');
  }

  if (typeof searchSpaceId === 'boolean') {
    throw new BadRequestException('search_space_id must be an integer, not a boolean');
  }

  if (typeof searchSpaceId === 'number') {
    if (searchSpaceId <= 0) {
      throw new BadRequestException('search_space_id must be a positive integer');
    }
    return searchSpaceId;
  }

  if (typeof searchSpaceId === 'string') {
    if (!searchSpaceId.trim()) {
      throw new BadRequestException('search_space_id cannot be empty');
    }

    // Check for valid integer format (no leading zeros, no decimal points)
    if (!/^[1-9]\d*$/.test(searchSpaceId.trim())) {
      throw new BadRequestException('search_space_id must be a valid positive integer');
    }

    const value = parseInt(searchSpaceId.trim(), 10);
    if (value <= 0) {
      throw new BadRequestException('search_space_id must be a positive integer');
    }
    return value;
  }

  throw new BadRequestException(
    'search_space_id must be an integer or string representation of an integer',
  );
}

/**
 * Validate and convert document_ids to list of integers.
 */
export function validateDocumentIds(documentIds: any): number[] {
  if (documentIds === null || documentIds === undefined) {
    return [];
  }

  if (!Array.isArray(documentIds)) {
    throw new BadRequestException('document_ids_to_add_in_context must be a list');
  }

  const validatedIds: number[] = [];

  for (let i = 0; i < documentIds.length; i++) {
    const docId = documentIds[i];

    if (typeof docId === 'boolean') {
      throw new BadRequestException(
        `document_ids_to_add_in_context[${i}] must be an integer, not a boolean`,
      );
    }

    if (typeof docId === 'number') {
      if (docId <= 0) {
        throw new BadRequestException(
          `document_ids_to_add_in_context[${i}] must be a positive integer`,
        );
      }
      validatedIds.push(docId);
    } else if (typeof docId === 'string') {
      if (!docId.trim()) {
        throw new BadRequestException(`document_ids_to_add_in_context[${i}] cannot be empty`);
      }

      if (!/^[1-9]\d*$/.test(docId.trim())) {
        throw new BadRequestException(
          `document_ids_to_add_in_context[${i}] must be a valid positive integer`,
        );
      }

      const value = parseInt(docId.trim(), 10);
      if (value <= 0) {
        throw new BadRequestException(
          `document_ids_to_add_in_context[${i}] must be a positive integer`,
        );
      }
      validatedIds.push(value);
    } else {
      throw new BadRequestException(
        `document_ids_to_add_in_context[${i}] must be an integer or string representation of an integer`,
      );
    }
  }

  return validatedIds;
}

/**
 * Validate selected_connectors list.
 */
export function validateConnectors(connectors: any): string[] {
  if (connectors === null || connectors === undefined) {
    return [];
  }

  if (!Array.isArray(connectors)) {
    throw new BadRequestException('selected_connectors must be a list');
  }

  const validatedConnectors: string[] = [];

  for (let i = 0; i < connectors.length; i++) {
    const connector = connectors[i];

    if (typeof connector !== 'string') {
      throw new BadRequestException(`selected_connectors[${i}] must be a string`);
    }

    if (!connector.trim()) {
      throw new BadRequestException(`selected_connectors[${i}] cannot be empty`);
    }

    const trimmed = connector.trim();
    if (!/^[\w\-_]+$/.test(trimmed)) {
      throw new BadRequestException(`selected_connectors[${i}] contains invalid characters`);
    }

    validatedConnectors.push(trimmed);
  }

  return validatedConnectors;
}

/**
 * Validate research_mode parameter.
 */
export function validateResearchMode(researchMode: any): string {
  if (researchMode === null || researchMode === undefined) {
    return 'QNA'; // Default value
  }

  if (typeof researchMode !== 'string') {
    throw new BadRequestException('research_mode must be a string');
  }

  const normalizedMode = researchMode.trim().toUpperCase();
  if (!normalizedMode) {
    throw new BadRequestException('research_mode cannot be empty');
  }

  const validModes = ['QNA'];
  if (!validModes.includes(normalizedMode)) {
    throw new BadRequestException(`research_mode must be one of: ${validModes.join(', ')}`);
  }

  return normalizedMode;
}

/**
 * Validate search_mode parameter.
 */
export function validateSearchMode(searchMode: any): string {
  if (searchMode === null || searchMode === undefined) {
    return 'CHUNKS'; // Default value
  }

  if (typeof searchMode !== 'string') {
    throw new BadRequestException('search_mode must be a string');
  }

  const normalizedMode = searchMode.trim().toUpperCase();
  if (!normalizedMode) {
    throw new BadRequestException('search_mode cannot be empty');
  }

  const validModes = ['CHUNKS', 'DOCUMENTS'];
  if (!validModes.includes(normalizedMode)) {
    throw new BadRequestException(`search_mode must be one of: ${validModes.join(', ')}`);
  }

  return normalizedMode;
}

/**
 * Validate messages structure.
 */
export function validateMessages(messages: any): Array<{ role: string; content: string }> {
  if (!Array.isArray(messages)) {
    throw new BadRequestException('messages must be a list');
  }

  if (messages.length === 0) {
    throw new BadRequestException('messages cannot be empty');
  }

  const validatedMessages: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (typeof message !== 'object' || message === null) {
      throw new BadRequestException(`messages[${i}] must be a dictionary`);
    }

    if (!('role' in message)) {
      throw new BadRequestException(`messages[${i}] must have a 'role' field`);
    }

    if (!('content' in message)) {
      throw new BadRequestException(`messages[${i}] must have a 'content' field`);
    }

    const role = message.role;
    if (typeof role !== 'string' || !['user', 'assistant', 'system'].includes(role)) {
      throw new BadRequestException(
        `messages[${i}].role must be 'user', 'assistant', or 'system'`,
      );
    }

    const content = message.content;
    if (typeof content !== 'string') {
      throw new BadRequestException(`messages[${i}].content must be a string`);
    }

    if (!content.trim()) {
      throw new BadRequestException(`messages[${i}].content cannot be empty`);
    }

    const sanitizedContent = content.trim();
    validatedMessages.push({ role, content: sanitizedContent });
  }

  return validatedMessages;
}

/**
 * Validate email address.
 */
export function validateEmail(email: string): string {
  if (!email || !email.trim()) {
    throw new BadRequestException('Email address is required');
  }

  const trimmedEmail = email.trim();

  if (!validator.isEmail(trimmedEmail)) {
    throw new BadRequestException('Invalid email address format');
  }

  return trimmedEmail;
}

/**
 * Validate URL.
 */
export function validateUrl(url: string): string {
  if (!url || !url.trim()) {
    throw new BadRequestException('URL is required');
  }

  const trimmedUrl = url.trim();

  if (!validator.isURL(trimmedUrl)) {
    throw new BadRequestException('Invalid URL format');
  }

  return trimmedUrl;
}

/**
 * Validate UUID.
 */
export function validateUuid(uuidString: string): string {
  if (!uuidString || !uuidString.trim()) {
    throw new BadRequestException('UUID is required');
  }

  const trimmedUuid = uuidString.trim();

  if (!validator.isUUID(trimmedUuid)) {
    throw new BadRequestException('Invalid UUID format');
  }

  return trimmedUuid;
}

/**
 * Validate connector configuration based on connector type.
 */
export function validateConnectorConfig(
  connectorType: string | any,
  config: Record<string, any>,
): Record<string, any> {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error('config must be a dictionary of connector settings');
  }

  // Convert enum to string if needed
  const connectorTypeStr =
    typeof connectorType === 'object' && 'value' in connectorType
      ? String(connectorType.value)
      : String(connectorType);

  // Validation function helpers
  const validateListField = (key: string, fieldName: string): void => {
    const value = config[key];
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`${fieldName} must be a non-empty list of strings`);
    }
  };

  // Lookup table for connector validation rules
  const connectorRules: Record<
    string,
    {
      required: string[];
      optional?: string[];
      validators?: Record<string, () => void>;
      allow_none_or_empty?: boolean;
    }
  > = {
    SLACK_CONNECTOR: { required: ['SLACK_BOT_TOKEN'], validators: {} },
    NOTION_CONNECTOR: { required: ['NOTION_INTEGRATION_TOKEN'], validators: {} },
    GITHUB_CONNECTOR: {
      required: ['GITHUB_PAT', 'repo_full_names'],
      validators: {
        repo_full_names: () => validateListField('repo_full_names', 'repo_full_names'),
      },
    },
    GOOGLE_CALENDAR_CONNECTOR: {
      required: ['token', 'refresh_token', 'token_uri', 'client_id', 'expiry', 'scopes', 'client_secret'],
      validators: {},
      allow_none_or_empty: false,
    },
    GOOGLE_GMAIL_CONNECTOR: {
      required: ['token', 'refresh_token', 'token_uri', 'client_id', 'expiry', 'scopes', 'client_secret'],
      validators: {},
      allow_none_or_empty: false,
    },
  };

  const rules = connectorRules[connectorTypeStr];
  if (!rules) {
    return config; // Unknown connector type, pass through
  }

  const requiredKeys = new Set(rules.required);
  const optionalKeys = new Set(rules.optional || []);
  const configKeys = new Set(Object.keys(config));

  // Validate that no unexpected keys are present
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const hasUnexpectedKeys = [...configKeys].some((key) => !allowedKeys.has(key));

  if (hasUnexpectedKeys) {
    throw new Error(
      `For ${connectorTypeStr} connector type, config may only contain these keys: ${Array.from(allowedKeys).join(', ')}`,
    );
  }

  // Validate that all required keys are present
  const missingKeys = [...requiredKeys].filter((key) => !configKeys.has(key));
  if (missingKeys.length > 0) {
    throw new Error(
      `For ${connectorTypeStr} connector type, config must include these keys: ${missingKeys.sort().join(', ')}`,
    );
  }

  // Apply custom validators first
  if (rules.validators) {
    for (const validatorFunc of Object.values(rules.validators)) {
      validatorFunc();
    }
  }

  // Validate each field is not empty
  for (const key of rules.required) {
    if (rules.allow_none_or_empty === false) {
      if (!(key in config) || config[key] === null || config[key] === '') {
        throw new Error(`${key} is required and cannot be empty`);
      }
    } else {
      if (!config[key]) {
        throw new Error(`${key} cannot be empty`);
      }
    }
  }

  return config;
}
