import {
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent
} from "react";

import { createRecords } from "../api/sheetApi";
import SearchableLookupField, {
    type LookupOption
} from "../components/SearchableLookupField";
import type {
    SheetRecord,
    SheetRecordValue
} from "../config/sheetModules";
import { getTodayInputValue } from "../utils/date";

type BulkOrderMode =
    | "salesOrders"
    | "returns";

type BulkOrderLine = {
    id: string;
    ma_sp: string;
    don_vi: string;
    so_luong: string;
    don_gia: string;
    ghi_chu: string;
};

type BulkOrderModalProps = {
    mode: BulkOrderMode;
    sheetName: string;
    customerOptions: LookupOption[];
    productOptions: LookupOption[];
    productRecords: SheetRecord[];
    onClose: () => void;
    onCreated: () => Promise<void>;
};

const toText = (value: SheetRecordValue) => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
};

const createEmptyLine = (): BulkOrderLine => {
    return {
        id: crypto.randomUUID(),
        ma_sp: "",
        don_vi: "",
        so_luong: "",
        don_gia: "",
        ghi_chu: ""
    };
};

const priceInputFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
});

const formatMoneyText = (value: number) => {
    return `${priceInputFormatter.format(value)} đ`;
};

const parseFormattedNumber = (value: string) => {
    const normalizedValue = value
        .replace(/,/g, "")
        .trim();

    if (normalizedValue === "") {
        return Number.NaN;
    }

    return Number(normalizedValue);
};

const formatPriceInputValue = (value: string) => {
    const digits = value.replace(/\D/g, "");

    if (digits === "") {
        return "";
    }

    return priceInputFormatter.format(Number(digits));
};

const getLineAmount = (line: BulkOrderLine) => {
    const quantity = Number(line.so_luong);
    const price = parseFormattedNumber(line.don_gia);

    if (Number.isNaN(quantity) || Number.isNaN(price)) {
        return 0;
    }

    return quantity * price;
};

const getNumberValidationMessage = (
    label: string,
    value: string,
    parser: (nextValue: string) => number = Number
) => {
    const numericValue = parser(value);

    if (value.trim() === "" || Number.isNaN(numericValue) || numericValue <= 0) {
        return `${label} phải là số lớn hơn 0`;
    }

    return "";
};

export default function BulkOrderModal(props: BulkOrderModalProps) {
    const {
        mode,
        sheetName,
        customerOptions,
        productOptions,
        productRecords,
        onClose,
        onCreated
    } = props;
    const [customerCode, setCustomerCode] = useState<string>("");
    const [orderDate, setOrderDate] = useState<string>(getTodayInputValue);
    const [lines, setLines] = useState<BulkOrderLine[]>(() => {
        return [
            createEmptyLine()
        ];
    });
    const [message, setMessage] = useState<string>("");
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const totalAmount = useMemo(() => {
        return lines.reduce(
            (total, line) => {
                return total + getLineAmount(line);
            },
            0
        );
    }, [lines]);

    const text = useMemo(() => {
        if (mode === "returns") {
            return {
                title: "Tạo trả hàng nhiều dòng",
                dateLabel: "Ngày trả",
                addLabel: "Thêm dòng trả hàng",
                saveLabel: "Lưu danh sách trả hàng",
                savingLabel: "Đang lưu trả hàng...",
                help: "Chọn khách hàng và ngày một lần, sau đó thêm nhiều dòng sản phẩm trả."
            };
        }

        return {
            title: "Tạo đơn bán nhiều dòng",
            dateLabel: "Ngày bán",
            addLabel: "Thêm dòng bán",
            saveLabel: "Lưu danh sách đơn bán",
            savingLabel: "Đang lưu đơn bán...",
            help: "Chọn khách hàng và ngày một lần, sau đó thêm nhiều dòng sản phẩm bán."
        };
    }, [mode]);

    const getProductByCode = (productCode: string) => {
        return productRecords.find((record) => {
            return toText(record.ma_sp) === productCode;
        });
    };

    const updateLine = (
        lineId: string,
        patch: Partial<BulkOrderLine>
    ) => {
        setLines((currentLines) => {
            return currentLines.map((line) => {
                if (line.id !== lineId) {
                    return line;
                }

                return {
                    ...line,
                    ...patch
                };
            });
        });
    };

    const handleLineProductChange = (
        line: BulkOrderLine,
        productCode: string
    ) => {
        const selectedProduct = getProductByCode(productCode);
        const nextUnit = toText(selectedProduct?.don_vi);
        const nextPrice = formatPriceInputValue(toText(selectedProduct?.don_gia));

        updateLine(
            line.id,
            {
                ma_sp: productCode,
                don_vi: nextUnit || line.don_vi,
                don_gia: line.don_gia || nextPrice
            }
        );
    };

    const handleLineInputChange = (
        lineId: string,
        fieldName: keyof Pick<BulkOrderLine, "don_vi" | "so_luong" | "don_gia" | "ghi_chu">,
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const nextValue =
            fieldName === "don_gia"
                ? formatPriceInputValue(event.target.value)
                : event.target.value;

        updateLine(
            lineId,
            {
                [fieldName]: nextValue
            }
        );
    };

    const addLine = () => {
        setLines((currentLines) => {
            return [
                ...currentLines,
                createEmptyLine()
            ];
        });
    };

    const removeLine = (lineId: string) => {
        setLines((currentLines) => {
            if (currentLines.length === 1) {
                return currentLines;
            }

            return currentLines.filter((line) => {
                return line.id !== lineId;
            });
        });
    };

    const validateForm = () => {
        if (customerCode.trim() === "") {
            return "Vui lòng chọn khách hàng";
        }

        if (orderDate.trim() === "") {
            return `Vui lòng chọn ${text.dateLabel.toLowerCase()}`;
        }

        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            const lineNumber = index + 1;

            if (line.ma_sp.trim() === "") {
                return `Dòng ${lineNumber}: vui lòng chọn sản phẩm`;
            }

            if (line.don_vi.trim() === "") {
                return `Dòng ${lineNumber}: vui lòng nhập đơn vị`;
            }

            const quantityMessage = getNumberValidationMessage(
                `Dòng ${lineNumber}: số lượng`,
                line.so_luong
            );

            if (quantityMessage !== "") {
                return quantityMessage;
            }

            const priceMessage = getNumberValidationMessage(
                `Dòng ${lineNumber}: đơn giá`,
                line.don_gia,
                parseFormattedNumber
            );

            if (priceMessage !== "") {
                return priceMessage;
            }
        }

        return "";
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const validationMessage = validateForm();

        if (validationMessage !== "") {
            setMessage(validationMessage);
            return;
        }

        const records = lines.map((line) => {
            return {
                ngay_tao: orderDate,
                ma_kh: customerCode,
                ma_sp: line.ma_sp,
                don_vi: line.don_vi.trim(),
                so_luong: Number(line.so_luong),
                don_gia: parseFormattedNumber(line.don_gia),
                ghi_chu: line.ghi_chu.trim()
            };
        });

        try {
            setIsSaving(true);
            setMessage("");

            await createRecords<SheetRecord>(
                sheetName,
                records
            );
            await onCreated();
            onClose();
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Không lưu được danh sách";

            setMessage(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="confirm-backdrop bulk-order-backdrop" role="presentation">
            <section
                className="bulk-order-dialog"
                role="dialog"
                aria-modal="true"
            >
                <div className="bulk-order-header">
                    <div>
                        <h2>{text.title}</h2>
                        <p>{text.help}</p>
                    </div>

                    <button
                        className="plain-button"
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Đóng
                    </button>
                </div>

                <form className="bulk-order-form" onSubmit={handleSubmit}>
                    <div className="bulk-order-master-row">
                        <SearchableLookupField
                            label="Khách hàng"
                            name="bulk_ma_kh"
                            value={customerCode}
                            options={customerOptions}
                            placeholder="Tìm theo tên hoặc mã khách hàng"
                            onChange={setCustomerCode}
                        />

                        <label>
                            {text.dateLabel}
                            <input
                                type="date"
                                value={orderDate}
                                onChange={(event) => {
                                    setOrderDate(event.target.value);
                                }}
                            />
                        </label>
                    </div>

                    <div className="bulk-lines-shell">
                        <div className="bulk-lines-header">
                            <span>Sản phẩm</span>
                            <span>Đơn vị</span>
                            <span>Số lượng</span>
                            <span>Đơn giá</span>
                            <span>Thành tiền</span>
                            <span>Ghi chú</span>
                            <span />
                        </div>

                        {lines.map((line, index) => (
                            <div className="bulk-line-row" key={line.id}>
                                <SearchableLookupField
                                    label={`Dòng ${index + 1}`}
                                    name={`bulk_ma_sp_${line.id}`}
                                    value={line.ma_sp}
                                    options={productOptions}
                                    placeholder="Tìm theo tên hoặc mã sản phẩm"
                                    onChange={(productCode) => {
                                        handleLineProductChange(
                                            line,
                                            productCode
                                        );
                                    }}
                                />

                                <label>
                                    Đơn vị
                                    <input
                                        value={line.don_vi}
                                        onChange={(event) => {
                                            handleLineInputChange(
                                                line.id,
                                                "don_vi",
                                                event
                                            );
                                        }}
                                    />
                                </label>

                                <label>
                                    Số lượng
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={line.so_luong}
                                        onChange={(event) => {
                                            handleLineInputChange(
                                                line.id,
                                                "so_luong",
                                                event
                                            );
                                        }}
                                    />
                                </label>

                                <label>
                                    Đơn giá
                                    <input
                                        inputMode="numeric"
                                        value={line.don_gia}
                                        onChange={(event) => {
                                            handleLineInputChange(
                                                line.id,
                                                "don_gia",
                                                event
                                            );
                                        }}
                                    />
                                </label>

                                <div className="bulk-line-amount">
                                    <span>Thành tiền</span>
                                    <strong>{formatMoneyText(getLineAmount(line))}</strong>
                                </div>

                                <label>
                                    Ghi chú
                                    <input
                                        value={line.ghi_chu}
                                        onChange={(event) => {
                                            handleLineInputChange(
                                                line.id,
                                                "ghi_chu",
                                                event
                                            );
                                        }}
                                        placeholder="Ghi chú"
                                    />
                                </label>

                                <button
                                    className="table-action-button danger"
                                    type="button"
                                    onClick={() => removeLine(line.id)}
                                    disabled={lines.length === 1 || isSaving}
                                >
                                    Xoá
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bulk-order-footer">
                        <button
                            className="plain-button"
                            type="button"
                            onClick={addLine}
                            disabled={isSaving}
                        >
                            + {text.addLabel}
                        </button>

                        {message !== "" ? (
                            <p className="form-message" role="alert">
                                {message}
                            </p>
                        ) : null}

                        <div className="bulk-total-summary">
                            <span>Tổng tiền</span>
                            <strong>{formatMoneyText(totalAmount)}</strong>
                        </div>

                        <div className="form-actions">
                            <button
                                className="plain-button"
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                            >
                                Huỷ
                            </button>

                            <button
                                className="command-button"
                                type="submit"
                                disabled={isSaving}
                            >
                                {isSaving ? text.savingLabel : text.saveLabel}
                            </button>
                        </div>
                    </div>
                </form>
            </section>
        </div>
    );
}
