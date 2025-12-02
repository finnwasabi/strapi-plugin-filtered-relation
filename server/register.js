"use strict";

module.exports = ({ strapi }) => {
  strapi.customFields.register({
    name: "filtered-relation",
    plugin: "filtered-relation",
    type: "json",
  });

  // Register global lifecycle hooks for all content types
  strapi.db.lifecycles.subscribe({
    async afterCreate(event) {
      await updateRelatedFilteredFields(event, strapi);
    },

    async afterUpdate(event) {
      await updateRelatedFilteredFields(event, strapi);
    },

    async afterDelete(event) {
      await updateRelatedFilteredFields(event, strapi);
    },
  });
};

async function updateRelatedFilteredFields(event, strapi) {
  const { model } = event;
  if (!model) return;

  const currentModelUid = model.uid;

  try {
    // Get all content types to find which ones have filtered-relation fields
    const contentTypes = strapi.contentTypes;

    for (const [uid, contentType] of Object.entries(contentTypes)) {
      // Skip non-API content types
      if (!uid.startsWith("api::")) continue;

      const schema = strapi.getModel(uid);
      if (!schema?.attributes) continue;

      // Find filtered-relation fields that target the current model
      for (const [fieldName, fieldConfig] of Object.entries(
        schema.attributes,
      )) {
        if (
          fieldConfig.customField ===
          "plugin::filtered-relation.filtered-relation"
        ) {
          const {
            targetModel: targetModelInput,
            filterField1,
            filterValue1,
            filterField2,
            filterValue2,
            displayField,
          } = fieldConfig.options || {};

          // Parse collection name to API ID
          const parseCollectionName = (name) => {
            if (!name) return null;
            if (name.startsWith("api::")) return name;
            const slug = name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");
            return `api::${slug}.${slug}`;
          };

          const targetModel = parseCollectionName(targetModelInput);

          // Build filter params
          const filterParams = {};
          if (
            filterField1 &&
            filterValue1 &&
            filterValue1 !== "{{documentId}}"
          ) {
            filterParams[filterField1] = filterValue1;
          }
          if (
            filterField2 &&
            filterValue2 &&
            filterValue2 !== "{{documentId}}"
          ) {
            filterParams[filterField2] = filterValue2;
          }

          // Check if this field targets the model that was just modified
          if (targetModel === currentModelUid) {
            // Find all related entities that need updating
            const relatedEntities = await findRelatedEntities(
              event,
              schema,
              uid,
            );

            // Update each related entity
            for (const entityId of relatedEntities) {
              await updateFilteredField(
                strapi,
                uid,
                entityId,
                fieldName,
                targetModel,
                filterParams,
                displayField,
              );
            }
          }
        }
      }
    }
  } catch (error) {
    strapi.log.error("Error updating related filtered fields:", error);
  }
}

async function findRelatedEntities(event, schema, contentTypeUid) {
  const { result, params } = event;
  const entityIds = new Set();

  // Look for relation fields in the schema that point to the content type
  for (const [fieldName, fieldConfig] of Object.entries(schema.attributes)) {
    if (
      fieldConfig.type === "relation" &&
      fieldConfig.target === contentTypeUid
    ) {
      // Get the related entity ID from result or params
      const relatedId = result?.[fieldName]?.id || params?.data?.[fieldName];
      if (relatedId) {
        entityIds.add(relatedId);
      }
    }
  }

  return Array.from(entityIds);
}

async function updateFilteredField(
  strapi,
  contentTypeUid,
  entityId,
  fieldName,
  targetModel,
  filterParams,
  displayField,
) {
  try {
    // Fetch filtered data
    const filteredItems = await strapi.entityService.findMany(targetModel, {
      filters: filterParams,
      populate: [displayField],
    });

    // Extract documentIds from the display field
    const documentIds = [];
    filteredItems.forEach((item) => {
      if (displayField && item[displayField]) {
        if (Array.isArray(item[displayField])) {
          item[displayField].forEach((rel) => {
            const docId = rel?.documentId || rel?.id;
            if (docId) documentIds.push(docId);
          });
        } else if (item[displayField]?.documentId || item[displayField]?.id) {
          documentIds.push(
            item[displayField].documentId || item[displayField].id,
          );
        }
      }
    });

    // Update the entity
    await strapi.entityService.update(contentTypeUid, entityId, {
      data: {
        [fieldName]: JSON.stringify(documentIds),
      },
    });
  } catch (error) {
    strapi.log.error(
      `Error updating filtered field ${fieldName} for ${contentTypeUid}:${entityId}`,
      error,
    );
  }
}
