## [STRIDE-001] Authentication and Identity
Apply strong authentication for users and services to prevent identity spoofing and unauthorized access. Use MFA for human users, mutual TLS or signed short-lived service tokens for machine-to-machine communication, and centralized identity providers with strict session controls. Rotate secrets, disable shared credentials, enforce secure token validation, and require proof of possession where possible.

## [STRIDE-002] Authorization and Least Privilege
Enforce authorization on the server side for every sensitive action and resource operation. Use RBAC and ABAC with least privilege, scope tokens to explicit audiences and actions, and separate admin, operator, and runtime roles. Deny by default, validate permissions at every trust boundary, and continuously review role assignments and privilege drift.

## [STRIDE-003] Integrity and Tamper Protection
Protect data integrity in transit and at rest using message signing, checksums, immutable logs, strict write controls, and strong schema validation. Validate payloads at trust boundaries, reject malformed or unexpected fields, and use versioned contracts for critical APIs. Add anti-replay protections such as nonces, timestamps, and idempotency keys for high-risk operations.

## [STRIDE-004] Audit and Non-Repudiation
Maintain centralized, immutable audit logs including timestamp, actor identity, action, target, source, correlation id, and outcome. Protect log pipelines against tampering, data loss, and privilege abuse. Define retention, legal hold, and traceability policies to support incident response, forensic analysis, and non-repudiation claims.

## [STRIDE-005] Data Protection and Confidentiality
Encrypt data in transit (TLS 1.2+ or higher) and at rest with managed keys and access controls. Minimize sensitive data exposure, classify data by sensitivity, and enforce data handling policies for logs, backups, and analytics exports. Mask secrets and personal data in logs, and segment sensitive workloads across strict trust boundaries.

## [STRIDE-006] Availability and DoS Resilience
Use layered availability controls including rate limiting, circuit breakers, timeouts, retries with backoff, queue protection, graceful degradation, and autoscaling. Protect edge services with WAF/CDN, upstream capacity controls, and request prioritization for critical paths. Validate resource limits for CPU, memory, connections, and storage to reduce denial of service impact.

## [STRIDE-007] Boundary and Flow Hardening
Treat trust boundary crossings as high-risk flows and model every crossing explicitly. Validate protocol, origin, destination, identity, and payload on each hop. Enforce explicit allowlists, network segmentation, service identity, and zero-trust principles with continuous verification and least-privileged communication paths.

## [STRIDE-008] Secure API and Input Validation
Validate all inputs with strict schema constraints and reject malformed content early. Apply API gateway policies for authentication, authorization, threat protection, and per-client throttling. Use safe deserialization, output encoding, and content-type validation to reduce injection, parser abuse, and protocol confusion.

## [STRIDE-009] Spoofing Threat Patterns
Spoofing risks include credential theft, token replay, session hijacking, fake service identities, and DNS or endpoint impersonation. Typical evidence includes weak authentication paths, missing token audience checks, and trust in unverified client headers. Prioritize mTLS, signed tokens, MFA, secure session management, and anti-replay controls.

## [STRIDE-010] Tampering Threat Patterns
Tampering risks include payload manipulation, request parameter abuse, unauthorized configuration changes, and data modification in storage or transit. Typical evidence includes missing integrity checks, permissive write paths, weak validation, and mutable audit records. Prioritize integrity controls, strict validation, write authorization, and immutable change history.

## [STRIDE-011] Repudiation Threat Patterns
Repudiation risks occur when actors can deny actions due to weak logging, missing attribution, or incomplete event context. Typical evidence includes missing actor identity, absent correlation ids, inconsistent timestamps, and lack of log protection. Prioritize end-to-end auditability, tamper-resistant logs, synchronized time sources, and clear retention policies.

## [STRIDE-012] Information Disclosure Threat Patterns
Information disclosure risks include overexposed APIs, excessive data in logs, insecure backups, weak encryption, and broad access to sensitive stores. Typical evidence includes plaintext secrets, unmasked PII, broad read permissions, and unrestricted exports. Prioritize data minimization, encryption, access segmentation, and secret lifecycle management.

## [STRIDE-013] Denial of Service Threat Patterns
Denial of service risks include resource exhaustion, expensive request paths, dependency saturation, and queue amplification. Typical evidence includes missing rate limits, unbounded retries, large payload acceptance, and no backpressure strategy. Prioritize rate control, resource quotas, timeout discipline, and resilience testing under stress.

## [STRIDE-014] Elevation of Privilege Threat Patterns
Elevation of privilege risks include broken authorization, excessive role assignments, unsafe default permissions, and privilege escalation across services. Typical evidence includes server-side trust of client claims, over-scoped tokens, and shared high-privilege credentials. Prioritize server-side authorization checks, least privilege, role separation, and periodic access review.

## [STRIDE-015] Threat Evidence and Traceability
For each identified threat, capture explicit evidence tied to architecture elements: target component, affected flows, trust boundary crossings, and observed weakness. Use stable reference ids and explain why each mitigation addresses the specific failure mode. This improves reproducibility, auditability, and downstream risk communication quality.

## [STRIDE-016] Severity and Prioritization
Prioritize threats by combining exploitability, blast radius, data sensitivity, business criticality, and detectability. Use consistent severity levels and define objective criteria for critical, high, medium, and low risk. Prioritize remediation for threats that cross trust boundaries, impact core business flows, or expose sensitive data at scale.

## [STRIDE-017] Mitigation Planning and Verification
Define mitigation plans with clear owners, target dates, rollback strategy, and verification criteria. Pair preventive controls with detective controls and run validation tests to confirm risk reduction. Track residual risk when full remediation is not immediate and document compensating controls with review cadence.

## [STRIDE-018] Cloud and Container Architecture Checks
In cloud and containerized systems, review identity federation, workload identity, network policies, secret mounts, and control-plane exposure. Validate image provenance, runtime hardening, and least-privileged service accounts. Ensure that east-west traffic, service mesh policies, and ingress rules enforce trust boundaries consistently.

## [STRIDE-019] Data and Key Management Controls
Apply key management policies for creation, rotation, revocation, and scoped usage of encryption keys. Separate key administration duties from application runtime duties and monitor key usage anomalies. Protect backup media, replication channels, and export pipelines with the same confidentiality and integrity standards as production data paths.

## [STRIDE-020] Logging and Monitoring Controls
Implement security monitoring with actionable alerts on authentication failures, authorization denials, anomalous access patterns, privilege changes, and integrity violations. Correlate events across services using trace ids and maintain baseline behavior models for anomaly detection. Ensure alert quality, response playbooks, and post-incident learning loops are continuously improved.
