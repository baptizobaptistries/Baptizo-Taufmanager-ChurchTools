// node_modules/@churchtools/extension-points/dist/main.js
var MainModuleMetadata = {
  /** Extension point ID */
  id: "main",
  /** Event names from ChurchTools to extension (keys from MainModuleEvents) */
  eventNames: []
  // No events defined for main module
};

// node_modules/@churchtools/extension-points/dist/admin.js
var AdminMetadata = {
  /** Extension point ID */
  id: "admin",
  /** Event names from ChurchTools to extension (keys from AdminEvents) */
  eventNames: []
  // No events defined for admin
};

// node_modules/@churchtools/extension-points/dist/appointment-dialog-tab.js
var AppointmentDialogTabMetadata = {
  /** Extension point ID */
  id: "appointment-dialog-tab",
  /** Event names from ChurchTools to extension (keys from AppointmentDialogTabEvents) */
  eventNames: ["appointment:changed", "dialog:closing"]
};

// node_modules/@churchtools/extension-points/dist/appointment-dialog-detail.js
var AppointmentDialogDetailMetadata = {
  /** Extension point ID */
  id: "appointment-dialog-detail",
  /** Event names from ChurchTools to extension (keys from AppointmentDialogDetailEvents) */
  eventNames: ["appointment:changed", "dialog:closing"]
};

// node_modules/@churchtools/extension-points/dist/finance-tab.js
var FinanceTabMetadata = {
  /** Extension point ID */
  id: "finance-tab",
  /** Event names from ChurchTools to extension (keys from FinanceTabEvents) */
  eventNames: ["accountingPeriod:changed", "tab:hidden"]
};

// node_modules/@churchtools/extension-points/dist/index.js
var allExtensionPointMetadata = [
  MainModuleMetadata,
  AdminMetadata,
  AppointmentDialogTabMetadata,
  AppointmentDialogDetailMetadata,
  FinanceTabMetadata
];
var extensionPointMetadataById = Object.fromEntries(allExtensionPointMetadata.map((metadata) => [metadata.id, metadata]));
export {
  AdminMetadata,
  AppointmentDialogDetailMetadata,
  AppointmentDialogTabMetadata,
  FinanceTabMetadata,
  MainModuleMetadata,
  allExtensionPointMetadata,
  extensionPointMetadataById
};
//# sourceMappingURL=@churchtools_extension-points.js.map
