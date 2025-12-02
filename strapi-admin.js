import React from "react";
import { Filter } from "@strapi/icons";

const FilteredRelationIcon = () =>
  React.createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "32px",
        height: "24px",
        borderRadius: "4px",
        border: "1px solid #ffb3d9",
        background: "#ffe6f5",
        fontSize: "14px",
        fontWeight: "600",
        color: "#d6006e",
      },
    },
    React.createElement(Filter, { width: "12px", height: "12px" }),
  );

export default {
  register(app) {
    // Register custom field
    app.customFields.register({
      name: "filtered-relation",
      pluginId: "filtered-relation",
      type: "json",
      icon: FilteredRelationIcon,
      intlLabel: {
        id: "filtered-relation.label",
        defaultMessage: "Filtered Relation",
      },
      intlDescription: {
        id: "filtered-relation.description",
        defaultMessage:
          "Relation field with filtering by field value and status change",
      },
      components: {
        Input: async () => {
          const component = await import(
            "./admin/src/components/FilteredRelationInput"
          );
          return component;
        },
      },
      options: {
        base: [
          {
            intlLabel: {
              id: "filtered-relation.displayField.label",
              defaultMessage: "Display Field",
            },
            name: "options.displayField",
            type: "text",
            description: {
              id: "filtered-relation.displayField.description",
              defaultMessage:
                "Relation field name to display (e.g., 'investors')",
            },
            placeholder: {
              id: "filtered-relation.displayField.placeholder",
              defaultMessage: "investors",
            },
          },
        ],
        advanced: [
          {
            sectionTitle: {
              id: "filtered-relation.section.target",
              defaultMessage: "Target Collection",
            },
            items: [
              {
                name: "options.targetModel",
                type: "text",
                intlLabel: {
                  id: "filtered-relation.targetModel.label",
                  defaultMessage: "Collection Name",
                },
                description: {
                  id: "filtered-relation.targetModel.description",
                  defaultMessage:
                    "Collection display name (e.g., 'Meeting Participation Status'). Will auto-convert to API ID.",
                },
                placeholder: {
                  id: "filtered-relation.targetModel.placeholder",
                  defaultMessage: "Meeting Participation Status",
                },
              },
            ],
          },
          {
            sectionTitle: {
              id: "filtered-relation.section.filters",
              defaultMessage: "Filter Conditions",
            },
            items: [
              {
                name: "options.filterField1",
                type: "text",
                intlLabel: {
                  id: "filtered-relation.filterField1.label",
                  defaultMessage: "Filter Field 1",
                },
                placeholder: {
                  id: "filtered-relation.filterField1.placeholder",
                  defaultMessage: "participantStatus",
                },
              },
              {
                name: "options.filterValue1",
                type: "text",
                intlLabel: {
                  id: "filtered-relation.filterValue1.label",
                  defaultMessage: "Filter Value 1",
                },
                placeholder: {
                  id: "filtered-relation.filterValue1.placeholder",
                  defaultMessage: "Rejected",
                },
              },
              {
                name: "options.filterField2",
                type: "text",
                intlLabel: {
                  id: "filtered-relation.filterField2.label",
                  defaultMessage: "Filter Field 2 (Optional)",
                },
                placeholder: {
                  id: "filtered-relation.filterField2.placeholder",
                  defaultMessage: "event",
                },
              },
              {
                name: "options.filterValue2",
                type: "text",
                intlLabel: {
                  id: "filtered-relation.filterValue2.label",
                  defaultMessage: "Filter Value 2 (Optional)",
                },
                description: {
                  id: "filtered-relation.filterValue2.description",
                  defaultMessage:
                    "Use {{documentId}} to filter by current entity",
                },
                placeholder: {
                  id: "filtered-relation.filterValue2.placeholder",
                  defaultMessage: "{{documentId}}",
                },
              },
            ],
          },
          {
            sectionTitle: {
              id: "filtered-relation.section.statusChange",
              defaultMessage: "Status Change Configuration",
            },
            items: [
              {
                name: "options.statusField",
                type: "text",
                intlLabel: {
                  id: "filtered-relation.statusField.label",
                  defaultMessage: "Status Field Name",
                },
                description: {
                  id: "filtered-relation.statusField.description",
                  defaultMessage:
                    "Field name in target model that contains status (e.g., 'participantStatus'). Leave empty to disable status change.",
                },
                placeholder: {
                  id: "filtered-relation.statusField.placeholder",
                  defaultMessage: "participantStatus",
                },
              },
            ],
          },
        ],
      },
    });
  },
};
