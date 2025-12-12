# Quality Checklist: {Feature Name}

**Feature**: {Feature Name}
**Date**: YYYY-MM-DD
**Reviewed By**: {Name}

## Requirements Validation

### Specification Review
- [ ] All user stories have acceptance criteria
- [ ] Functional requirements are testable
- [ ] Non-functional requirements have metrics
- [ ] Technical requirements are feasible
- [ ] Success criteria are measurable
- [ ] Out of scope items are clearly defined

### Constitution Alignment
- [ ] Feature aligns with project vision
- [ ] Implementation follows technical standards
- [ ] Design decisions respect core principles
- [ ] Trade-offs are documented and justified

## Implementation Quality

### Code Quality
- [ ] Code follows project style guide
- [ ] Variable and function names are descriptive
- [ ] Complex logic has explanatory comments
- [ ] No commented-out code or TODOs left
- [ ] No console.log or debugging statements
- [ ] Error messages are user-friendly
- [ ] Code is DRY (no unnecessary duplication)

### Architecture
- [ ] Component boundaries are well-defined
- [ ] Dependencies are minimal and justified
- [ ] Abstractions are appropriate (not over-engineered)
- [ ] File organization follows project conventions
- [ ] Separation of concerns is maintained

### Performance
- [ ] No obvious performance bottlenecks
- [ ] Large lists are virtualized if needed
- [ ] Images are optimized and lazy-loaded
- [ ] Bundle size impact is acceptable
- [ ] Database queries are optimized
- [ ] API calls are batched where appropriate
- [ ] Unnecessary re-renders are avoided

## Testing

### Unit Tests
- [ ] All services have unit tests
- [ ] All utilities have unit tests
- [ ] All hooks have unit tests
- [ ] Components have rendering tests
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Test coverage is ≥ 80%

### Integration Tests
- [ ] API integrations are tested
- [ ] Database operations are tested
- [ ] State management is tested
- [ ] External service integrations are tested

### E2E Tests
- [ ] Happy path user flows are tested
- [ ] Error scenarios are tested
- [ ] Edge cases are tested
- [ ] Cross-browser compatibility verified

### Manual Testing
- [ ] Feature works as specified
- [ ] UI is responsive across screen sizes
- [ ] Keyboard navigation works
- [ ] Focus management is correct
- [ ] Loading states are appropriate
- [ ] Error states are user-friendly
- [ ] Success feedback is clear

## Security

### Authentication & Authorization
- [ ] Authentication is required where needed
- [ ] Authorization checks are in place
- [ ] User permissions are respected
- [ ] Sessions are handled securely

### Data Protection
- [ ] Sensitive data is encrypted
- [ ] PII is handled according to regulations
- [ ] API keys are not exposed
- [ ] Secrets are not committed to git

### Input Validation
- [ ] All user input is validated
- [ ] SQL injection is prevented
- [ ] XSS vulnerabilities are prevented
- [ ] CSRF protection is in place

### Security Best Practices
- [ ] Dependencies are up to date
- [ ] Known vulnerabilities are addressed
- [ ] Security headers are configured
- [ ] Rate limiting is implemented where needed

## Accessibility (a11y)

### WCAG 2.1 Level AA
- [ ] Color contrast meets 4.5:1 ratio
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Screen reader compatible
- [ ] ARIA labels are used appropriately
- [ ] Semantic HTML is used
- [ ] Form inputs have associated labels
- [ ] Error messages are accessible

### Additional Accessibility
- [ ] Images have alt text
- [ ] Videos have captions
- [ ] Skip links are provided
- [ ] Text can be resized to 200%
- [ ] Motion can be disabled

## User Experience

### Design Consistency
- [ ] Matches design system
- [ ] Visual hierarchy is clear
- [ ] Spacing is consistent
- [ ] Typography is consistent
- [ ] Icons are appropriate

### Usability
- [ ] User flows are intuitive
- [ ] Error messages are helpful
- [ ] Success feedback is clear
- [ ] Loading states are informative
- [ ] Empty states are handled
- [ ] Feature is discoverable

### Mobile Experience
- [ ] Touch targets are ≥ 44x44px
- [ ] Gestures work as expected
- [ ] Text is readable without zooming
- [ ] Forms are easy to fill
- [ ] Navigation is mobile-friendly

## Documentation

### Code Documentation
- [ ] Complex functions have JSDoc
- [ ] Type definitions are complete
- [ ] README is updated
- [ ] API contracts are documented

### User Documentation
- [ ] User guide is written
- [ ] Help text is provided in UI
- [ ] Onboarding is smooth
- [ ] FAQs address common questions

### Developer Documentation
- [ ] Architecture is documented
- [ ] Setup instructions are clear
- [ ] Contributing guide is updated
- [ ] Changelog is updated

## Deployment

### Pre-Deployment
- [ ] Feature flag is configured
- [ ] Database migrations are tested
- [ ] Rollback plan is documented
- [ ] Monitoring is configured
- [ ] Alerts are set up

### Deployment Verification
- [ ] Deployed to staging successfully
- [ ] Smoke tests passed on staging
- [ ] Performance metrics are acceptable
- [ ] Error rates are normal
- [ ] Logs show no unexpected errors

### Post-Deployment
- [ ] Feature is working in production
- [ ] Monitoring shows healthy metrics
- [ ] No unexpected errors in logs
- [ ] User feedback is being collected
- [ ] Success metrics are being tracked

## Performance Metrics

### Load Time
- [ ] First contentful paint < 1.8s
- [ ] Time to interactive < 3.8s
- [ ] Total page load < 5s

### Runtime Performance
- [ ] No jank or frame drops
- [ ] Interactions feel instant
- [ ] Animations are smooth (60fps)

### Resource Usage
- [ ] Bundle size increase is acceptable
- [ ] Memory usage is reasonable
- [ ] CPU usage is efficient
- [ ] Network requests are optimized

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Final Checks

### Code Review
- [ ] Code review completed
- [ ] All feedback addressed
- [ ] Approved by tech lead
- [ ] No merge conflicts

### Project Management
- [ ] Spec is marked complete
- [ ] Plan is updated
- [ ] Tasks are closed
- [ ] Jira/GitHub issues are updated

### Communication
- [ ] Team notified of deployment
- [ ] Stakeholders informed
- [ ] Documentation shared
- [ ] Demo scheduled if needed

---

## Sign-off

### Reviewers

**Developer**: ___________________ Date: _______

**Tech Lead**: ___________________ Date: _______

**Product**: ___________________ Date: _______

**QA**: ___________________ Date: _______

---

## Notes

<!-- Any additional notes, concerns, or items to address post-launch -->
