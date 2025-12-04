# Component Reuse Opportunities Rules

Check for missed opportunities to reuse existing components instead of creating custom implementations.

## Rule 1: Search Common Components First

**What to check**: Before flagging custom implementations, verify that `components/common/` doesn't already have a solution.

**How to verify**:
```bash
# List all common components
fd . components/common/ -t f -e tsx -e ts

# Search for specific component types
rg "export.*function|export.*const" components/common/ -t tsx
```

**What to flag**: Custom implementations that duplicate existing common component functionality.

---

## Rule 2: KolThumbnailGroup Usage

**What to check**: Manual KOL thumbnail lists that could use `KolThumbnailGroup`.

**Component location**: `@/components/common/kol-thumbnail-group`

**Features provided**:
- Blur support for hidden KOLs
- Tooltips on hover
- Click handlers
- Proper spacing and layout
- Responsive design

**Pattern to detect**:
```tsx
// ❌ Custom implementation
{kols.map((kol) => (
  <div key={kol.id} className="kol-wrapper">
    <KolThumbnail kol={kol} />
  </div>
))}
```

**Should be**:
```tsx
// ✅ Use existing component
<KolThumbnailGroup kols={kols} />
```

**What to flag**: Any manual mapping of KOL thumbnails with custom wrappers.

---

## Rule 3: Duplicate Implementations

**What to check**: Code that duplicates existing common component functionality.

**Common duplications**:
- Custom loading spinners → Use `<LoadingSpinner />` from `@/components/common/loading`
- Custom error messages → Use `<ErrorMessage />` from `@/components/common/error`
- Custom empty states → Use `<EmptyState />` from `@/components/common/empty-state`
- Custom tooltips → Use Ant Design's `Tooltip` component
- Custom modals → Use Ant Design's `Modal` component

**How to verify**:
1. Identify the functionality being implemented
2. Search common components for similar functionality
3. Check Ant Design components for built-in solutions

**What to flag**: Any custom implementation that has a common component equivalent.

---

## Rule 4: Component Feature Comparison

**What to check**: Whether custom implementation provides features that the common component already handles.

**Features to compare**:
- Accessibility (ARIA labels, keyboard navigation)
- Responsive design
- Error states
- Loading states
- Edge case handling
- TypeScript types

**What to flag**: Custom implementations that are less robust than existing common components.

---

## Comment Format

When flagging missed reuse opportunities:

```markdown
**Line X-Y:**
```tsx
{/* custom implementation code */}
```
> **💡 Missed Component Reuse**: Consider using `<ComponentName>` from `@/components/common/path`. It provides [list key features]. [Optional: migration suggestion].
```

## Examples

### Example 1: KolThumbnailGroup

```markdown
**Line 45-48:**
```tsx
{kols.map((kol) => (
  <div key={kol.id}>
    <KolThumbnail kol={kol} />
  </div>
))}
```
> **💡 Missed Component Reuse**: Consider using `KolThumbnailGroup` from `@/components/common/kol-thumbnail-group` instead of manual mapping. It provides blur support, tooltips, click handlers, and proper spacing.
```

### Example 2: Loading Spinner

```markdown
**Line 120-125:**
```tsx
<div className="flex items-center justify-center">
  <Spin size="large" />
  <span>Loading data...</span>
</div>
```
> **💡 Missed Component Reuse**: Use `<LoadingSpinner message="Loading data..." />` from `@/components/common/loading` instead of custom implementation. It provides consistent styling and accessibility.
```

### Example 3: Empty State

```markdown
**Line 78-85:**
```tsx
{data.length === 0 && (
  <div className="text-center p-8">
    <EmptyIcon />
    <p>No data available</p>
  </div>
)}
```
> **💡 Missed Component Reuse**: Consider using `<EmptyState title="No data available" />` from `@/components/common/empty-state`. It handles icon, title, description, and action buttons consistently.
```

---

## When NOT to Flag

Don't flag custom implementations if:
1. The common component doesn't support required functionality
2. The use case is too specific for a common component
3. The custom implementation is simpler and more maintainable
4. Performance requirements necessitate a custom solution
5. The common component is deprecated or marked for refactoring
