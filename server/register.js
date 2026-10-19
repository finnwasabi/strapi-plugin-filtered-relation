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

const FILTERED_RELATION_UID = "plugin::filtered-relation.filtered-relation";

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

// Static filters only: values bound to the current document cannot be resolved here
const buildStaticFilters = ({
  filterField1,
  filterValue1,
  filterField2,
  filterValue2,
}) => {
  const filterParams = {};
  if (filterField1 && filterValue1 && filterValue1 !== "{{documentId}}") {
    filterParams[filterField1] = filterValue1;
  }
  if (filterField2 && filterValue2 && filterValue2 !== "{{documentId}}") {
    filterParams[filterField2] = filterValue2;
  }
  return filterParams;
};

// Schemas are fixed once Strapi is running, so the filtered-relation fields are collected once
let filteredRelationFields = null;

function getFilteredRelationFields(strapi) {
  if (filteredRelationFields) return filteredRelationFields;

  filteredRelationFields = [];
  for (const uid of Object.keys(strapi.contentTypes)) {
    if (!uid.startsWith("api::")) continue;

    const schema = strapi.getModel(uid);
    for (const [fieldName, fieldConfig] of Object.entries(
      schema?.attributes || {},
    )) {
      if (fieldConfig.customField !== FILTERED_RELATION_UID) continue;

      const options = fieldConfig.options || {};
      filteredRelationFields.push({
        uid,
        schema,
        fieldName,
        targetModel: parseCollectionName(options.targetModel),
        filterParams: buildStaticFilters(options),
        displayField: options.displayField,
      });
    }
  }
  return filteredRelationFields;
}

async function updateRelatedFilteredFields(event, strapi) {
  const { model } = event;
  if (!model) return;

  try {
    const fields = getFilteredRelationFields(strapi).filter(
      (field) => field.targetModel === model.uid,
    );

    for (const field of fields) {
      // Find all related entities that need updating
      const relatedEntities = await findRelatedEntities(
        event,
        field.schema,
        field.uid,
      );

      for (const entityId of relatedEntities) {
        await updateFilteredField(
          strapi,
          field.uid,
          entityId,
          field.fieldName,
          field.targetModel,
          field.filterParams,
          field.displayField,
        );
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
