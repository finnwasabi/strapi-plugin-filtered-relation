# Strapi Plugin Filtered Relation

A Strapi 5 custom field plugin for displaying filtered relations with dynamic placeholder support and status change capability.

## Features

- Display filtered relations based on field values
- Support dynamic placeholders (e.g., `{{documentId}}`)
- Change status directly from the relation list via dropdown
- Auto-refresh when status changes
- Fully configurable and reusable

## Installation

### Local Development

This plugin is currently being used as a local plugin. It's located in `backend/src/plugins/filtered-relation`.

### NPM Package (for publishing)

```bash
npm install @tunghtml/strapi-plugin-filtered-relation
# or
yarn add @tunghtml/strapi-plugin-filtered-relation
```

## Configuration

Add to `config/plugins.js`:

```javascript
module.exports = {
  "filtered-relation": {
    enabled: true,
    resolve: "./src/plugins/filtered-relation", // for local plugin
  },
};
```

## Usage

### Schema Configuration

Add the custom field to your content type schema:

```json
{
  "pendingInvestors": {
    "type": "customField",
    "customField": "plugin::filtered-relation.filtered-relation",
    "options": {
      "displayField": "investors",
      "targetModel": "Meeting Participation Status",
      "filterField1": "participantStatus",
      "filterValue1": "Pending",
      "filterField2": "meeting.documentId",
      "filterValue2": "{{documentId}}",
      "statusField": "participantStatus"
    }
  }
}
```

### Options

| Option         | Type   | Required | Description                                                                                                                                                      |
| -------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `displayField` | string | Yes      | The relation field name to display from target model (e.g., "investors")                                                                                         |
| `targetModel`  | string | Yes      | Target collection display name (e.g., "Meeting Participation Status"). Will auto-convert to API ID format.                                                       |
| `filterField1` | string | Yes      | First filter field name (e.g., "participantStatus")                                                                                                              |
| `filterValue1` | string | Yes      | First filter value (e.g., "Pending"). Supports `{{documentId}}` placeholder for current entity.                                                                  |
| `filterField2` | string | No       | Second filter field name (e.g., "meeting.documentId") for additional filtering                                                                                   |
| `filterValue2` | string | No       | Second filter value. Supports `{{documentId}}` placeholder.                                                                                                      |
| `statusField`  | string | No       | Field name for status dropdown (e.g., "participantStatus"). When configured, enables status change feature with dropdown. Must be an enum field in target model. |

### Status Change Feature

When `statusField` is configured, a dropdown appears at the end of each item allowing quick status changes.

**Requirements:**

- `statusField` must be an enum field in the target model
- Target model must have records for each status value
- All records must be linked to the same parent entity (via filterField2)

**How it works:**

1. Dropdown shows current status and all available enum options (fetched from schema)
2. User selects a new status
3. Plugin automatically:
   - Removes the item from current status record (disconnect)
   - Adds the item to target status record (connect)
   - Refreshes all filtered relation fields on the page
4. No page reload needed - all lists update automatically via custom events

## Example Use Case

For a Meeting with multiple investor status lists (Pending, Accepted, Rejected, etc.):

1. Each list shows investors filtered by their participation status
2. Click the dropdown on any investor to change their status
3. The investor automatically moves to the appropriate list
4. All lists refresh to reflect the change

## Version

Current version: 1.1.0

## License

MIT
