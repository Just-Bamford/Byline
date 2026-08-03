# Contributing to Byline

Thank you for your interest in contributing to Byline! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please treat everyone with respect and maintain a positive, collaborative tone in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+ (for smart contract development)
- Docker & Docker Compose (optional, for containerized development)
- Git

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/byline.git
   cd byline
   ```

2. **Install dependencies**

   ```bash
   # Backend
   cd publisher-backend
   npm install
   cd ..

   # Frontend
   cd reader-app
   npm install
   cd ..

   # SDK
   cd publisher-sdk
   npm install
   cd ..
   ```

3. **Start development servers**

   Using Docker Compose (recommended):

   ```bash
   docker compose up
   ```

   Or manually:

   ```bash
   # Terminal 1: Database (requires PostgreSQL running)
   # Terminal 2: Backend
   cd publisher-backend
   npm run dev

   # Terminal 3: Frontend
   cd reader-app
   npm run dev
   ```

4. **Run tests**

   ```bash
   # Backend tests
   cd publisher-backend
   npm run test:run

   # Frontend linting
   cd reader-app
   npm run lint

   # Contract tests
   cd contract
   cargo test
   ```

## Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Follow the code standards outlined below
   - Keep commits atomic and descriptive
   - Update tests for new functionality
   - Update documentation as needed

3. **Test locally**

   ```bash
   npm run test:run      # Run tests
   npm run build         # Ensure compilation succeeds
   npm run lint          # Check code style
   ```

4. **Push and create a PR**

   ```bash
   git push origin feature/your-feature-name
   ```

   Then open a Pull Request on GitHub.

5. **Address feedback**
   - Respond to code review comments
   - Make requested changes in new commits
   - Re-run tests to ensure nothing broke

## Code Standards

### TypeScript / JavaScript

- **Strict mode enabled** - All TypeScript files compile with `strict: true`
- **2-space indentation** - Consistent throughout the project
- **ESLint** - Run `npm run lint` before committing
- **JSDoc comments** - Document public APIs with comments
- **Async/await** - Prefer over `.then()` chains
- **Error handling** - Always include try-catch for async operations

Example:

```typescript
/**
 * Verify an access token
 * @param token The access token to verify
 * @param contractId The Soroban contract ID
 * @returns Promise<boolean> True if token is valid
 */
export async function verifyToken(
  token: AccessToken,
  contractId: string,
): Promise<boolean> {
  try {
    // Implementation
    return true;
  } catch (error) {
    logger.error("Token verification failed", error);
    return false;
  }
}
```

### Rust (Smart Contract)

- **idiomatic Rust** - Follow Rust API guidelines
- **No unsafe code** - Unless absolutely necessary (with justification)
- **Error handling** - Use `Result` types appropriately
- **Testing** - Write tests for all public functions

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

**Types**: feat, fix, docs, style, refactor, test, chore, ci

**Examples**:

```
feat(backend): add PostgreSQL persistence for analytics

- Create database schema with articles and read_events tables
- Implement transaction-based analytics recording
- Add connection pooling for performance

Closes #42
```

```
fix(contract): prevent overflow in price calculations

Ensures safe arithmetic operations to prevent integer overflow
attacks on the Soroban contract.
```

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally (`npm run test:run`)
- [ ] Code compiles without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Commit messages follow conventional commits
- [ ] Documentation updated for public API changes
- [ ] No debug console.log statements left in code

### PR Description Template

```markdown
## Description

Brief description of what this PR does

## Type

- [ ] Feature
- [ ] Bug Fix
- [ ] Documentation
- [ ] Performance
- [ ] Security

## Testing

Describe how you tested this change

## Checklist

- [ ] Tests pass locally
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or BREAKING CHANGE: documented)
```

## Project Structure

```
byline/
├── contract/              # Soroban smart contract (Rust)
├── publisher-backend/     # Express.js API server (TypeScript)
├── publisher-dashboard/   # Publisher UI (React)
├── publisher-sdk/         # NPM package for publisher integration
├── reader-app/            # Reader portal (React)
├── docs/                  # Project documentation
├── .github/               # GitHub Actions workflows
└── docker-compose.yml     # Local development setup
```

## Testing Requirements

### Backend

- Unit tests for all services
- Integration tests for APIs
- 80%+ code coverage target

Run tests:

```bash
cd publisher-backend
npm run test:run
```

### Frontend

- Component tests (optional for MVP)
- Visual regression tests (optional for MVP)

### Contract

- Unit tests for all contract functions
- Edge case tests for security

Run tests:

```bash
cd contract
cargo test
```

## Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for system changes
- Add/update API documentation for endpoint changes
- Include JSDoc comments for public functions
- Add comments for complex logic

## Security

### Reporting Vulnerabilities

**Do not** open a public GitHub issue for security vulnerabilities.

Please email security@byline.local with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

### Security Best Practices

When contributing:

- Never commit secrets, private keys, or credentials
- Validate all user inputs
- Use parameterized queries for database access
- Follow principle of least privilege
- Review code for common vulnerabilities (injection, overflow, etc.)

## Release Process

Releases follow semantic versioning:

1. Update version in package.json files
2. Update CHANGELOG.md
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions automatically publishes releases

## Getting Help

- **Issues**: Check existing GitHub issues before creating new ones
- **Discussions**: Use GitHub Discussions for feature requests and questions
- **Discord**: Join our community Discord (link in README)
- **Email**: community@byline.local

## Recognition

Contributors will be recognized in:

- CHANGELOG.md
- GitHub contributors page
- Monthly contributor highlights

Thank you for contributing to Byline and helping make micropayments for journalism a reality!

---

**Last Updated**: 2024
**License**: MIT
