import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent
} from "react";

import SearchableLookupField, {
    type LookupOption
} from "../components/SearchableLookupField";
import BulkOrderModal from "./BulkOrderModal";
import {
    createRecord,
    deleteRecord,
    getRecords,
    runSheetAction,
    updateRecord
} from "../api/sheetApi";
import type {
    SheetColumnFormat,
    SheetFormField,
    SheetLookupSource,
    SheetModuleConfig,
    SheetRecord,
    SheetRecordValue
} from "../config/sheetModules";
import ReceivableReconciliationModal from "./ReceivableReconciliationModal";
import {
    formatDateForDisplay,
    getTodayInputValue,
    normalizeDateKey
} from "../utils/date";

type LoadStatus =
    | "loading"
    | "success"
    | "error";

type FormMode =
    | "create"
    | "edit";

type MutationStatus =
    | "idle"
    | "saving"
    | "deleting"
    | "runningAction";

type FormDataState = Record<string, string>;

type LookupRecordsBySource = Partial<Record<SheetLookupSource, SheetRecord[]>>;

type ChotCongNoResult = {
    created?: unknown[];
    updated?: unknown[];
    skipped?: unknown[];
};

type SheetModulePageProps = {
    config: SheetModuleConfig;
};

const lookupSheetNames: Record<SheetLookupSource, string> = {
    customers: "Khach_hang",
    products: "San_pham"
};

const currencyFormatter = new Intl.NumberFormat(
    "vi-VN",
    {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }
);

const numberFormatter = new Intl.NumberFormat("vi-VN");

const toText = (value: SheetRecordValue) => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
};

const toDateInputValue = (value: SheetRecordValue) => {
    return normalizeDateKey(value);
};

const buildEmptyFormData = (fields: SheetFormField[]) => {
    const formData: FormDataState = {};

    fields.forEach((field) => {
        formData[field.key] = field.defaultToday ? getTodayInputValue() : "";
    });

    return formData;
};

const recordToFormData = (
    record: SheetRecord,
    fields: SheetFormField[]
) => {
    const formData: FormDataState = {};

    fields.forEach((field) => {
        const value = record[field.key];

        formData[field.key] =
            field.type === "date"
                ? toDateInputValue(value)
                : toText(value);
    });

    return formData;
};

const formatNumberLikeValue = (
    value: SheetRecordValue,
    format: SheetColumnFormat
) => {
    const text = toText(value);
    const numericValue = Number(text);

    if (text === "" || Number.isNaN(numericValue)) {
        return text;
    }

    if (format === "currency") {
        return currencyFormatter.format(numericValue);
    }

    return numberFormatter.format(numericValue);
};

const formatCellValue = (
    value: SheetRecordValue,
    format: SheetColumnFormat = "text"
) => {
    if (format === "date") {
        return formatDateForDisplay(value);
    }

    if (format === "currency" || format === "number") {
        return formatNumberLikeValue(
            value,
            format
        );
    }

    return toText(value);
};

const validateFormData = (
    fields: SheetFormField[],
    formData: FormDataState
) => {
    for (const field of fields) {
        const value = formData[field.key]?.trim() ?? "";

        if (field.required === true && value === "") {
            return `Vui lòng nhập ${field.label.toLowerCase()}`;
        }

        if (field.type === "number" && value !== "") {
            const numericValue = Number(value);

            if (Number.isNaN(numericValue)) {
                return `${field.label} phải là số`;
            }

            if (field.min !== undefined && numericValue < field.min) {
                return `${field.label} phải lớn hơn hoặc bằng ${field.min}`;
            }
        }
    }

    return "";
};

const buildPayload = (
    fields: SheetFormField[],
    formData: FormDataState
) => {
    const payload: Partial<SheetRecord> = {};

    fields.forEach((field) => {
        const value = formData[field.key]?.trim() ?? "";

        payload[field.key] =
            field.type === "number" && value !== ""
                ? Number(value)
                : value;
    });

    return payload;
};

const matchesSearchText = (
    record: SheetRecord,
    config: SheetModuleConfig,
    searchText: string
) => {
    const normalizedSearchText = searchText.trim().toLowerCase();

    if (normalizedSearchText === "") {
        return true;
    }

    const searchableText = config.searchFields
        .map((fieldKey) => toText(record[fieldKey]))
        .join(" ")
        .toLowerCase();

    return searchableText.includes(normalizedSearchText);
};

const getLookupSources = (fields: SheetFormField[]) => {
    const lookupSources = new Set<SheetLookupSource>();

    fields.forEach((field) => {
        if (field.type === "lookup" && field.lookup !== undefined) {
            lookupSources.add(field.lookup);
        }
    });

    return Array.from(lookupSources);
};

const buildCustomerOption = (record: SheetRecord): LookupOption => {
    const value = toText(record.ma_kh);
    const label = toText(record.ten_kh) || value;
    const phone = toText(record.dien_thoai);
    const detail = phone === "" ? value : `${value} - ${phone}`;

    return {
        value,
        label,
        detail,
        searchText: `${value} ${label} ${phone}`
    };
};

const buildProductOption = (record: SheetRecord): LookupOption => {
    const value = toText(record.ma_sp);
    const label = toText(record.ten_sp) || value;
    const unit = toText(record.don_vi);
    const price = toText(record.don_gia);
    const numericPrice = Number(price);
    const formattedPrice =
        price !== "" && !Number.isNaN(numericPrice)
            ? currencyFormatter.format(numericPrice)
            : "";
    const detailParts = [
        value,
        unit,
        formattedPrice
    ].filter((part) => {
        return part !== "";
    });

    return {
        value,
        label,
        detail: detailParts.join(" - "),
        searchText: `${value} ${label} ${unit}`
    };
};

const buildLookupOptions = (
    source: SheetLookupSource,
    records: SheetRecord[] | undefined
) => {
    if (records === undefined) {
        return [];
    }

    return records
        .map((record) => {
            return source === "customers"
                ? buildCustomerOption(record)
                : buildProductOption(record);
        })
        .filter((option) => {
            return option.value !== "";
        });
};

export default function SheetModulePage(props: SheetModulePageProps) {
    const { config } = props;
    const [records, setRecords] = useState<SheetRecord[]>([]);
    const [searchText, setSearchText] = useState<string>("");
    const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [formMode, setFormMode] = useState<FormMode | null>(null);
    const [editingRecord, setEditingRecord] = useState<SheetRecord | null>(null);
    const [formData, setFormData] = useState<FormDataState>(() => {
        return buildEmptyFormData(config.formFields);
    });
    const [mutationStatus, setMutationStatus] =
        useState<MutationStatus>("idle");
    const [formMessage, setFormMessage] = useState<string>("");
    const [lookupErrorMessage, setLookupErrorMessage] = useState<string>("");
    const [actionMessage, setActionMessage] = useState<string>("");
    const [deleteTarget, setDeleteTarget] = useState<SheetRecord | null>(null);
    const [isBulkOrderOpen, setIsBulkOrderOpen] = useState<boolean>(false);
    const [reconciliationCustomer, setReconciliationCustomer] =
        useState<SheetRecord | null>(null);
    const [lookupRecords, setLookupRecords] =
        useState<LookupRecordsBySource>({});

    const lookupSources = useMemo(() => {
        return getLookupSources(config.formFields);
    }, [config.formFields]);

    const lookupOptionsBySource = useMemo(() => {
        return {
            customers: buildLookupOptions(
                "customers",
                lookupRecords.customers
            ),
            products: buildLookupOptions(
                "products",
                lookupRecords.products
            )
        };
    }, [lookupRecords]);

    const loadRecords = useCallback(async () => {
        try {
            setLoadStatus("loading");
            setErrorMessage("");

            const nextRecords = await getRecords<SheetRecord>(
                config.sheetName,
                0
            );

            setRecords(nextRecords);
            setLoadStatus("success");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : `Không tải được ${config.entityLabel}`;

            setErrorMessage(message);
            setLoadStatus("error");
        }
    }, [config.entityLabel, config.sheetName]);

    useEffect(() => {
        let shouldIgnoreResult = false;

        const loadInitialRecords = async () => {
            try {
                setLoadStatus("loading");
                setErrorMessage("");

                const nextRecords = await getRecords<SheetRecord>(
                    config.sheetName,
                    0
                );

                if (shouldIgnoreResult) {
                    return;
                }

                setRecords(nextRecords);
                setLoadStatus("success");
            } catch (error) {
                if (shouldIgnoreResult) {
                    return;
                }

                const message =
                    error instanceof Error
                        ? error.message
                        : `Không tải được ${config.entityLabel}`;

                setErrorMessage(message);
                setLoadStatus("error");
            }
        };

        void loadInitialRecords();

        return () => {
            shouldIgnoreResult = true;
        };
    }, [config.entityLabel, config.sheetName]);

    useEffect(() => {
        let shouldIgnoreResult = false;

        const loadLookupRecords = async () => {
            if (lookupSources.length === 0) {
                return;
            }

            try {
                const lookupEntries = await Promise.all(
                    lookupSources.map(async (source) => {
                        const sourceRecords = await getRecords<SheetRecord>(
                            lookupSheetNames[source],
                            0
                        );

                        return [
                            source,
                            sourceRecords
                        ] as const;
                    })
                );

                if (shouldIgnoreResult) {
                    return;
                }

                setLookupRecords(Object.fromEntries(lookupEntries));
                setLookupErrorMessage("");
            } catch (error) {
                if (shouldIgnoreResult) {
                    return;
                }

                const message =
                    error instanceof Error
                        ? error.message
                        : "Không tải được danh sách chọn";

                setLookupErrorMessage(message);
            }
        };

        void loadLookupRecords();

        return () => {
            shouldIgnoreResult = true;
        };
    }, [lookupSources]);

    const filteredRecords = useMemo(() => {
        return records.filter((record) => {
            return matchesSearchText(
                record,
                config,
                searchText
            );
        });
    }, [config, records, searchText]);

    const setFormFieldValue = useCallback((
        fieldName: string,
        fieldValue: string
    ) => {
        setFormData((currentFormData) => {
            const nextFormData = {
                ...currentFormData,
                [fieldName]: fieldValue
            };

            if (
                fieldName === "ma_sp"
                && (config.id === "salesOrders" || config.id === "returns")
            ) {
                const selectedProduct = lookupRecords.products?.find((record) => {
                    return toText(record.ma_sp) === fieldValue;
                });
                const selectedUnit = toText(selectedProduct?.don_vi);

                if (selectedUnit !== "") {
                    nextFormData.don_vi = selectedUnit;
                }
            }

            return nextFormData;
        });
    }, [config.id, lookupRecords.products]);

    const handleSearchTextChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        setSearchText(event.target.value);
    };

    const handleFormFieldChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormFieldValue(
            event.target.name,
            event.target.value
        );
    };

    const openCreateForm = () => {
        setFormMode("create");
        setEditingRecord(null);
        setFormData(buildEmptyFormData(config.formFields));
        setFormMessage("");
        setActionMessage("");
    };

    const openEditForm = (record: SheetRecord) => {
        setFormMode("edit");
        setEditingRecord(record);
        setFormData(recordToFormData(
            record,
            config.formFields
        ));
        setFormMessage("");
        setActionMessage("");
    };

    const closeForm = () => {
        setFormMode(null);
        setEditingRecord(null);
        setFormData(buildEmptyFormData(config.formFields));
        setFormMessage("");
    };

    const handleRecordFormSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const validationMessage = validateFormData(
            config.formFields,
            formData
        );

        if (validationMessage !== "") {
            setFormMessage(validationMessage);
            return;
        }

        const payload = buildPayload(
            config.formFields,
            formData
        );

        try {
            setMutationStatus("saving");
            setFormMessage("");
            setActionMessage("");

            if (formMode === "create") {
                await createRecord<SheetRecord>(
                    config.sheetName,
                    payload
                );
            }

            if (formMode === "edit") {
                if (editingRecord?.id === undefined || editingRecord.id === "") {
                    setFormMessage("Bản ghi này không có id nên không thể cập nhật");
                    return;
                }

                await updateRecord<SheetRecord>(
                    config.sheetName,
                    {
                        id: editingRecord.id,
                        ...payload
                    }
                );
            }

            await loadRecords();
            closeForm();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : `Không lưu được ${config.entityLabel}`;

            setFormMessage(message);
        } finally {
            setMutationStatus("idle");
        }
    };

    const openDeleteConfirm = (record: SheetRecord) => {
        setDeleteTarget(record);
        setFormMessage("");
        setActionMessage("");
    };

    const closeDeleteConfirm = () => {
        setDeleteTarget(null);
        setFormMessage("");
    };

    const confirmDeleteRecord = async () => {
        if (deleteTarget === null) {
            return;
        }

        if (deleteTarget.id === undefined || deleteTarget.id === "") {
            setFormMessage("Bản ghi này không có id nên không thể xoá");
            return;
        }

        try {
            setMutationStatus("deleting");

            await deleteRecord<SheetRecord>(
                config.sheetName,
                deleteTarget.id
            );

            await loadRecords();
            closeDeleteConfirm();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : `Không xoá được ${config.entityLabel}`;

            setFormMessage(message);
        } finally {
            setMutationStatus("idle");
        }
    };

    const openDebtReconciliation = (record: SheetRecord) => {
        setReconciliationCustomer(record);
    };

    const closeDebtReconciliation = () => {
        setReconciliationCustomer(null);
    };

    const handleChotCongNo = async () => {
        try {
            setMutationStatus("runningAction");
            setActionMessage("");

            const result = await runSheetAction<ChotCongNoResult>(
                "chotCongNo"
            );

            const createdCount = result.created?.length ?? 0;
            const updatedCount = result.updated?.length ?? 0;
            const skippedCount = result.skipped?.length ?? 0;

            setActionMessage(
                result.message
                    ?? `Đã chốt toàn bộ công nợ: tạo ${createdCount}, cập nhật ${updatedCount}, bỏ qua ${skippedCount}.`
            );

            await loadRecords();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Không chốt được công nợ";

            setActionMessage(message);
        } finally {
            setMutationStatus("idle");
        }
    };

    const renderFormField = (field: SheetFormField) => {
        if (field.type === "lookup" && field.lookup !== undefined) {
            return (
                <SearchableLookupField
                    label={field.label}
                    name={field.key}
                    value={formData[field.key] ?? ""}
                    options={lookupOptionsBySource[field.lookup]}
                    placeholder={field.placeholder}
                    isLoading={lookupRecords[field.lookup] === undefined}
                    onChange={(nextValue) => {
                        setFormFieldValue(
                            field.key,
                            nextValue
                        );
                    }}
                    key={field.key}
                />
            );
        }

        return (
            <label
                className={field.wide === true ? "form-field-wide" : undefined}
                key={field.key}
            >
                {field.label}
                {field.type === "textarea" ? (
                    <textarea
                        name={field.key}
                        value={formData[field.key] ?? ""}
                        onChange={handleFormFieldChange}
                        placeholder={field.placeholder}
                        rows={3}
                    />
                ) : (
                    <input
                        name={field.key}
                        type={field.type}
                        min={field.min}
                        step={field.type === "number" ? "any" : undefined}
                        value={formData[field.key] ?? ""}
                        onChange={handleFormFieldChange}
                        placeholder={field.placeholder}
                    />
                )}
            </label>
        );
    };

    const hasRecords = filteredRecords.length > 0;
    const supportsBulkOrder =
        config.id === "salesOrders" || config.id === "returns";
    const isLoading = loadStatus === "loading";
    const isError = loadStatus === "error";
    const isSaving = mutationStatus === "saving";
    const isDeleting = mutationStatus === "deleting";
    const isRunningAction = mutationStatus === "runningAction";
    const isFormOpen = formMode !== null;
    const canCreate = config.canCreate !== false;
    const canEdit = config.canEdit !== false;
    const canDelete = config.canDelete !== false;
    const hasRowActions =
        config.supportsDebtReconciliation === true
        || canEdit
        || canDelete;

    return (
        <section className="entity-page">
            <div className="entity-command-bar">
                <div>
                    <h1>{config.title}</h1>
                    <p>{config.description}</p>
                </div>

                <div className="entity-actions">
                    {canCreate ? (
                        <button
                            className="command-button"
                            type="button"
                            onClick={openCreateForm}
                        >
                            {config.createButtonLabel}
                        </button>
                    ) : null}

                    {supportsBulkOrder ? (
                        <button
                            className="plain-button"
                            type="button"
                            onClick={() => setIsBulkOrderOpen(true)}
                        >
                            Tạo nhiều dòng
                        </button>
                    ) : null}

                    <input
                        className="search-input"
                        type="search"
                        placeholder={config.searchPlaceholder}
                        value={searchText}
                        onChange={handleSearchTextChange}
                    />

                    <button
                        className="command-button"
                        type="button"
                        onClick={loadRecords}
                        disabled={isLoading}
                    >
                        {isLoading ? "Đang tải..." : "Tải lại"}
                    </button>
                </div>
            </div>

            {config.supportsChotCongNo === true ? (
                <div className="closing-bar">
                    <button
                        className="plain-button"
                        type="button"
                        onClick={handleChotCongNo}
                        disabled={isRunningAction}
                    >
                        {isRunningAction ? "Đang chốt..." : "Chốt công nợ"}
                    </button>

                    {actionMessage !== "" ? (
                        <p className="action-message" role="status">
                            {actionMessage}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {isFormOpen ? (
                <form
                    className="record-form-panel"
                    onSubmit={handleRecordFormSubmit}
                >
                    <div className="form-panel-header">
                        <div>
                            <h2>
                                {formMode === "create"
                                    ? config.createButtonLabel
                                    : `Sửa ${config.entityLabel}`}
                            </h2>
                            <p>
                                {formMode === "create"
                                    ? config.createHelpText
                                    : config.editHelpText(editingRecord ?? {})}
                            </p>
                        </div>

                        <button
                            className="plain-button"
                            type="button"
                            onClick={closeForm}
                            disabled={isSaving}
                        >
                            Đóng
                        </button>
                    </div>

                    {lookupErrorMessage !== "" ? (
                        <p className="form-message" role="alert">
                            {lookupErrorMessage}
                        </p>
                    ) : null}

                    <div className="form-grid">
                        {config.formFields.map(renderFormField)}
                    </div>

                    <div className="form-footer">
                        {formMessage !== "" ? (
                            <p className="form-message" role="alert">
                                {formMessage}
                            </p>
                        ) : null}

                        <div className="form-actions">
                            <button
                                className="plain-button"
                                type="button"
                                onClick={closeForm}
                                disabled={isSaving}
                            >
                                Huỷ
                            </button>

                            <button
                                className="command-button"
                                type="submit"
                                disabled={isSaving}
                            >
                                {isSaving ? "Đang lưu..." : "Lưu"}
                            </button>
                        </div>
                    </div>
                </form>
            ) : null}

            <div className="entity-summary-row">
                <div>
                    <span className="summary-number">{records.length}</span>
                    <span className="summary-label">{config.summaryLabel}</span>
                </div>
                <div>
                    <span className="summary-number">{filteredRecords.length}</span>
                    <span className="summary-label">đang hiển thị</span>
                </div>
            </div>

            {isError ? (
                <div className="state-panel" role="alert">
                    <strong>Không tải được dữ liệu</strong>
                    <span>{errorMessage}</span>
                </div>
            ) : null}

            {!isError && isLoading ? (
                <div className="state-panel">
                    Đang tải dữ liệu...
                </div>
            ) : null}

            {!isError && !isLoading && !hasRecords ? (
                <div className="state-panel">
                    {config.emptyMessage}
                </div>
            ) : null}

            {!isError && !isLoading && hasRecords ? (
                <div className="table-shell">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {config.tableColumns.map((column) => (
                                    <th key={column.key}>{column.label}</th>
                                ))}
                                {hasRowActions ? (
                                    <th>Thao tác</th>
                                ) : null}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((record, index) => (
                                <tr key={record.id ?? `${config.sheetName}-${index}`}>
                                    {config.tableColumns.map((column) => {
                                        const value = formatCellValue(
                                            record[column.key],
                                            column.format
                                        );

                                        return (
                                            <td key={column.key}>
                                                {column.primary === true ? (
                                                    <strong>{value}</strong>
                                                ) : (
                                                    value
                                                )}
                                            </td>
                                        );
                                    })}
                                    {hasRowActions ? (
                                        <td>
                                            <div className="row-actions">
                                                {config.supportsDebtReconciliation === true ? (
                                                    <button
                                                        className="table-action-button"
                                                        type="button"
                                                        onClick={() => openDebtReconciliation(record)}
                                                    >
                                                        Đối chiếu công nợ
                                                    </button>
                                                ) : null}

                                                {canEdit ? (
                                                    <button
                                                        className="table-action-button"
                                                        type="button"
                                                        onClick={() => openEditForm(record)}
                                                    >
                                                        Sửa
                                                    </button>
                                                ) : null}

                                                {canDelete ? (
                                                    <button
                                                        className="table-action-button danger"
                                                        type="button"
                                                        onClick={() => openDeleteConfirm(record)}
                                                    >
                                                        Xoá
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    ) : null}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}

            {deleteTarget !== null ? (
                <div className="confirm-backdrop" role="presentation">
                    <section className="confirm-dialog" role="dialog" aria-modal="true">
                        <h2>Xác nhận xoá</h2>
                        <p>
                            Bạn có chắc muốn xoá
                            {" "}
                            <strong>{config.getRecordTitle(deleteTarget)}</strong>
                            {" "}
                            không?
                        </p>

                        {formMessage !== "" ? (
                            <p className="form-message" role="alert">
                                {formMessage}
                            </p>
                        ) : null}

                        <div className="confirm-actions">
                            <button
                                className="plain-button"
                                type="button"
                                onClick={closeDeleteConfirm}
                                disabled={isDeleting}
                            >
                                Không xoá
                            </button>

                            <button
                                className="danger-button"
                                type="button"
                                onClick={confirmDeleteRecord}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Đang xoá..." : "Xoá"}
                            </button>
                        </div>
                    </section>
                </div>
            ) : null}

            {reconciliationCustomer !== null ? (
                <ReceivableReconciliationModal
                    customer={reconciliationCustomer}
                    onClose={closeDebtReconciliation}
                />
            ) : null}

            {supportsBulkOrder && isBulkOrderOpen ? (
                <BulkOrderModal
                    mode={config.id === "returns" ? "returns" : "salesOrders"}
                    sheetName={config.sheetName}
                    customerOptions={lookupOptionsBySource.customers}
                    productOptions={lookupOptionsBySource.products}
                    productRecords={lookupRecords.products ?? []}
                    onClose={() => setIsBulkOrderOpen(false)}
                    onCreated={loadRecords}
                />
            ) : null}
        </section>
    );
}
