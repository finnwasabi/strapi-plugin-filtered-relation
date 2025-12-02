# Publishing Guide

## Prerequisites

1. Make sure you're logged in to npm:

```bash
npm login
```

2. Verify your npm account has access to publish `@tunghtml` scoped packages

## Steps to Publish

### 1. Test Locally First

The plugin is already configured as a local plugin in `backend/config/plugins.js`:

```javascript
"filtered-relation": {
  enabled: true,
  resolve: "./src/plugins/filtered-relation",
}
```

Test thoroughly in your local Strapi instance before publishing.

### 2. Update Version

Update version in `package.json`:

- Patch: 1.1.0 -> 1.1.1 (bug fixes)
- Minor: 1.1.0 -> 1.2.0 (new features, backward compatible)
- Major: 1.1.0 -> 2.0.0 (breaking changes)

### 3. Publish to NPM

From the plugin directory:

```bash
cd backend/src/plugins/filtered-relation
npm publish --access public
```

### 4. Update Project to Use NPM Package

After publishing, you can switch back to using the npm package:

1. Update `backend/package.json`:

```json
{
  "dependencies": {
    "@tunghtml/strapi-plugin-filtered-relation": "^1.1.0"
  }
}
```

2. Update `backend/config/plugins.js`:

```javascript
"filtered-relation": {
  enabled: true,
  // Remove the resolve line to use npm package
}
```

3. Install the package:

```bash
cd backend
yarn install
```

## Current Version

Version 1.1.0 includes:

- Status change dropdown feature
- Dynamic status options from schema
- Auto-refresh on status change
- Backward compatible with 1.0.0

## Testing Checklist

Before publishing, verify:

- [ ] Plugin loads without errors
- [ ] Filtered relations display correctly
- [ ] Status dropdown shows correct options
- [ ] Status change updates the record
- [ ] Lists refresh automatically after status change
- [ ] Works with different content types (reusable)
- [ ] No console errors
