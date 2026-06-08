import {
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent
} from "react";

import { getRecords } from "../api/sheetApi";
import type {
    SheetRecord,
    SheetRecordValue
} from "../config/sheetModules";
import {
    formatDateKeyForDisplay,
    getTodayInputValue,
    normalizeDateKey
} from "../utils/date";

type ReceivableReconciliationModalProps = {
    customer: SheetRecord;
    onClose: () => void;
};

type TimelineEntry = {
    dateKey: string;
    dateLabel: string;
    type: string;
    description: string;
    increase: number;
    decrease: number;
};

type StatementEntry = TimelineEntry & {
    balance: number;
};

type Statement = {
    customerCode: string;
    customerName: string;
    startDate: string;
    endDate: string;
    openingDebt: number;
    totalIncrease: number;
    totalDecrease: number;
    endingDebt: number;
    entries: StatementEntry[];
};

const COMPANY_NAME =
    "CÔNG TY TNHH THƯƠNG MẠI XÂY DỰNG TỔNG HỢP TIẾN PHÁT";

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

const parseNumber = (value: SheetRecordValue) => {
    if (typeof value === "number") {
        return value;
    }

    const text = toText(value).trim();

    if (text === "") {
        return 0;
    }

    const directNumber = Number(text);

    if (!Number.isNaN(directNumber)) {
        return directNumber;
    }

    const numericText = text
        .replace(/[^\d,.-]/g, "")
        .replace(/\.(?=\d{3}(\D|$))/g, "")
        .replace(/,(?=\d{3}(\D|$))/g, "")
        .replace(",", ".");
    const parsedNumber = Number(numericText);

    return Number.isNaN(parsedNumber) ? 0 : parsedNumber;
};

const formatDate = formatDateKeyForDisplay;

const formatCurrency = (value: number) => {
    return currencyFormatter.format(value);
};

const isInDateRange = (
    dateKey: string,
    startDate: string,
    endDate: string
) => {
    return dateKey !== "" && dateKey >= startDate && dateKey <= endDate;
};

const sortEntriesByTimeline = (
    firstEntry: TimelineEntry,
    secondEntry: TimelineEntry
) => {
    if (firstEntry.dateKey !== secondEntry.dateKey) {
        return firstEntry.dateKey.localeCompare(secondEntry.dateKey);
    }

    return firstEntry.type.localeCompare(secondEntry.type);
};

const buildSaleEntry = (record: SheetRecord): TimelineEntry => {
    const amount = parseNumber(record.thanh_tien);
    const productName = toText(record.ten_sp) || toText(record.ma_sp);
    const quantity = toText(record.so_luong);
    const unit = toText(record.don_vi);
    const dateKey = normalizeDateKey(record.ngay_tao);

    return {
        dateKey,
        dateLabel: formatDate(dateKey),
        type: "Đơn bán",
        description: `Bán ${productName} - SL ${quantity} ${unit}`.trim(),
        increase: amount,
        decrease: 0
    };
};

const buildReturnEntry = (record: SheetRecord): TimelineEntry => {
    const amount = parseNumber(record.thanh_tien);
    const productName = toText(record.ten_sp) || toText(record.ma_sp);
    const quantity = toText(record.so_luong);
    const unit = toText(record.don_vi);
    const dateKey = normalizeDateKey(record.ngay_tao);

    return {
        dateKey,
        dateLabel: formatDate(dateKey),
        type: "Trả hàng",
        description: `Trả ${productName} - SL ${quantity} ${unit}`.trim(),
        increase: 0,
        decrease: amount
    };
};

const buildPaymentEntry = (record: SheetRecord): TimelineEntry => {
    const amount = parseNumber(record.so_tien);
    const dateKey = normalizeDateKey(record.ngay_thanh_toan);

    return {
        dateKey,
        dateLabel: formatDate(dateKey),
        type: "Thanh toán",
        description: "Khách hàng thanh toán",
        increase: 0,
        decrease: amount
    };
};

export default function ReceivableReconciliationModal(
    props: ReceivableReconciliationModalProps
) {
    const { customer, onClose } = props;
    const [openingDebtText, setOpeningDebtText] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>(getTodayInputValue);
    const [message, setMessage] = useState<string>("");
    const [statement, setStatement] = useState<Statement | null>(null);
    const [isCalculating, setIsCalculating] = useState<boolean>(false);

    const customerCode = toText(customer.ma_kh);
    const customerName = toText(customer.ten_kh);

    const currentDebtPlaceholder = useMemo(() => {
        const currentDebt = parseNumber(customer.cong_no_dau_ky);

        return currentDebt > 0
            ? numberFormatter.format(currentDebt)
            : "Ví dụ: 100000000";
    }, [customer.cong_no_dau_ky]);

    const handleOpeningDebtChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        setOpeningDebtText(event.target.value);
    };

    const handleStartDateChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        setStartDate(event.target.value);
    };

    const handleEndDateChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        setEndDate(event.target.value);
    };

    const validateInput = () => {
        if (openingDebtText.trim() === "") {
            return "Vui lòng nhập Nợ đầu kỳ";
        }

        if (startDate.trim() === "") {
            return "Vui lòng chọn Ngày bắt đầu";
        }

        if (endDate.trim() === "") {
            return "Vui lòng chọn Ngày kết thúc";
        }

        if (startDate > endDate) {
            return "Ngày bắt đầu không được lớn hơn Ngày kết thúc";
        }

        const openingDebt = Number(openingDebtText);

        if (Number.isNaN(openingDebt)) {
            return "Nợ đầu kỳ phải là số";
        }

        return "";
    };

    const handleBuildStatement = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const validationMessage = validateInput();

        if (validationMessage !== "") {
            setMessage(validationMessage);
            setStatement(null);
            return;
        }

        try {
            setIsCalculating(true);
            setMessage("");

            const [
                saleRecords,
                returnRecords,
                paymentRecords
            ] = await Promise.all([
                getRecords<SheetRecord>("Don_ban", 0),
                getRecords<SheetRecord>("Tra_hang", 0),
                getRecords<SheetRecord>("Thanh_toan", 0)
            ]);

            const saleEntries = saleRecords
                .filter((record) => {
                    return toText(record.ma_kh) === customerCode;
                })
                .map(buildSaleEntry);
            const returnEntries = returnRecords
                .filter((record) => {
                    return toText(record.ma_kh) === customerCode;
                })
                .map(buildReturnEntry);
            const paymentEntries = paymentRecords
                .filter((record) => {
                    return toText(record.ma_kh) === customerCode;
                })
                .map(buildPaymentEntry);

            const timelineEntries = [
                ...saleEntries,
                ...returnEntries,
                ...paymentEntries
            ]
                .filter((entry) => {
                    return isInDateRange(
                        entry.dateKey,
                        startDate,
                        endDate
                    );
                })
                .sort(sortEntriesByTimeline);

            let runningBalance = Number(openingDebtText);
            const statementEntries = timelineEntries.map((entry) => {
                runningBalance =
                    runningBalance
                    + entry.increase
                    - entry.decrease;

                return {
                    ...entry,
                    balance: runningBalance
                };
            });

            const totalIncrease = timelineEntries.reduce(
                (total, entry) => {
                    return total + entry.increase;
                },
                0
            );
            const totalDecrease = timelineEntries.reduce(
                (total, entry) => {
                    return total + entry.decrease;
                },
                0
            );

            setStatement({
                customerCode,
                customerName,
                startDate,
                endDate,
                openingDebt: Number(openingDebtText),
                totalIncrease,
                totalDecrease,
                endingDebt: runningBalance,
                entries: statementEntries
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Không tạo được bảng đối chiếu công nợ";

            setMessage(errorMessage);
            setStatement(null);
        } finally {
            setIsCalculating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="confirm-backdrop reconciliation-backdrop" role="presentation">
            <section
                className="reconciliation-dialog"
                role="dialog"
                aria-modal="true"
            >
                <div className="reconciliation-header no-print">
                    <div>
                        <h2>Đối chiếu công nợ</h2>
                        <p>
                            {customerCode}
                            {" - "}
                            {customerName}
                        </p>
                    </div>

                    <button
                        className="plain-button"
                        type="button"
                        onClick={onClose}
                    >
                        Đóng
                    </button>
                </div>

                <form
                    className="reconciliation-form no-print"
                    onSubmit={handleBuildStatement}
                >
                    <label>
                        Nợ đầu kỳ
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={openingDebtText}
                            onChange={handleOpeningDebtChange}
                            placeholder={currentDebtPlaceholder}
                        />
                    </label>

                    <label>
                        Ngày bắt đầu
                        <input
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                        />
                    </label>

                    <label>
                        Ngày kết thúc
                        <input
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                        />
                    </label>

                    <button
                        className="command-button"
                        type="submit"
                        disabled={isCalculating}
                    >
                        {isCalculating ? "Đang tính..." : "Lập bảng"}
                    </button>
                </form>

                {message !== "" ? (
                    <p className="form-message no-print" role="alert">
                        {message}
                    </p>
                ) : null}

                {statement !== null ? (
                    <section className="print-statement">
                        <div className="statement-title">
                            <strong className="statement-company-name">
                                {COMPANY_NAME}
                            </strong>
                            <h2>BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ</h2>
                            <p>
                                Từ ngày {formatDate(statement.startDate)}
                                {" đến ngày "}
                                {formatDate(statement.endDate)}
                            </p>
                        </div>

                        <div className="statement-meta">
                            <div>
                                <span>Khách hàng</span>
                                <strong>{statement.customerName}</strong>
                            </div>
                            <div>
                                <span>Mã khách hàng</span>
                                <strong>{statement.customerCode}</strong>
                            </div>
                            <div>
                                <span>Nợ đầu kỳ</span>
                                <strong>{formatCurrency(statement.openingDebt)}</strong>
                            </div>
                            <div>
                                <span>Nợ cuối kỳ</span>
                                <strong>{formatCurrency(statement.endingDebt)}</strong>
                            </div>
                        </div>

                        <div className="statement-table-shell">
                            <table className="statement-table">
                                <colgroup>
                                    <col className="statement-col-date" />
                                    <col className="statement-col-type" />
                                    <col className="statement-col-description" />
                                    <col className="statement-col-money" />
                                    <col className="statement-col-money" />
                                    <col className="statement-col-balance" />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>Ngày</th>
                                        <th>Nội dung</th>
                                        <th>Diễn giải</th>
                                        <th>Phát sinh tăng</th>
                                        <th>Phát sinh giảm</th>
                                        <th>Số dư</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{formatDate(statement.startDate)}</td>
                                        <td>Số dư đầu kỳ</td>
                                        <td>Nợ đầu kỳ nhập tay</td>
                                        <td />
                                        <td />
                                        <td>{formatCurrency(statement.openingDebt)}</td>
                                    </tr>

                                    {statement.entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={6}>Không có phát sinh trong kỳ.</td>
                                        </tr>
                                    ) : null}

                                    {statement.entries.map((entry, index) => (
                                        <tr key={`${entry.dateKey}-${entry.type}-${index}`}>
                                            <td>{entry.dateLabel}</td>
                                            <td>{entry.type}</td>
                                            <td>{entry.description}</td>
                                            <td>
                                                {entry.increase > 0
                                                    ? formatCurrency(entry.increase)
                                                    : ""}
                                            </td>
                                            <td>
                                                {entry.decrease > 0
                                                    ? formatCurrency(entry.decrease)
                                                    : ""}
                                            </td>
                                            <td>{formatCurrency(entry.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3}>Tổng phát sinh trong kỳ</td>
                                        <td>{formatCurrency(statement.totalIncrease)}</td>
                                        <td>{formatCurrency(statement.totalDecrease)}</td>
                                        <td>{formatCurrency(statement.endingDebt)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="statement-signatures">
                            <div>
                                <strong>Bên bán</strong>
                                <span>Ký, ghi rõ họ tên</span>
                            </div>
                            <div>
                                <strong>Khách hàng</strong>
                                <span>Ký, ghi rõ họ tên</span>
                            </div>
                        </div>

                        <div className="statement-actions no-print">
                            <button
                                className="command-button"
                                type="button"
                                onClick={handlePrint}
                            >
                                In bảng đối chiếu
                            </button>
                        </div>
                    </section>
                ) : null}
            </section>
        </div>
    );
}
