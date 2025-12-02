# Changelog

## [1.1.2] - 2024-12-02

### Fixed

- **Critical Bug - Data Loss Prevention**: Fixed critical bug where disconnect operation happened before validating target record existence
  - Previously: Disconnected investor first, then checked if target exists → data loss if target missing
  - Now: Validates ALL conditions first (target exists, data valid), then performs disconnect/connect
  - Prevents "Investor not found in current record" error on subsequent operations
  - Users can now safely perform multiple status changes without page refresh
- **Improved Error Notifications**: Changed error notification type from "warning" to "danger"
  - Makes errors more visible and distinguishable from warnings
  - Helps users quickly identify critical issues that need attention

### Changed

- Reordered `handleStatusChange` logic flow:
  1. Get current record data
  2. Find investor to move
  3. **Validate target record exists** (NEW - moved before disconnect)
  4. **Validate target data is valid** (NEW)
  5. Disconnect from current record (only after validation passes)
  6. Connect to target record
  7. Refresh UI
- All error notifications now use `type: "danger"` instead of `type: "warning"`

### Technical Details

- Added validation check for target record data integrity before any mutations
- Prevents partial state updates that could leave data in inconsistent state
- Follows transaction-like pattern: validate everything, then commit changes

## [1.1.1] - 2024-12-02

### Fixed

- **State Refresh Issue**: Fixed "Investor not found in current record" error that occurred after status changes
  - Now refreshes local state immediately after disconnect/connect operations
  - Prevents stale data issues when performing multiple status changes without page reload
  - Reordered refresh logic: local field first, then dispatch event to other fields
- **User Experience**: Replaced browser `alert()` with Strapi's native notification system
  - Success notifications for successful status changes
  - Warning notifications for missing records or data issues
  - Danger notifications for errors
  - All notifications use `useNotification` hook from `@strapi/strapi/admin`

### Changed

- Improved notification messages to be more user-friendly
- Enhanced error handling with proper notification types

## [1.1.0] - 2024-12-02

### Added

- **Status Change Dropdown**: Added dropdown at the end of each item to change status
  - Dropdown shows current status and all available enum options
  - Options are dynamically fetched from target model schema (tries multiple endpoints)
  - Clicking a different status moves the item between records using connect/disconnect API
  - Dispatches custom events to refresh all filtered relation fields without page reload
- **New Configuration Option**: `statusField`
  - Optional field to enable status change feature
  - When configured, dropdown appears for each item
  - Must be an enum field in target model
  - Example: `"statusField": "participantStatus"`

### Changed

- Updated UI to include status dropdown alongside item label
- Improved item box layout to accommodate dropdown (space-between)
- Enhanced click handling to prevent navigation when interacting with dropdown
- Uses proper Strapi 5 connect/disconnect API format with both id and documentId
- Sends full payload matching UI admin format for reliable updates

### Technical Details

- Fetches enum values from schema via content-type-builder or content-manager endpoints
- Uses `SingleSelect` component from Strapi Design System
- Implements loading state during status update
- Uses connect/disconnect API with format: `{ id, documentId }`
- Dispatches `filtered-relation-updated` custom event for cross-field refresh
- All fields listen to event and refresh when same documentId
- Maintains backward compatibility with version 1.0.0

### Use Case

Perfect for scenarios like Meeting Participation Status where:

- Items are filtered by status (Pending, Accepted, Rejected, etc.)
- Users need to quickly change status without navigating to detail page
- Status change should automatically move items between lists

## [1.0.0] - 2024-11-XX

### Initial Release

- Display filtered relations based on field values
- Support for dynamic placeholders (`{{documentId}}`)
- Configurable filter fields (filterField1, filterField2)
- Auto-save functionality
- Click to navigate to related record
- Display count in field label
