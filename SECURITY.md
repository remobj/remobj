# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 0.1.x   | :white_check_mark: | Current |
| < 0.1   | :x:                | EOL |

## Reporting a Vulnerability

We take the security of RemObj seriously. If you have discovered a security vulnerability in RemObj, we appreciate your help in disclosing it to us in a responsible manner.

**DO NOT report security vulnerabilities through public GitHub issues.**

### Reporting Process

1. Email your findings to security@remobj.com or [create a security advisory](https://github.com/remobj/remobj/security/advisories/new)
2. Provide detailed information about the vulnerability:
   - Type of issue (e.g., prototype pollution, XSS, memory exhaustion)
   - Full paths of source file(s) related to the issue
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact assessment

### Response Timeline

- **Initial Response**: Within 48 hours
- **Detailed Assessment**: Within 96 hours
- **Fix Development**: Based on severity (Critical: 7 days, High: 14 days, Medium: 30 days)
- **Public Disclosure**: Coordinated with reporter after fix is available

## Security Hall of Fame

We thank the following researchers for responsible disclosure of security vulnerabilities:

<!-- Names will be added here as vulnerabilities are reported and fixed -->

## Security Measures

This project implements several security measures:

### Automated Security Scanning
- **CodeQL Analysis**: Static application security testing (SAST) for JavaScript/TypeScript
- **Trivy Scanner**: Vulnerability detection in dependencies and code
- **npm audit**: Dependency vulnerability checking in CI/CD
- **Dependabot**: Automated dependency updates with security patches
- **OSSF Scorecard**: Security best practices evaluation

### Code Security Features
- Input validation for RPC messages
- Property access restrictions (FORBIDDEN_PROPERTIES)
- Timeout mechanisms to prevent resource exhaustion
- Memory management with WeakBiMap cleanup strategies

## Important Note on Remote Procedure Calls

**RemObj is designed to enable controlled remote procedure calls (RPC) between JavaScript contexts.** This is the library's core functionality and is not a vulnerability when used as intended. The library provides secure mechanisms for:

- Exposing specific objects/functions across boundaries (workers, iframes, etc.)
- Controlled method invocation through proxies
- Type-safe communication channels
- Sandbox-respecting message passing

### What IS a Security Issue:
- **Uncontrolled RCE**: Ability to execute arbitrary code outside the defined RPC interface
- **Bypass of sandbox boundaries**: Breaking browser security contexts
- **Unauthorized access**: Accessing objects/methods not explicitly exposed via `provide()`

### What IS NOT a Security Issue:
- **Intended RPC functionality**: Calling exposed methods through the proxy system
- **Explicit API exposure**: Functions/objects intentionally shared via `provide()`
- **Cross-context communication**: Designed message passing between workers/iframes

## What We Consider a Vulnerability

- **Uncontrolled** remote code execution (beyond intended RPC)
- Prototype pollution attacks
- Cross-site scripting (XSS) in client code
- Information disclosure of sensitive data
- Denial of service (DoS) attacks
- Memory exhaustion vulnerabilities
- Insecure deserialization
- Path traversal attacks
- Sandbox escapes or security boundary violations

## What We Don't Consider a Vulnerability

- Issues requiring physical access to the device
- Social engineering attacks
- Issues in development dependencies (not affecting production)
- Theoretical attacks without practical exploit
- Performance issues without security impact

## Known Security Considerations

Based on our security analysis, these areas require attention:

1. **Input Validation**: RPC messages need size limits to prevent memory exhaustion
2. **Origin Validation**: Consumers must implement origin checks for PostMessage endpoints
3. **Property Access**: Prototype chain traversal needs additional safeguards
4. **Timeout Management**: 5-minute provider timeout is intentional for long operations
5. **Circular References**: Proxy objects need careful handling to prevent infinite loops

## Security Best Practices

When using RemObj library:

### General Security Practices

1. **Resource Limits**: Set appropriate timeouts and memory limits
2. **Keep Updated**: Regularly update to latest secure versions
3. **Type Safety**: Use TypeScript for compile-time security checks
4. **Monitoring**: Monitor memory usage and performance in production
5. **Audit Exposed APIs**: Regularly review what functions/objects are exposed
6. **Sandbox Boundaries**: Never attempt to bypass browser security contexts
7. **Error Handling**: Don't expose sensitive information in error messages

## Acknowledgments

We appreciate the security research community and encourage responsible disclosure of security vulnerabilities.