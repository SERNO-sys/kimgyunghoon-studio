import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/admin/media';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

interface MagicSignature {
  bytes: number[];
  offset?: number;
}

const MAGIC_BYTES: Record<string, MagicSignature[]> = {
  'image/jpeg': [{ bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [
    {
      bytes: [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ],
    },
  ],
  'image/gif': [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  ],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }],
};

export interface FileValidationResult {
  valid: boolean;
  message?: string;
}

export function validateFileType(file: File): FileValidationResult {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, message: 'Unsupported file type.' };
  }
  return { valid: true };
}

export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    };
  }
  return { valid: true };
}

export function validateExtensionMatchesMime(
  file: File
): FileValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, message: 'Invalid file extension.' };
  }

  const expectedTypes = new Map<string, string[]>([
    ['jpg', ['image/jpeg']],
    ['jpeg', ['image/jpeg']],
    ['png', ['image/png']],
    ['gif', ['image/gif']],
    ['webp', ['image/webp']],
  ]);

  const allowedTypes = expectedTypes.get(extension);
  if (!allowedTypes || !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      message: 'File extension does not match content type.',
    };
  }

  return { valid: true };
}

export async function validateMagicBytes(
  file: File
): Promise<FileValidationResult> {
  const signatures = MAGIC_BYTES[file.type];
  if (!signatures) {
    return { valid: false, message: 'No magic bytes defined for this type.' };
  }

  const maxOffset = signatures.reduce((max, signature) => {
    return Math.max(max, signature.offset ?? 0, signature.bytes.length);
  }, 0);

  const buffer = await file.slice(0, maxOffset + 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const matches = signatures.some((signature) => {
    const offset = signature.offset ?? 0;
    return signature.bytes.every(
      (byte, index) => bytes[offset + index] === byte
    );
  });

  if (!matches) {
    return {
      valid: false,
      message: 'File content does not match the declared type.',
    };
  }

  if (file.type === 'image/webp') {
    const riff = Array.from(bytes.slice(0, 4))
      .map((byte) => String.fromCharCode(byte))
      .join('');
    const webp = Array.from(bytes.slice(8, 12))
      .map((byte) => String.fromCharCode(byte))
      .join('');
    if (riff !== 'RIFF' || webp !== 'WEBP') {
      return { valid: false, message: 'Invalid WebP file.' };
    }
  }

  return { valid: true };
}

export async function validateSvgSafety(
  file: File
): Promise<FileValidationResult> {
  if (file.type !== 'image/svg+xml') {
    return { valid: true };
  }

  const text = await file.text();
  const dangerousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
  ];

  if (dangerousPatterns.some((pattern) => pattern.test(text))) {
    return {
      valid: false,
      message: 'SVG contains potentially dangerous content.',
    };
  }

  return { valid: true };
}

export async function validateImageSecure(file: File): Promise<void> {
  const checks = [
    validateFileType(file),
    validateFileSize(file),
    validateExtensionMatchesMime(file),
  ];

  for (const check of checks) {
    if (!check.valid) {
      throw new Error(check.message);
    }
  }

  const magicResult = await validateMagicBytes(file);
  if (!magicResult.valid) {
    throw new Error(magicResult.message);
  }

  const svgResult = await validateSvgSafety(file);
  if (!svgResult.valid) {
    throw new Error(svgResult.message);
  }
}
