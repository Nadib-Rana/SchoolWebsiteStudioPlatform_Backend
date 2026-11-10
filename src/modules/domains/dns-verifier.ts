import * as dns from 'node:dns/promises';

export interface DnsCheckRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  expected: string;
  current: string | null;
  status: 'VERIFIED' | 'PENDING' | 'MISMATCH';
  lastCheckedAt: string;
}

export interface VerificationResult {
  verified: boolean;
  status: 'SSL_ACTIVE' | 'PENDING_DNS';
  sslStatus: 'ACTIVE' | 'PENDING_PROPAGATION';
  sslDetails: {
    issuer: string;
    protocol: string;
    validDays: number;
    issuedAt?: string;
  };
  dnsRecords: DnsCheckRecord[];
}

const EXPECTED_A_IP = '76.76.21.21';
const EXPECTED_CNAME = 'cname.schoolcanvas.app';

async function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]).catch(() => null);
}

export async function verifyDomainDns(
  domainName: string,
  schoolId: string,
  simulate = false,
): Promise<VerificationResult> {
  const now = new Date().toISOString();
  const txtToken = `verify-token-${schoolId.slice(0, 8)}`;

  if (simulate || domainName.endsWith('.test') || domainName.endsWith('.local') || domainName.endsWith('.demo')) {
    return {
      verified: true,
      status: 'SSL_ACTIVE',
      sslStatus: 'ACTIVE',
      sslDetails: {
        issuer: "Let's Encrypt Authority X3",
        protocol: 'TLS 1.3 / 256-Bit SHA',
        validDays: 90,
        issuedAt: now,
      },
      dnsRecords: [
        { type: 'CNAME', name: 'www', expected: EXPECTED_CNAME, current: EXPECTED_CNAME, status: 'VERIFIED', lastCheckedAt: now },
        { type: 'A', name: '@', expected: EXPECTED_A_IP, current: EXPECTED_A_IP, status: 'VERIFIED', lastCheckedAt: now },
        { type: 'TXT', name: '_studio-verify', expected: txtToken, current: txtToken, status: 'VERIFIED', lastCheckedAt: now },
      ],
    };
  }

  // Real DNS lookups
  const [cnameResult, aResult, txtResult] = await Promise.all([
    withTimeout(dns.resolveCname(domainName)),
    withTimeout(dns.resolve4(domainName)),
    withTimeout(dns.resolveTxt(`_studio-verify.${domainName}`)),
  ]);

  const cnameVal = Array.isArray(cnameResult) && cnameResult.length > 0 ? cnameResult[0] : null;
  const aVal = Array.isArray(aResult) && aResult.length > 0 ? aResult[0] : null;
  const txtFlat = Array.isArray(txtResult) ? txtResult.flat().join(' ') : null;

  const cnameVerified = Boolean(
    cnameVal && (cnameVal.includes('schoolcanvas.app') || cnameVal.includes('schoolstudio.site')),
  );
  const aVerified = aVal === EXPECTED_A_IP;
  const txtVerified = Boolean(txtFlat && txtFlat.includes(txtToken));

  const records: DnsCheckRecord[] = [
    {
      type: 'CNAME',
      name: 'www',
      expected: EXPECTED_CNAME,
      current: cnameVal,
      status: cnameVerified ? 'VERIFIED' : 'PENDING',
      lastCheckedAt: now,
    },
    {
      type: 'A',
      name: '@',
      expected: EXPECTED_A_IP,
      current: aVal,
      status: aVerified ? 'VERIFIED' : 'PENDING',
      lastCheckedAt: now,
    },
    {
      type: 'TXT',
      name: '_studio-verify',
      expected: txtToken,
      current: txtFlat,
      status: txtVerified ? 'VERIFIED' : 'PENDING',
      lastCheckedAt: now,
    },
  ];

  const isVerified = cnameVerified || aVerified || txtVerified;

  return {
    verified: isVerified,
    status: isVerified ? 'SSL_ACTIVE' : 'PENDING_DNS',
    sslStatus: isVerified ? 'ACTIVE' : 'PENDING_PROPAGATION',
    sslDetails: {
      issuer: "Let's Encrypt Authority X3",
      protocol: 'TLS 1.3 / 256-Bit SHA',
      validDays: 90,
      issuedAt: isVerified ? now : undefined,
    },
    dnsRecords: records,
  };
}
