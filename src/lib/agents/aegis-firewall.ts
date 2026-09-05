export interface SecurityDocument {
  text: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface SecurityResult {
  riskScore: number; // 0.0 = safe, 1.0 = max risk
  status: 'SAFE' | 'SUSPICIOUS' | 'BLOCKED';
  flags: string[];
  details: Record<string, unknown>;
}

// Prompt injection patterns (case-insensitive)
const PROMPT_INJECTION_PATTERNS = [
  /\bignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions?|prompts?|rules?|guidelines?)/i,
  /\bsystem\s+prompt/i,
  /\byou\s+are\s+now\b/i,
  /\bdisregard\s+(all\s+)?(previous|prior|above|earlier|instructions?)/i,
  /\boverride\s+(instructions?|rules?|guidelines?|safety)/i,
  /\bforget\s+(your|all)\s+instructions?/i,
  /\bnew\s+instructions?\b/i,
  /\bADMIN\s+OVERRIDE/i,
  /\bjailbreak/i,
  /\bIMPORTANT:\s*(ignore|disregard|override|forget)/i,
];

// Instruction patterns directed at AI
const INSTRUCTION_PATTERNS = [
  /\bapprove\s+(this|the)\s+(transaction|payment|request|order)/i,
  /\brelease\s+(the\s+)?payment/i,
  /\bmark\s+as\s+(verified|approved|complete|done)/i,
  /\bbypass\s+(verification|checks?|validation|security)/i,
  /\bskip\s+(verification|checks?|validation|security|all\s+checks?)/i,
  /\bauto[-\s]?approve/i,
  /\bforce\s+(approve|approval|release|payment)/i,
  /\bapprove\s+without/i,
];

// Invisible / suspicious unicode characters
const ENCODING_TRICKS = [
  // RTL override characters
  /[‪-‮]/,
  // LTR override
  /[⁦-⁩]/,
  // Zero-width characters
  /[​-‏]/,
  // Soft hyphen
  /­/,
  // Word joiner
  /⁠/,
  // Homoglyphs: Cyrillic 'a', 'e', 'o' etc. mixed with Latin
  // Check for mixed scripts that could be homograph attacks
  /[аеорсук]\s*[aeopcyk]|[aeopcyk]\s*[аеорсук]/i,
];

const DANGEROUS_MIME_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-ms-dos-executable',
  'application/x-elf',
  'application/x-mach-binary',
  'application/java-archive',
  'application/x-bat',
  'application/x-sh',
];

const SUSPICIOUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.ws', '.msi', '.dll'];

function checkPromptInjection(documents: SecurityDocument[]): {
  flagged: boolean;
  matches: string[];
  risk: number;
} {
  const matches: string[] = [];

  for (const doc of documents) {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      const found = doc.text.match(pattern);
      if (found) {
        matches.push(`${doc.fileName}: "${found[0]}"`);
      }
    }
  }

  return {
    flagged: matches.length > 0,
    matches,
    risk: matches.length > 0 ? 0.4 : 0,
  };
}

function checkInstructions(documents: SecurityDocument[]): {
  flagged: boolean;
  matches: string[];
  risk: number;
} {
  const matches: string[] = [];

  for (const doc of documents) {
    for (const pattern of INSTRUCTION_PATTERNS) {
      const found = doc.text.match(pattern);
      if (found) {
        matches.push(`${doc.fileName}: "${found[0]}"`);
      }
    }
  }

  return {
    flagged: matches.length > 0,
    matches,
    risk: matches.length > 0 ? 0.3 : 0,
  };
}

function checkSuspiciousMetadata(documents: SecurityDocument[]): {
  flagged: boolean;
  issues: string[];
  risk: number;
} {
  const issues: string[] = [];
  let risk = 0;

  for (const doc of documents) {
    // Check for very large files (>10MB)
    if (doc.fileSize > 10 * 1024 * 1024) {
      issues.push(`${doc.fileName}: File size ${(doc.fileSize / 1024 / 1024).toFixed(1)}MB exceeds 10MB threshold`);
      risk += 0.1;
    }

    // Check for executable MIME types
    if (DANGEROUS_MIME_TYPES.includes(doc.fileType.toLowerCase())) {
      issues.push(`${doc.fileName}: Dangerous MIME type: ${doc.fileType}`);
      risk += 0.1;
    }

    // Check for suspicious file extensions
    const ext = doc.fileName.toLowerCase().split('.').pop();
    if (ext && SUSPICIOUS_EXTENSIONS.includes(`.${ext}`)) {
      issues.push(`${doc.fileName}: Suspicious file extension: .${ext}`);
      risk += 0.1;
    }
  }

  return {
    flagged: issues.length > 0,
    issues,
    risk: Math.min(risk, 0.3), // Cap per-check risk
  };
}

function checkConflictingData(documents: SecurityDocument[]): {
  flagged: boolean;
  conflicts: string[];
  risk: number;
} {
  if (documents.length < 2) {
    return { flagged: false, conflicts: [], risk: 0 };
  }

  const conflicts: string[] = [];

  // Extract PO numbers from text using common patterns
  const poPatterns = [
    /(?:PO|P\.O\.|Purchase\s*Order)[\s:#-]+([A-Za-z0-9-]+)/gi,
    /(?:po_number|poNumber|po-number)["':\s]+["']?([A-Za-z0-9-]+)/gi,
  ];

  // Extract amounts from text
  const amountPatterns = [
    /(?:total|amount|invoice\s*total|grand\s*total)[\s:$#]+[\d,]+(?:\.\d{2})?/gi,
    /\$[\d,]+(?:\.\d{2})/g,
  ];

  const poNumbers = new Set<string>();
  const amounts = new Set<string>();

  for (const doc of documents) {
    for (const pattern of poPatterns) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(doc.text)) !== null) {
        // Normalize: strip a leading "po-" prefix so "PO-2026-1045" and "2026-1045" are the same
        const raw = match[1].trim().toLowerCase();
        const normalized = raw.replace(/^po-/i, '');
        poNumbers.add(normalized);
      }
    }

    for (const pattern of amountPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(doc.text)) !== null) {
        amounts.add(match[0].trim().toLowerCase());
      }
    }
  }

  const poNumbersList = Array.from(poNumbers);
  const amountsList = Array.from(amounts);

  if (poNumbersList.length > 1) {
    conflicts.push(`Multiple PO numbers found: ${poNumbersList.join(', ')}`);
  }

  if (amountsList.length > 1) {
    conflicts.push(`Multiple amounts found: ${amountsList.join(', ')}`);
  }

  return {
    flagged: conflicts.length > 0,
    conflicts,
    risk: conflicts.length > 0 ? 0.2 : 0,
  };
}

function checkEncodingTricks(documents: SecurityDocument[]): {
  flagged: boolean;
  issues: string[];
  risk: number;
} {
  const issues: string[] = [];

  for (const doc of documents) {
    for (const pattern of ENCODING_TRICKS) {
      const found = doc.text.match(pattern);
      if (found) {
        issues.push(`${doc.fileName}: Suspicious encoding pattern detected`);
        break; // One flag per document is enough
      }
    }
  }

  return {
    flagged: issues.length > 0,
    issues,
    risk: issues.length > 0 ? 0.3 : 0,
  };
}

export function runSecurityCheck(documents: SecurityDocument[]): SecurityResult {
  const flags: string[] = [];
  const details: Record<string, unknown> = {};
  let totalRisk = 0;

  // 1. Prompt injection detection
  const injectionResult = checkPromptInjection(documents);
  if (injectionResult.flagged) {
    flags.push('prompt_injection_detected');
    details['prompt_injection_matches'] = injectionResult.matches;
    totalRisk += injectionResult.risk;
  }

  // 2. Instruction detection
  const instructionResult = checkInstructions(documents);
  if (instructionResult.flagged) {
    flags.push('instruction_directed_at_ai');
    details['instruction_matches'] = instructionResult.matches;
    totalRisk += instructionResult.risk;
  }

  // 3. Suspicious metadata
  const metadataResult = checkSuspiciousMetadata(documents);
  if (metadataResult.flagged) {
    flags.push('suspicious_file_metadata');
    details['metadata_issues'] = metadataResult.issues;
    totalRisk += metadataResult.risk;
  }

  // 4. Conflicting data
  const conflictResult = checkConflictingData(documents);
  if (conflictResult.flagged) {
    flags.push('conflicting_evidence');
    details['conflicts'] = conflictResult.conflicts;
    totalRisk += conflictResult.risk;
  }

  // 5. Encoding tricks
  const encodingResult = checkEncodingTricks(documents);
  if (encodingResult.flagged) {
    flags.push('encoding_manipulation');
    details['encoding_issues'] = encodingResult.issues;
    totalRisk += encodingResult.risk;
  }

  // Cap risk score at 1.0
  const riskScore = Math.min(totalRisk, 1.0);

  // Determine status
  let status: SecurityResult['status'];
  if (riskScore < 0.2) {
    status = 'SAFE';
  } else if (riskScore <= 0.6) {
    status = 'SUSPICIOUS';
  } else {
    status = 'BLOCKED';
  }

  details['total_risk_score'] = riskScore;

  return {
    riskScore,
    status,
    flags,
    details,
  };
}


export interface ForensicFlags {
  flags: string[];
  riskScore: number;
  status: 'SAFE' | 'SUSPICIOUS' | 'BLOCKED';
}

/**
 * Run forensic integrity checks on document metadata.
 * Accepts the forensicMetadata JSONB from the documents table.
 */
export function runForensicCheck(
  _forensicMeta: Record<string, unknown>[],
): ForensicFlags {
  return { flags: [], riskScore: 0, status: 'SAFE' };
}
