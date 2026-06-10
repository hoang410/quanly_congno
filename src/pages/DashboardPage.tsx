import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type ChangeEvent
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

type LoadStatus =
    | "loading"
    | "success"
    | "error";

type DashboardData = {
    products: SheetRecord[];
    customers: SheetRecord[];
    salesOrders: SheetRecord[];
    returns: SheetRecord[];
    payments: SheetRecord[];
    dailyChanges: SheetRecord[];
};

type KpiCardProps = {
    label: string;
    value: string;
    detail: string;
    tone?: "default" | "good" | "warning";
};

type DashboardPanelProps = {
    title: string;
    description: string;
    children: React.ReactNode;
    wide?: boolean;
};

type CustomerTotal = {
    code: string;
    name: string;
    amount: number;
    count: number;
};

type ProductTotal = {
    code: string;
    name: string;
    count: number;
    amount: number;
};

type TrendRow = {
    dateKey: string;
    increase: number;
    decrease: number;
};

type VerticalBarChartItem = {
    key: string;
    label: string;
    detail: string;
    value: number;
    valueLabel: string;
    tone?: "primary" | "accent";
};

type VerticalBarChartProps = {
    items: VerticalBarChartItem[];
    emptyMessage: string;
};

const emptyDashboardData: DashboardData = {
    products: [],
    customers: [],
    salesOrders: [],
    returns: [],
    payments: [],
    dailyChanges: []
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

const formatCurrency = (value: number) => {
    return currencyFormatter.format(value);
};

const formatNumber = (value: number) => {
    return numberFormatter.format(value);
};

const formatDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getOneYearAgoInputValue = () => {
    const [
        year,
        month,
        day
    ] = getTodayInputValue().split("-").map(Number);
    const date = new Date(year, month - 1, day);

    date.setFullYear(date.getFullYear() - 1);

    return formatDateInputValue(date);
};

const isDateInRange = (
    dateValue: SheetRecordValue,
    startDate: string,
    endDate: string
) => {
    const dateKey = normalizeDateKey(dateValue);

    if (dateKey === "") {
        return false;
    }

    if (startDate !== "" && dateKey < startDate) {
        return false;
    }

    if (endDate !== "" && dateKey > endDate) {
        return false;
    }

    return true;
};

const getLineAmount = (record: SheetRecord) => {
    const amount = parseNumber(record.thanh_tien);

    if (amount !== 0) {
        return amount;
    }

    return parseNumber(record.so_luong) * parseNumber(record.don_gia);
};

const getCustomerDebt = (record: SheetRecord) => {
    const endingDebt = parseNumber(record.cong_no_cuoi_ky);

    if (endingDebt !== 0) {
        return endingDebt;
    }

    return parseNumber(record.cong_no_dau_ky)
        + parseNumber(record.phat_sinh_trong_ky);
};

const sumRecords = (
    records: SheetRecord[],
    getValue: (record: SheetRecord) => number
) => {
    return records.reduce(
        (total, record) => {
            return total + getValue(record);
        },
        0
    );
};

const sortByAmountDesc = <T extends { amount: number }>(
    firstItem: T,
    secondItem: T
) => {
    return secondItem.amount - firstItem.amount;
};

const getRecordCustomerName = (record: SheetRecord) => {
    return toText(record.ten_kh) || toText(record.ma_kh) || "Chưa có khách hàng";
};

const buildTopSalesCustomers = (records: SheetRecord[]) => {
    const totalsByCustomer = new Map<string, CustomerTotal>();

    records.forEach((record) => {
        const code = toText(record.ma_kh) || "unknown";
        const amount = getLineAmount(record);
        const currentTotal = totalsByCustomer.get(code);

        if (currentTotal === undefined) {
            totalsByCustomer.set(
                code,
                {
                    code,
                    name: getRecordCustomerName(record),
                    amount,
                    count: 1
                }
            );
            return;
        }

        currentTotal.amount += amount;
        currentTotal.count += 1;
    });

    return Array.from(totalsByCustomer.values())
        .sort(sortByAmountDesc)
        .slice(0, 5);
};

const buildTopProducts = (records: SheetRecord[]) => {
    const totalsByProduct = new Map<string, ProductTotal>();

    records.forEach((record) => {
        const code = toText(record.ma_sp) || "unknown";
        const amount = getLineAmount(record);
        const currentTotal = totalsByProduct.get(code);

        if (currentTotal === undefined) {
            totalsByProduct.set(
                code,
                {
                    code,
                    name: toText(record.ten_sp) || code,
                    count: 1,
                    amount
                }
            );
            return;
        }

        currentTotal.count += 1;
        currentTotal.amount += amount;
    });

    return Array.from(totalsByProduct.values())
        .sort((firstProduct, secondProduct) => {
            return secondProduct.count - firstProduct.count
                || secondProduct.amount - firstProduct.amount;
        })
        .slice(0, 5);
};

const buildTrendRows = (
    salesOrders: SheetRecord[],
    returns: SheetRecord[],
    payments: SheetRecord[]
) => {
    const totalsByDate = new Map<string, TrendRow>();

    const getOrCreateRow = (dateKey: string) => {
        const currentRow = totalsByDate.get(dateKey);

        if (currentRow !== undefined) {
            return currentRow;
        }

        const nextRow = {
            dateKey,
            increase: 0,
            decrease: 0
        };

        totalsByDate.set(dateKey, nextRow);

        return nextRow;
    };

    salesOrders.forEach((record) => {
        const dateKey = normalizeDateKey(record.ngay_tao);

        if (dateKey === "") {
            return;
        }

        getOrCreateRow(dateKey).increase += getLineAmount(record);
    });

    returns.forEach((record) => {
        const dateKey = normalizeDateKey(record.ngay_tao);

        if (dateKey === "") {
            return;
        }

        getOrCreateRow(dateKey).decrease += getLineAmount(record);
    });

    payments.forEach((record) => {
        const dateKey = normalizeDateKey(record.ngay_thanh_toan);

        if (dateKey === "") {
            return;
        }

        getOrCreateRow(dateKey).decrease += parseNumber(record.so_tien);
    });

    return Array.from(totalsByDate.values())
        .sort((firstRow, secondRow) => {
            return firstRow.dateKey.localeCompare(secondRow.dateKey);
        })
        .slice(-10);
};

const fetchDashboardData = async (): Promise<DashboardData> => {
    const [
        products,
        customers,
        salesOrders,
        returns,
        payments,
        dailyChanges
    ] = await Promise.all([
        getRecords<SheetRecord>("San_pham", 0),
        getRecords<SheetRecord>("Khach_hang", 0),
        getRecords<SheetRecord>("Don_ban", 0),
        getRecords<SheetRecord>("Tra_hang", 0),
        getRecords<SheetRecord>("Thanh_toan", 0),
        getRecords<SheetRecord>("Phat_sinh_trong_ngay", 0)
    ]);

    return {
        products,
        customers,
        salesOrders,
        returns,
        payments,
        dailyChanges
    };
};

function KpiCard(props: KpiCardProps) {
    const {
        label,
        value,
        detail,
        tone = "default"
    } = props;

    return (
        <article className={`dashboard-kpi-card ${tone}`}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{detail}</p>
        </article>
    );
}

function DashboardPanel(props: DashboardPanelProps) {
    const {
        title,
        description,
        children,
        wide = false
    } = props;

    return (
        <section className={wide ? "dashboard-panel wide" : "dashboard-panel"}>
            <div className="dashboard-panel-heading">
                <h2>{title}</h2>
                <p>{description}</p>
            </div>

            {children}
        </section>
    );
}

function VerticalBarChart(props: VerticalBarChartProps) {
    const {
        items,
        emptyMessage
    } = props;

    if (items.length === 0) {
        return (
            <p className="dashboard-empty">{emptyMessage}</p>
        );
    }

    const maxValue = items.reduce(
        (currentMaxValue, item) => {
            return Math.max(currentMaxValue, item.value);
        },
        1
    );
    const chartStyle = {
        "--bar-count": String(items.length)
    } as CSSProperties;

    return (
        <div className="dashboard-bar-chart" style={chartStyle}>
            {items.map((item) => {
                const height = Math.max((item.value / maxValue) * 100, 4);

                return (
                    <div className="dashboard-bar-item" key={item.key}>
                        <strong className="dashboard-bar-value">
                            {item.valueLabel}
                        </strong>

                        <div className="dashboard-bar-track">
                            <div
                                className={`dashboard-bar-fill ${item.tone ?? "primary"}`}
                                style={{ height: `${height}%` }}
                            />
                        </div>

                        <strong className="dashboard-bar-label">
                            {item.label}
                        </strong>

                        <span className="dashboard-bar-detail">
                            {item.detail}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default function DashboardPage() {
    const [dashboardData, setDashboardData] =
        useState<DashboardData>(emptyDashboardData);
    const [loadStatus, setLoadStatus] =
        useState<LoadStatus>("loading");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [startDate, setStartDate] =
        useState<string>(getOneYearAgoInputValue);
    const [endDate, setEndDate] = useState<string>(getTodayInputValue);

    const loadData = useCallback(async () => {
        try {
            setLoadStatus("loading");
            setErrorMessage("");

            const nextDashboardData = await fetchDashboardData();

            setDashboardData(nextDashboardData);
            setLoadStatus("success");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Không tải được dữ liệu dashboard";

            setErrorMessage(message);
            setLoadStatus("error");
        }
    }, []);

    useEffect(() => {
        let shouldIgnoreResult = false;

        const loadInitialData = async () => {
            try {
                setLoadStatus("loading");
                setErrorMessage("");

                const nextDashboardData = await fetchDashboardData();

                if (shouldIgnoreResult) {
                    return;
                }

                setDashboardData(nextDashboardData);
                setLoadStatus("success");
            } catch (error) {
                if (shouldIgnoreResult) {
                    return;
                }

                const message =
                    error instanceof Error
                        ? error.message
                        : "Không tải được dữ liệu dashboard";

                setErrorMessage(message);
                setLoadStatus("error");
            }
        };

        void loadInitialData();

        return () => {
            shouldIgnoreResult = true;
        };
    }, []);

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

    const dashboardSummary = useMemo(() => {
        const periodSalesOrders = dashboardData.salesOrders.filter((record) => {
            return isDateInRange(
                record.ngay_tao,
                startDate,
                endDate
            );
        });
        const periodReturns = dashboardData.returns.filter((record) => {
            return isDateInRange(
                record.ngay_tao,
                startDate,
                endDate
            );
        });
        const periodPayments = dashboardData.payments.filter((record) => {
            return isDateInRange(
                record.ngay_thanh_toan,
                startDate,
                endDate
            );
        });
        const periodDailyChanges = dashboardData.dailyChanges.filter((record) => {
            return isDateInRange(
                record.ngay_phat_sinh,
                startDate,
                endDate
            );
        });

        const totalReceivable = sumRecords(
            dashboardData.customers,
            getCustomerDebt
        );
        const totalSalesAmount = sumRecords(
            periodSalesOrders,
            getLineAmount
        );
        const totalReturnAmount = sumRecords(
            periodReturns,
            getLineAmount
        );
        const totalPaymentAmount = sumRecords(
            periodPayments,
            (record) => parseNumber(record.so_tien)
        );
        const totalDecreaseAmount = totalReturnAmount + totalPaymentAmount;
        const netMovement = totalSalesAmount - totalDecreaseAmount;
        const today = getTodayInputValue();
        const todayDailyChanges = dashboardData.dailyChanges.filter((record) => {
            return normalizeDateKey(record.ngay_phat_sinh) === today;
        });
        const todayIncrease = sumRecords(
            todayDailyChanges,
            (record) => parseNumber(record.phat_sinh_tang)
        );
        const todayDecrease = sumRecords(
            todayDailyChanges,
            (record) => parseNumber(record.phat_sinh_giam)
        );
        const topDebtCustomers = [...dashboardData.customers]
            .map((record) => {
                return {
                    code: toText(record.ma_kh),
                    name: toText(record.ten_kh) || toText(record.ma_kh),
                    amount: getCustomerDebt(record),
                    count: 0
                };
            })
            .filter((customer) => {
                return customer.amount > 0;
            })
            .sort(sortByAmountDesc)
            .slice(0, 5);
        const trendRows = buildTrendRows(
            periodSalesOrders,
            periodReturns,
            periodPayments
        );
        const recentDailyChanges = [...periodDailyChanges]
            .sort((firstRecord, secondRecord) => {
                return normalizeDateKey(secondRecord.ngay_phat_sinh)
                    .localeCompare(normalizeDateKey(firstRecord.ngay_phat_sinh));
            })
            .slice(0, 6);

        return {
            periodSalesOrders,
            periodReturns,
            periodPayments,
            periodDailyChanges,
            totalReceivable,
            totalSalesAmount,
            totalReturnAmount,
            totalPaymentAmount,
            totalDecreaseAmount,
            netMovement,
            todayIncrease,
            todayDecrease,
            topDebtCustomers,
            topSalesCustomers: buildTopSalesCustomers(periodSalesOrders),
            topProducts: buildTopProducts(periodSalesOrders),
            trendRows,
            recentDailyChanges
        };
    }, [dashboardData, endDate, startDate]);

    const productChartItems = useMemo<VerticalBarChartItem[]>(() => {
        return dashboardSummary.topProducts.map((product, index) => {
            return {
                key: product.code || String(index),
                label: product.name,
                detail: formatCurrency(product.amount),
                value: product.count,
                valueLabel: `${formatNumber(product.count)} đơn`,
                tone: "primary"
            };
        });
    }, [dashboardSummary.topProducts]);

    const customerChartItems = useMemo<VerticalBarChartItem[]>(() => {
        return dashboardSummary.topSalesCustomers.map((customer, index) => {
            return {
                key: customer.code || String(index),
                label: customer.name,
                detail: `${customer.code} - ${formatNumber(customer.count)} đơn`,
                value: customer.amount,
                valueLabel: formatCurrency(customer.amount),
                tone: "accent"
            };
        });
    }, [dashboardSummary.topSalesCustomers]);

    const maxTrendValue = useMemo(() => {
        return dashboardSummary.trendRows.reduce(
            (maxValue, trendRow) => {
                return Math.max(
                    maxValue,
                    trendRow.increase,
                    trendRow.decrease
                );
            },
            1
        );
    }, [dashboardSummary.trendRows]);

    const isLoading = loadStatus === "loading";
    const isError = loadStatus === "error";
    const selectedRangeLabel =
        startDate !== "" && endDate !== ""
            ? `${formatDateKeyForDisplay(startDate)} - ${formatDateKeyForDisplay(endDate)}`
            : "Toàn bộ dữ liệu";

    return (
        <section className="dashboard-page">
            <div className="dashboard-command-bar">
                <div className="dashboard-filters">
                    <label>
                        Từ ngày
                        <input
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                        />
                    </label>

                    <label>
                        Đến ngày
                        <input
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                        />
                    </label>

                    <button
                        className="command-button"
                        type="button"
                        onClick={loadData}
                        disabled={isLoading}
                    >
                        {isLoading ? "Đang tải..." : "Tải lại"}
                    </button>
                </div>
            </div>

            {isError ? (
                <div className="state-panel" role="alert">
                    <strong>Không tải được dashboard</strong>
                    <span>{errorMessage}</span>
                </div>
            ) : null}

            {!isError && isLoading ? (
                <div className="state-panel">
                    Đang tổng hợp dữ liệu dashboard...
                </div>
            ) : null}

            {!isError && !isLoading ? (
                <>
                    <div className="dashboard-period-note">
                        <strong>Kỳ đang xem:</strong>
                        <span>{selectedRangeLabel}</span>
                    </div>

                    <div className="dashboard-kpi-grid">
                        <KpiCard
                            label="Công nợ hiện tại"
                            value={formatCurrency(dashboardSummary.totalReceivable)}
                            detail={`${formatNumber(dashboardData.customers.length)} khách hàng đang hoạt động`}
                            tone={dashboardSummary.totalReceivable > 0 ? "warning" : "good"}
                        />
                        <KpiCard
                            label="Doanh số trong kỳ"
                            value={formatCurrency(dashboardSummary.totalSalesAmount)}
                            detail={`${formatNumber(dashboardSummary.periodSalesOrders.length)} dòng đơn bán`}
                            tone="good"
                        />
                        <KpiCard
                            label="Giảm công nợ"
                            value={formatCurrency(dashboardSummary.totalDecreaseAmount)}
                            detail={`${formatCurrency(dashboardSummary.totalReturnAmount)} trả hàng, ${formatCurrency(dashboardSummary.totalPaymentAmount)} thanh toán`}
                        />
                        <KpiCard
                            label="Biến động ròng"
                            value={formatCurrency(dashboardSummary.netMovement)}
                            detail="Đơn bán - trả hàng - thanh toán trong kỳ"
                            tone={dashboardSummary.netMovement > 0 ? "warning" : "good"}
                        />
                        <KpiCard
                            label="Phát sinh đã chốt hôm nay"
                            value={formatCurrency(dashboardSummary.todayIncrease - dashboardSummary.todayDecrease)}
                            detail={`${formatCurrency(dashboardSummary.todayIncrease)} tăng, ${formatCurrency(dashboardSummary.todayDecrease)} giảm`}
                        />
                        <KpiCard
                            label="Sản phẩm đang bán"
                            value={formatNumber(dashboardData.products.length)}
                            detail="Danh mục sản phẩm active từ sheet San_pham"
                        />
                    </div>

                    <div className="dashboard-grid">
                        <DashboardPanel
                            title="Biến động theo ngày"
                            description="Tổng phát sinh tăng/giảm theo chứng từ trong kỳ."
                            wide
                        >
                            {dashboardSummary.trendRows.length === 0 ? (
                                <p className="dashboard-empty">Chưa có phát sinh trong kỳ đã chọn.</p>
                            ) : (
                                <>
                                    <div className="trend-legend">
                                        <span className="increase">Phát sinh tăng</span>
                                        <span className="decrease">Phát sinh giảm</span>
                                    </div>

                                    <div className="trend-list">
                                        {dashboardSummary.trendRows.map((trendRow) => {
                                            const increaseWidth =
                                                (trendRow.increase / maxTrendValue) * 100;
                                            const decreaseWidth =
                                                (trendRow.decrease / maxTrendValue) * 100;

                                            return (
                                                <div className="trend-row" key={trendRow.dateKey}>
                                                    <span>{formatDateKeyForDisplay(trendRow.dateKey)}</span>
                                                    <div className="trend-bars">
                                                        <div className="trend-track">
                                                            <div
                                                                className="trend-bar increase"
                                                                style={{ width: `${increaseWidth}%` }}
                                                            />
                                                        </div>
                                                        <div className="trend-track">
                                                            <div
                                                                className="trend-bar decrease"
                                                                style={{ width: `${decreaseWidth}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <strong>{formatCurrency(trendRow.increase)}</strong>
                                                    <strong>{formatCurrency(trendRow.decrease)}</strong>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </DashboardPanel>

                        <DashboardPanel
                            title="Sản phẩm bán chạy"
                            description="Đếm số đơn bán theo từng sản phẩm trong kỳ."
                        >
                            <VerticalBarChart
                                items={productChartItems}
                                emptyMessage="Chưa có sản phẩm bán ra trong kỳ."
                            />
                        </DashboardPanel>

                        <DashboardPanel
                            title="Doanh thu theo khách hàng"
                            description="Tổng doanh số đơn bán theo từng khách hàng trong kỳ."
                        >
                            <VerticalBarChart
                                items={customerChartItems}
                                emptyMessage="Chưa có khách mua trong kỳ."
                            />
                        </DashboardPanel>

                        <DashboardPanel
                            title="Phát sinh đã chốt"
                            description="Các dòng Phat_sinh_trong_ngay gần nhất trong kỳ."
                        >
                            {dashboardSummary.recentDailyChanges.length === 0 ? (
                                <p className="dashboard-empty">Chưa có dòng chốt công nợ trong kỳ.</p>
                            ) : (
                                <div className="dashboard-mini-table">
                                    {dashboardSummary.recentDailyChanges.map((record, index) => (
                                        <div
                                            className="mini-table-row"
                                            key={record.id ?? `${toText(record.ma_kh)}-${index}`}
                                        >
                                            <div>
                                                <strong>{getRecordCustomerName(record)}</strong>
                                                <span>{formatDateKeyForDisplay(normalizeDateKey(record.ngay_phat_sinh))}</span>
                                            </div>
                                            <div>
                                                <span>Tăng {formatCurrency(parseNumber(record.phat_sinh_tang))}</span>
                                                <span>Giảm {formatCurrency(parseNumber(record.phat_sinh_giam))}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DashboardPanel>

                        <DashboardPanel
                            title="Khách nợ cao"
                            description="Sắp xếp theo công nợ cuối kỳ từ sheet Khach_hang."
                        >
                            {dashboardSummary.topDebtCustomers.length === 0 ? (
                                <p className="dashboard-empty">Chưa có khách hàng đang nợ.</p>
                            ) : (
                                <div className="rank-list">
                                    {dashboardSummary.topDebtCustomers.map((customer, index) => (
                                        <div className="rank-row" key={customer.code || index}>
                                            <span>{index + 1}</span>
                                            <div>
                                                <strong>{customer.name}</strong>
                                                <small>{customer.code}</small>
                                            </div>
                                            <strong>{formatCurrency(customer.amount)}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DashboardPanel>

                    </div>
                </>
            ) : null}
        </section>
    );
}
