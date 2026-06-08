import type { AppModuleId } from "./appNavigation";

export type SheetModuleId = Exclude<AppModuleId, "dashboard">;

export type SheetRecordValue =
    | string
    | number
    | boolean
    | null
    | undefined;

export type SheetRecord = {
    id?: string;
} & Record<string, SheetRecordValue>;

export type SheetLookupSource =
    | "customers"
    | "products";

export type SheetFieldType =
    | "text"
    | "number"
    | "date"
    | "textarea"
    | "lookup";

export type SheetColumnFormat =
    | "text"
    | "number"
    | "currency"
    | "date";

export type SheetFormField = {
    key: string;
    label: string;
    type: SheetFieldType;
    required?: boolean;
    min?: number;
    placeholder?: string;
    wide?: boolean;
    defaultToday?: boolean;
    lookup?: SheetLookupSource;
};

export type SheetTableColumn = {
    key: string;
    label: string;
    format?: SheetColumnFormat;
    primary?: boolean;
};

export type SheetModuleConfig = {
    id: SheetModuleId;
    sheetName: string;
    title: string;
    description: string;
    entityLabel: string;
    createButtonLabel: string;
    searchPlaceholder: string;
    searchFields: string[];
    summaryLabel: string;
    emptyMessage: string;
    formFields: SheetFormField[];
    tableColumns: SheetTableColumn[];
    createHelpText: string;
    editHelpText: (record: SheetRecord) => string;
    getRecordTitle: (record: SheetRecord) => string;
    supportsChotCongNo?: boolean;
    supportsDebtReconciliation?: boolean;
};

const valueText = (
    record: SheetRecord,
    key: string
) => {
    const value = record[key];

    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
};

export const sheetModuleConfigs: Record<SheetModuleId, SheetModuleConfig> = {
    products: {
        id: "products",
        sheetName: "San_pham",
        title: "Sản phẩm",
        description: "Quản lý danh sách sản phẩm, đơn vị và đơn giá đề xuất.",
        entityLabel: "sản phẩm",
        createButtonLabel: "Tạo sản phẩm",
        searchPlaceholder: "Tìm mã, tên, đơn vị...",
        searchFields: ["ma_sp", "ten_sp", "don_vi", "mo_ta"],
        summaryLabel: "sản phẩm hoạt động",
        emptyMessage: "Chưa có sản phẩm phù hợp với điều kiện tìm kiếm.",
        createHelpText: "ID, mã sản phẩm và statecode sẽ được API tự sinh.",
        editHelpText: (record) => {
            return `Đang sửa ${valueText(record, "ma_sp")}`;
        },
        getRecordTitle: (record) => {
            return `${valueText(record, "ma_sp")} ${valueText(record, "ten_sp")}`.trim();
        },
        formFields: [
            {
                key: "ten_sp",
                label: "Tên sản phẩm",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Xi măng"
            },
            {
                key: "don_vi",
                label: "Đơn vị",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Bao, Tấm, Cây"
            },
            {
                key: "don_gia",
                label: "Đơn giá đề xuất",
                type: "number",
                required: true,
                min: 0,
                placeholder: "Ví dụ: 100000"
            },
            {
                key: "mo_ta",
                label: "Mô tả",
                type: "textarea",
                placeholder: "Ghi chú ngắn về sản phẩm",
                wide: true
            }
        ],
        tableColumns: [
            { key: "ma_sp", label: "Mã sản phẩm" },
            { key: "ten_sp", label: "Tên sản phẩm", primary: true },
            { key: "don_vi", label: "Đơn vị" },
            { key: "don_gia", label: "Đơn giá đề xuất", format: "currency" },
            { key: "mo_ta", label: "Mô tả" }
        ]
    },
    customers: {
        id: "customers",
        sheetName: "Khach_hang",
        title: "Khách hàng",
        description: "Quản lý hồ sơ khách hàng và số dư công nợ.",
        entityLabel: "khách hàng",
        createButtonLabel: "Tạo khách hàng",
        searchPlaceholder: "Tìm mã, tên, điện thoại...",
        searchFields: ["ma_kh", "ten_kh", "dien_thoai", "dia_chi"],
        summaryLabel: "khách hàng hoạt động",
        emptyMessage: "Chưa có khách hàng phù hợp với điều kiện tìm kiếm.",
        createHelpText: "ID, mã khách hàng và các cột công thức sẽ được API xử lý.",
        supportsDebtReconciliation: true,
        editHelpText: (record) => {
            return `Đang sửa ${valueText(record, "ma_kh")}`;
        },
        getRecordTitle: (record) => {
            return `${valueText(record, "ma_kh")} ${valueText(record, "ten_kh")}`.trim();
        },
        formFields: [
            {
                key: "ten_kh",
                label: "Tên khách hàng",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Công ty A"
            },
            {
                key: "dien_thoai",
                label: "Điện thoại",
                type: "text",
                placeholder: "Ví dụ: 090..."
            },
            {
                key: "cong_no_dau_ky",
                label: "Công nợ đầu kỳ",
                type: "number",
                min: 0,
                placeholder: "Ví dụ: 0"
            },
            {
                key: "dia_chi",
                label: "Địa chỉ",
                type: "textarea",
                placeholder: "Địa chỉ giao hàng hoặc ghi chú",
                wide: true
            }
        ],
        tableColumns: [
            { key: "ma_kh", label: "Mã KH" },
            { key: "ten_kh", label: "Tên khách hàng", primary: true },
            { key: "dien_thoai", label: "Điện thoại" },
            { key: "dia_chi", label: "Địa chỉ" },
            { key: "cong_no_dau_ky", label: "Nợ đầu kỳ", format: "currency" },
            { key: "phat_sinh_trong_ky", label: "Phát sinh", format: "currency" },
            { key: "cong_no_cuoi_ky", label: "Nợ cuối kỳ", format: "currency" }
        ]
    },
    salesOrders: {
        id: "salesOrders",
        sheetName: "Don_ban",
        title: "Đơn bán",
        description: "Ghi nhận hàng bán theo khách hàng, sản phẩm và đơn giá thực tế.",
        entityLabel: "đơn bán",
        createButtonLabel: "Tạo đơn bán",
        searchPlaceholder: "Tìm mã KH, mã SP, tên...",
        searchFields: ["ma_kh", "ten_kh", "ma_sp", "ten_sp", "don_vi", "ghi_chu"],
        summaryLabel: "đơn bán hoạt động",
        emptyMessage: "Chưa có đơn bán phù hợp với điều kiện tìm kiếm.",
        createHelpText: "Tên khách hàng, tên sản phẩm và thành tiền sẽ kế thừa công thức từ sheet.",
        editHelpText: (record) => {
            return `Đang sửa đơn ${valueText(record, "ma_kh")} - ${valueText(record, "ma_sp")}`;
        },
        getRecordTitle: (record) => {
            return `${valueText(record, "ma_kh")} ${valueText(record, "ma_sp")} ${valueText(record, "ngay_tao")}`.trim();
        },
        formFields: [
            {
                key: "ngay_tao",
                label: "Ngày bán",
                type: "date",
                required: true,
                defaultToday: true
            },
            {
                key: "ma_kh",
                label: "Khách hàng",
                type: "lookup",
                lookup: "customers",
                required: true,
                placeholder: "Tìm theo tên hoặc mã khách hàng"
            },
            {
                key: "ma_sp",
                label: "Sản phẩm",
                type: "lookup",
                lookup: "products",
                required: true,
                placeholder: "Tìm theo tên hoặc mã sản phẩm"
            },
            {
                key: "don_vi",
                label: "Đơn vị",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Bao"
            },
            {
                key: "so_luong",
                label: "Số lượng",
                type: "number",
                required: true,
                min: 0,
                placeholder: "Ví dụ: 10"
            },
            {
                key: "don_gia",
                label: "Đơn giá bán",
                type: "number",
                required: true,
                min: 0,
                placeholder: "Có thể khác đơn giá đề xuất"
            },
            {
                key: "ghi_chu",
                label: "Ghi chú",
                type: "textarea",
                placeholder: "Ghi chú thêm cho dòng đơn bán",
                wide: true
            }
        ],
        tableColumns: [
            { key: "ngay_tao", label: "Ngày bán", format: "date" },
            { key: "ma_kh", label: "Mã KH" },
            { key: "ten_kh", label: "Khách hàng", primary: true },
            { key: "ma_sp", label: "Mã SP" },
            { key: "ten_sp", label: "Sản phẩm" },
            { key: "don_vi", label: "Đơn vị" },
            { key: "so_luong", label: "SL", format: "number" },
            { key: "don_gia", label: "Đơn giá", format: "currency" },
            { key: "thanh_tien", label: "Thành tiền", format: "currency" },
            { key: "ghi_chu", label: "Ghi chú" }
        ]
    },
    returns: {
        id: "returns",
        sheetName: "Tra_hang",
        title: "Trả hàng",
        description: "Ghi nhận hàng trả để giảm phát sinh công nợ theo ngày.",
        entityLabel: "phiếu trả hàng",
        createButtonLabel: "Tạo trả hàng",
        searchPlaceholder: "Tìm mã KH, mã SP, tên...",
        searchFields: ["ma_kh", "ten_kh", "ma_sp", "ten_sp", "don_vi", "ghi_chu"],
        summaryLabel: "phiếu trả hàng hoạt động",
        emptyMessage: "Chưa có phiếu trả hàng phù hợp với điều kiện tìm kiếm.",
        createHelpText: "Tên khách hàng, tên sản phẩm và thành tiền sẽ kế thừa công thức từ sheet.",
        editHelpText: (record) => {
            return `Đang sửa trả hàng ${valueText(record, "ma_kh")} - ${valueText(record, "ma_sp")}`;
        },
        getRecordTitle: (record) => {
            return `${valueText(record, "ma_kh")} ${valueText(record, "ma_sp")} ${valueText(record, "ngay_tao")}`.trim();
        },
        formFields: [
            {
                key: "ngay_tao",
                label: "Ngày trả",
                type: "date",
                required: true,
                defaultToday: true
            },
            {
                key: "ma_kh",
                label: "Khách hàng",
                type: "lookup",
                lookup: "customers",
                required: true,
                placeholder: "Tìm theo tên hoặc mã khách hàng"
            },
            {
                key: "ma_sp",
                label: "Sản phẩm",
                type: "lookup",
                lookup: "products",
                required: true,
                placeholder: "Tìm theo tên hoặc mã sản phẩm"
            },
            {
                key: "don_vi",
                label: "Đơn vị",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Bao"
            },
            {
                key: "so_luong",
                label: "Số lượng trả",
                type: "number",
                required: true,
                min: 0,
                placeholder: "Ví dụ: 1"
            },
            {
                key: "don_gia",
                label: "Đơn giá",
                type: "number",
                required: true,
                min: 0,
                placeholder: "Ví dụ: 100000"
            },
            {
                key: "ghi_chu",
                label: "Ghi chú",
                type: "textarea",
                placeholder: "Ghi chú thêm cho dòng trả hàng",
                wide: true
            }
        ],
        tableColumns: [
            { key: "ngay_tao", label: "Ngày trả", format: "date" },
            { key: "ma_kh", label: "Mã KH" },
            { key: "ten_kh", label: "Khách hàng", primary: true },
            { key: "ma_sp", label: "Mã SP" },
            { key: "ten_sp", label: "Sản phẩm" },
            { key: "don_vi", label: "Đơn vị" },
            { key: "so_luong", label: "SL trả", format: "number" },
            { key: "don_gia", label: "Đơn giá", format: "currency" },
            { key: "thanh_tien", label: "Thành tiền", format: "currency" },
            { key: "ghi_chu", label: "Ghi chú" }
        ]
    },
    payments: {
        id: "payments",
        sheetName: "Thanh_toan",
        title: "Thanh toán",
        description: "Ghi nhận tiền khách hàng đã thanh toán.",
        entityLabel: "thanh toán",
        createButtonLabel: "Tạo thanh toán",
        searchPlaceholder: "Tìm mã KH, tên khách hàng...",
        searchFields: ["ma_kh", "ten_kh", "ngay_thanh_toan", "ghi_chu"],
        summaryLabel: "thanh toán hoạt động",
        emptyMessage: "Chưa có thanh toán phù hợp với điều kiện tìm kiếm.",
        createHelpText: "Tên khách hàng sẽ được lấy bằng công thức từ sheet.",
        editHelpText: (record) => {
            return `Đang sửa thanh toán ${valueText(record, "ma_kh")}`;
        },
        getRecordTitle: (record) => {
            return `${valueText(record, "ma_kh")} ${valueText(record, "ngay_thanh_toan")}`.trim();
        },
        formFields: [
            {
                key: "ngay_thanh_toan",
                label: "Ngày thanh toán",
                type: "date",
                required: true,
                defaultToday: true
            },
            {
                key: "ma_kh",
                label: "Khách hàng",
                type: "lookup",
                lookup: "customers",
                required: true,
                placeholder: "Tìm theo tên hoặc mã khách hàng"
            },
            {
                key: "so_tien",
                label: "Số tiền",
                type: "number",
                required: true,
                min: 0,
                placeholder: "Ví dụ: 500000"
            },
            {
                key: "ghi_chu",
                label: "Ghi chú",
                type: "textarea",
                placeholder: "Ghi chú thêm cho khoản thanh toán",
                wide: true
            }
        ],
        tableColumns: [
            { key: "ngay_thanh_toan", label: "Ngày TT", format: "date" },
            { key: "ma_kh", label: "Mã KH" },
            { key: "ten_kh", label: "Khách hàng", primary: true },
            { key: "so_tien", label: "Số tiền", format: "currency" },
            { key: "ghi_chu", label: "Ghi chú" }
        ]
    },
    dailyChanges: {
        id: "dailyChanges",
        sheetName: "Phat_sinh_trong_ngay",
        title: "Phát sinh trong ngày",
        description: "Theo dõi phát sinh tăng/giảm theo từng ngày và khách hàng.",
        entityLabel: "phát sinh trong ngày",
        createButtonLabel: "Tạo phát sinh",
        searchPlaceholder: "Tìm ngày, mã KH, tên khách hàng...",
        searchFields: ["ngay_phat_sinh", "ma_kh", "ten_kh"],
        summaryLabel: "dòng phát sinh",
        emptyMessage: "Chưa có phát sinh phù hợp với điều kiện tìm kiếm.",
        createHelpText: "Các cột tên khách hàng, phát sinh tăng và phát sinh giảm sẽ kế thừa công thức.",
        editHelpText: (record) => {
            return `Đang sửa ${valueText(record, "ngay_phat_sinh")} - ${valueText(record, "ma_kh")}`;
        },
        getRecordTitle: (record) => {
            return `${valueText(record, "ngay_phat_sinh")} ${valueText(record, "ma_kh")}`.trim();
        },
        supportsChotCongNo: true,
        formFields: [
            {
                key: "ngay_phat_sinh",
                label: "Ngày phát sinh",
                type: "date",
                required: true,
                defaultToday: true
            },
            {
                key: "ma_kh",
                label: "Mã khách hàng",
                type: "text",
                required: true,
                placeholder: "Ví dụ: KH0001"
            }
        ],
        tableColumns: [
            { key: "ngay_phat_sinh", label: "Ngày", format: "date" },
            { key: "ma_kh", label: "Mã KH" },
            { key: "ten_kh", label: "Khách hàng", primary: true },
            { key: "phat_sinh_tang", label: "Phát sinh tăng", format: "currency" },
            { key: "phat_sinh_giam", label: "Phát sinh giảm", format: "currency" }
        ]
    }
};
