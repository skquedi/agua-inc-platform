## Summary

<!-- Describe what this PR does and why. Link to the relevant issue or ClickUp task. -->

Closes #<!-- issue number -->
ClickUp task: <!-- CU-xxxxxxxx or N/A -->

---

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Refactor / cleanup (no functional change)
- [ ] Documentation / config update

---

## Changes made

<!-- Bullet-point summary of the key changes. Be specific enough that a reviewer knows where to look. -->

-
-

---

## Testing

- [ ] `npm test` passes locally
- [ ] New tests added for new functionality
- [ ] Existing tests updated where needed
- [ ] Manually tested against a real ClickUp workspace or GitHub webhook payload (if applicable)

**Describe your test plan:**

<!-- e.g., "Sent a test push webhook from the agua-inc/water-treatment-api repo and verified the ClickUp task comment was created." -->

---

## Checklist

- [ ] Code follows the conventions in [CLAUDE.md](../CLAUDE.md)
- [ ] No secrets, API tokens, or PII in the diff
- [ ] No `console.log` — using the structured `logger` from `src/utils/logger.ts`
- [ ] All new environment variables are documented in `.env.example`
- [ ] Breaking API changes are versioned (new route under `/api/v2/...`) or discussed in the PR
- [ ] PR title follows Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)

---

## Screenshots / logs (if applicable)

<!-- Paste relevant log output or screenshots for UI/webhook changes. -->

---

*Generated with [Claude Code](https://claude.ai/code)*
