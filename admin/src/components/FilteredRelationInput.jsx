import React from "react";
import { useIntl } from "react-intl";
import {
  Field,
  Flex,
  Box,
  Typography,
  SingleSelect,
  SingleSelectOption,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { useLocation, useNavigate } from "react-router-dom";

const FilteredRelationInput = (props) => {
  const { formatMessage } = useIntl();
  const { get, put } = useFetchClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [statusOptions, setStatusOptions] = React.useState([]);
  const [updatingStatus, setUpdatingStatus] = React.useState({});

  if (!props) {
    return null;
  }

  const { attribute, name, error, value } = props;

  // Extract documentId from URL path
  const getDocumentIdFromUrl = () => {
    const pathParts = location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart !== "create" ? lastPart : null;
  };

  const documentId = props.documentId || props.id || getDocumentIdFromUrl();

  const {
    targetModel: targetModelInput,
    filterField1,
    filterValue1,
    filterField2,
    filterValue2,
    displayField = "id",
    statusField,
  } = attribute?.options || {};

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

  // Parse displayField to get relation model
  const getRelationModel = (fieldName) => {
    if (!fieldName) return null;
    const singular = fieldName.endsWith("s")
      ? fieldName.slice(0, -1)
      : fieldName;
    const slug = singular.toLowerCase().replace(/[^a-z0-9-]/g, "");
    return `api::${slug}.${slug}`;
  };

  const relationModel = getRelationModel(displayField);

  // Build filter params with dynamic values
  const filterParams = {};
  if (filterField1 && filterValue1) {
    const value1 =
      filterValue1 === "{{documentId}}" ? documentId : filterValue1;
    filterParams[filterField1] = value1;
  }
  if (filterField2 && filterValue2) {
    const value2 =
      filterValue2 === "{{documentId}}" ? documentId : filterValue2;
    filterParams[filterField2] = value2;
  }

  const contentType = props.contentType || props.model;

  const saveFieldValue = async (newValue) => {
    if (!documentId || !contentType) return;

    try {
      await put(
        `/content-manager/collection-types/${contentType}/${documentId}`,
        {
          data: {
            [name]: newValue,
          },
        },
      );
    } catch (err) {
      console.error("Error auto-saving filtered relation:", err);
    }
  };

  // Fetch status options from target model schema
  React.useEffect(() => {
    const fetchStatusOptions = async () => {
      if (!targetModel || !statusField) {
        return;
      }

      try {
        let enumValues = null;

        // Try 1: Get from content-type-builder (most reliable for schema)
        try {
          const builderResponse = await get(
            `/content-type-builder/content-types/${targetModel}`,
          );
          const builderSchema = builderResponse?.data?.data?.schema;
          enumValues = builderSchema?.attributes?.[statusField]?.enum;
        } catch (e) {
          // Endpoint might not be accessible, try next
        }

        if (enumValues && Array.isArray(enumValues)) {
          setStatusOptions(enumValues);
        }
      } catch (err) {
        console.error("[FilteredRelation] Error fetching status options:", err);
      }
    };

    fetchStatusOptions();
  }, [targetModel, statusField]);

  const handleStatusChange = async (itemId, newStatus, e) => {
    // Prevent navigation when clicking dropdown
    e?.stopPropagation();

    if (!statusField || !targetModel || !displayField) {
      return;
    }

    const item = items.find((i) => i.originalId === itemId);
    if (!item) {
      console.error("[FilteredRelation] Item not found:", itemId);
      return;
    }

    setUpdatingStatus((prev) => ({ ...prev, [itemId]: true }));

    try {
      // Step 1: Get current Meeting Participation Status record with ALL fields
      const currentRecordUrl = `/content-manager/collection-types/${targetModel}/${itemId}?populate=*`;
      const currentRecord = await get(currentRecordUrl);
      const currentData = currentRecord?.data?.data || {};
      const currentInvestors = currentData?.[displayField] || [];

      // Step 2: Find the investor to disconnect (need full object)
      const investorToRemove = Array.isArray(currentInvestors)
        ? currentInvestors.find((inv) => {
            const invDocId = inv?.documentId || inv?.id;
            return invDocId === item.relatedDocumentId;
          })
        : null;

      if (!investorToRemove) {
        console.error(
          "[FilteredRelation] Investor not found in current record",
        );
        alert("Investor not found in current record");
        return;
      }

      // Build full payload like UI admin does
      const updatePayload = {
        documentId: currentData.documentId,
        [displayField]: {
          connect: [],
          disconnect: [
            {
              id: investorToRemove.id,
              documentId: investorToRemove.documentId,
            },
          ],
        },
        participantStatus: currentData.participantStatus,
      };

      // Use disconnect with full payload
      const removeResponse = await put(
        `/content-manager/collection-types/${targetModel}/${itemId}`,
        updatePayload,
      );

      // Step 3: Find Meeting Participation Status with new status (same meeting)
      const newFilterParams = {};
      if (filterField1) {
        newFilterParams[filterField1] = newStatus;
      }
      if (filterField2 && filterValue2) {
        const value2 =
          filterValue2 === "{{documentId}}" ? documentId : filterValue2;
        newFilterParams[filterField2] = value2;
      }

      const filterQuery = Object.entries(newFilterParams)
        .map(([key, value], index) => {
          if (key.includes(".")) {
            const [relationField, nestedField] = key.split(".");
            return `filters[$and][${index}][${relationField}][${nestedField}][$eq]=${encodeURIComponent(value)}`;
          }
          return `filters[$and][${index}][${key}][$eq]=${encodeURIComponent(value)}`;
        })
        .join("&");

      const searchUrl = `/content-manager/collection-types/${targetModel}?${filterQuery}&populate[${displayField}]=*`;
      const searchResponse = await get(searchUrl);
      const targetRecords =
        searchResponse?.data?.results ||
        searchResponse?.results ||
        searchResponse?.data ||
        [];

      let targetRecordId;
      let targetInvestors = [];

      if (targetRecords.length === 0) {
        console.error(
          "[FilteredRelation] No target record found with new status for this meeting.",
        );
        const collectionDisplayName = targetModelInput || "record";
        alert(
          `No ${collectionDisplayName} found with status "${newStatus}" for this meeting. Please create one first.`,
        );
        return;
      }

      // Get full target record data
      const targetRecord = targetRecords[0];
      targetRecordId = targetRecord.documentId || targetRecord.id;

      // Get target record with all fields
      const targetRecordUrl = `/content-manager/collection-types/${targetModel}/${targetRecordId}?populate=*`;
      const targetRecordFull = await get(targetRecordUrl);
      const targetData = targetRecordFull?.data?.data || {};

      // Step 4: Add investor to target record
      // Build full payload like UI admin does
      const addPayload = {
        documentId: targetData.documentId,
        [displayField]: {
          connect: [
            {
              id: investorToRemove.id,
              documentId: investorToRemove.documentId,
            },
          ],
          disconnect: [],
        },
        participantStatus: targetData.participantStatus,
      };

      // Use connect with full payload
      const addResponse = await put(
        `/content-manager/collection-types/${targetModel}/${targetRecordId}`,
        addPayload,
      );

      // Dispatch custom event to trigger refresh of all filtered relation fields
      window.dispatchEvent(
        new CustomEvent("filtered-relation-updated", {
          detail: { documentId, targetModel },
        }),
      );

      // Refresh current field
      await fetchFilteredData();
    } catch (err) {
      console.error("[FilteredRelation] Error moving investor:", err);
      alert("Failed to change status. Check console for details.");
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const fetchFilteredData = async () => {
    if (!targetModel || Object.keys(filterParams).length === 0) {
      return;
    }

    setLoading(true);
    try {
      const modelParts = targetModel.split("::");
      if (modelParts.length !== 2) {
        return;
      }

      // Build filter query string
      const filterQuery = Object.entries(filterParams)
        .map(([key, value], index) => {
          if (key.includes(".")) {
            const [relationField, nestedField] = key.split(".");
            return `filters[$and][${index}][${relationField}][${nestedField}][$eq]=${encodeURIComponent(value)}`;
          }
          return `filters[$and][${index}][${key}][$eq]=${encodeURIComponent(value)}`;
        })
        .join("&");

      const populateFields = [displayField];
      if (statusField) {
        populateFields.push(statusField);
      }

      const apiUrl = `/content-manager/collection-types/${targetModel}?${filterQuery}&populate[${displayField}][populate]=*`;
      const response = await get(apiUrl);
      const items =
        response?.data?.results || response?.results || response?.data || [];

      if (items.length > 0) {
        const formattedItems = [];

        items.forEach((item) => {
          if (displayField && item[displayField]) {
            if (Array.isArray(item[displayField])) {
              item[displayField].forEach((rel) => {
                const displayValue =
                  rel.fullName ||
                  rel.name ||
                  rel.displayName ||
                  rel.firstName ||
                  `ID: ${rel.documentId || rel.id}`;

                formattedItems.push({
                  id: `${item.documentId || item.id}-${rel.documentId || rel.id}`,
                  label: displayValue,
                  originalId: item.documentId || item.id,
                  relatedDocumentId: rel.documentId || rel.id,
                  relationModel: relationModel,
                  currentStatus: item[statusField],
                });
              });
            } else if (
              typeof item[displayField] === "object" &&
              item[displayField] !== null
            ) {
              if (item[displayField].count !== undefined) {
                formattedItems.push({
                  id: item.id,
                  label: `${item[displayField].count} items`,
                  currentStatus: item[statusField],
                });
              } else {
                const displayValue =
                  item[displayField].fullName ||
                  item[displayField].name ||
                  item[displayField].displayName ||
                  item[displayField].firstName ||
                  `ID: ${item[displayField].id}`;

                formattedItems.push({
                  id: item.id,
                  label: displayValue,
                  originalId: item.documentId || item.id,
                  relatedDocumentId:
                    item[displayField].documentId || item[displayField].id,
                  relationModel: relationModel,
                  currentStatus: item[statusField],
                });
              }
            }
          } else {
            formattedItems.push({
              id: item.id,
              label: `ID: ${item.id}`,
              originalId: item.documentId || item.id,
              relatedDocumentId: item.documentId || item.id,
              relationModel: targetModel,
              currentStatus: item[statusField],
            });
          }
        });

        setItems(formattedItems);

        // Auto-save to database
        const documentIds = formattedItems.map(
          (item) => item.relatedDocumentId || item.id,
        );
        const newValue = JSON.stringify(documentIds);

        if (documentId && value !== newValue) {
          await saveFieldValue(newValue);
        }
      } else {
        setItems([]);
        if (documentId && value) {
          await saveFieldValue(null);
        }
      }
    } catch (err) {
      console.error("Error fetching filtered relations:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFilteredData();
  }, [
    targetModel,
    filterField1,
    filterValue1,
    filterField2,
    filterValue2,
    displayField,
    documentId,
    value,
  ]);

  // Listen for updates from other filtered relation fields
  React.useEffect(() => {
    const handleUpdate = (event) => {
      // Refresh if same document
      if (event.detail?.documentId === documentId) {
        fetchFilteredData();
      }
    };

    window.addEventListener("filtered-relation-updated", handleUpdate);
    return () => {
      window.removeEventListener("filtered-relation-updated", handleUpdate);
    };
  }, [documentId]);

  const fieldLabel = props.label || name;
  const itemCount = items.length;

  return (
    <Field.Root name={name} error={error}>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Field.Label>
          {fieldLabel} {itemCount > 0 && `(${itemCount})`}
        </Field.Label>
        {loading ? (
          <Typography variant="omega" textColor="neutral600">
            {formatMessage({
              id: "filtered-relation.loading",
              defaultMessage: "Loading...",
            })}
          </Typography>
        ) : items.length > 0 ? (
          <Flex direction="column" alignItems="stretch" gap={1}>
            {items.map((item) => {
              const editUrl = `/content-manager/collection-types/${item.relationModel}/${item.relatedDocumentId}`;
              const isUpdating = updatingStatus[item.originalId];

              return (
                <Box
                  key={item.id}
                  background="neutral0"
                  borderColor="neutral200"
                  borderStyle="solid"
                  borderWidth="1px"
                  hasRadius
                  paddingTop={2}
                  paddingBottom={2}
                  paddingLeft={4}
                  paddingRight={4}
                  style={{
                    cursor: "pointer",
                    minHeight: "50px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onClick={() => navigate(editUrl)}
                >
                  <Typography variant="omega" textColor="primary600">
                    {item.label}
                  </Typography>

                  {statusField && statusOptions.length > 0 && (
                    <Box
                      onClick={(e) => e.stopPropagation()}
                      style={{ minWidth: "150px" }}
                    >
                      <SingleSelect
                        size="S"
                        value={item.currentStatus}
                        onChange={(value) =>
                          handleStatusChange(item.originalId, value, null)
                        }
                        disabled={isUpdating}
                      >
                        {statusOptions.map((status) => (
                          <SingleSelectOption key={status} value={status}>
                            {status}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Flex>
        ) : (
          <Typography variant="omega" textColor="neutral600">
            {formatMessage({
              id: "filtered-relation.no-results",
              defaultMessage: "No matching records found",
            })}
          </Typography>
        )}
        <Field.Hint>
          <Typography variant="pi" textColor="neutral600">
            {Object.keys(filterParams).length > 0
              ? `Filters: ${Object.entries(filterParams)
                  .map(([k, v]) => {
                    const displayValue =
                      v === documentId ? "{{current documentId}}" : v;
                    return `${k} = ${displayValue}`;
                  })
                  .join(", ")}`
              : "No filters configured"}
          </Typography>
        </Field.Hint>
      </Flex>
      <Field.Error />
    </Field.Root>
  );
};

export default FilteredRelationInput;
